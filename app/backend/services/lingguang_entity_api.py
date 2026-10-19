"""灵光实体接口：独立会话、服务器归属与父项目校验。"""
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from models.lingguang_projects import Lingguang_projects
from schemas.auth import UserResponse
from services.lingguang_auth import get_lingguang_user


def entity_router(name, model, data_schema):
    router = APIRouter(prefix=f"/api/v1/entities/{name}", tags=["灵光数据"])

    async def owned(db, user, row_id):
        row = await db.scalar(select(model).where(model.id == row_id, model.user_id == user.id))
        if row is None:
            raise HTTPException(404, "记录不存在或无权访问。")
        return row

    async def parent(db, user, data):
        if "project_id" in data:
            project = await db.scalar(select(Lingguang_projects.id).where(
                Lingguang_projects.id == data["project_id"], Lingguang_projects.user_id == user.id))
            if project is None:
                raise HTTPException(404, "项目不存在或无权访问。")

    def serialize(row):
        return {column.name: getattr(row, column.name) for column in model.__table__.columns}

    @router.get("")
    async def query_rows(query: str | None = None, sort: str | None = None,
                         skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=200),
                         user: UserResponse = Depends(get_lingguang_user), db: AsyncSession = Depends(get_db)):
        conditions = [model.user_id == user.id]
        if query:
            try:
                filters = json.loads(query)
                if not isinstance(filters, dict):
                    raise ValueError()
                for field, value in filters.items():
                    if field not in ("id", "project_id") or not hasattr(model, field) or not isinstance(value, int):
                        raise ValueError()
                    conditions.append(getattr(model, field) == value)
            except (ValueError, TypeError):
                raise HTTPException(422, "查询条件无效。") from None
        field = (sort or "-created_at").lstrip("-")
        if field not in ("id", "created_at", "updated_at"):
            raise HTTPException(422, "排序条件无效。")
        column = getattr(model, field)
        ordering = column.desc() if (sort or "-created_at").startswith("-") else column.asc()
        rows = list(await db.scalars(select(model).where(*conditions).order_by(ordering, model.id).offset(skip).limit(limit)))
        total = await db.scalar(select(func.count()).select_from(model).where(*conditions))
        return {"items": [serialize(row) for row in rows], "total": total, "skip": skip, "limit": limit}

    @router.get("/{row_id}")
    async def get_row(row_id: int, user: UserResponse = Depends(get_lingguang_user), db: AsyncSession = Depends(get_db)):
        return serialize(await owned(db, user, row_id))

    @router.post("", status_code=201)
    async def create_row(data: data_schema, user: UserResponse = Depends(get_lingguang_user), db: AsyncSession = Depends(get_db)):
        values = data.model_dump()
        await parent(db, user, values)
        row = model(**values, user_id=user.id)
        db.add(row)
        await db.commit()
        return serialize(row)

    @router.put("/{row_id}")
    async def update_row(row_id: int, data: data_schema, user: UserResponse = Depends(get_lingguang_user), db: AsyncSession = Depends(get_db)):
        row = await owned(db, user, row_id)
        values = data.model_dump()
        await parent(db, user, values)
        for field, value in values.items():
            setattr(row, field, value)
        await db.commit()
        return serialize(row)

    @router.delete("/{row_id}")
    async def delete_row(row_id: int, user: UserResponse = Depends(get_lingguang_user), db: AsyncSession = Depends(get_db)):
        row = await owned(db, user, row_id)
        await db.delete(row)
        await db.commit()
        return {"deleted": True}

    return router
