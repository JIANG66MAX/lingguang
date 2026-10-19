"""仅通过受控分享授权开放指定版本预览，不提供实体通用CRUD。"""
import hashlib
import secrets
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from models.lingguang_previews import Lingguang_previews
from models.lingguang_versions import Lingguang_versions
from schemas.auth import UserResponse
from services.lingguang_auth import get_lingguang_user

router = APIRouter(prefix="/api/v1/lingguang-preview", tags=["真机预览"])


class ShareRequest(BaseModel):
    version_id: int = Field(gt=0)


class PreviewRequest(BaseModel):
    token: str = Field(min_length=43, max_length=43, pattern=r"^[A-Za-z0-9_-]+$")


async def owned_version(db, user, version_id):
    row = await db.scalar(select(Lingguang_versions).where(
        Lingguang_versions.id == version_id, Lingguang_versions.user_id == user.id))
    if row is None:
        raise HTTPException(404, "版本不存在或无权分享。")
    return row


@router.post("/share")
async def share(data: ShareRequest, response: Response,
                user: UserResponse = Depends(get_lingguang_user), db: AsyncSession = Depends(get_db)):
    await owned_version(db, user, data.version_id)
    await db.execute(update(Lingguang_previews).where(
        Lingguang_previews.user_id == user.id, Lingguang_previews.version_id == data.version_id
    ).values(active=False))
    token = secrets.token_urlsafe(32)
    row = Lingguang_previews(user_id=user.id, version_id=data.version_id,
                            token_hash=hashlib.sha256(token.encode()).hexdigest(), active=True)
    db.add(row)
    await db.commit()
    response.headers["Cache-Control"] = "no-store"
    return {"token": token, "version_id": data.version_id}


@router.post("/revoke")
async def revoke(data: ShareRequest, user: UserResponse = Depends(get_lingguang_user),
                 db: AsyncSession = Depends(get_db)):
    await owned_version(db, user, data.version_id)
    await db.execute(update(Lingguang_previews).where(
        Lingguang_previews.user_id == user.id, Lingguang_previews.version_id == data.version_id
    ).values(active=False))
    await db.commit()
    return {"revoked": True}


@router.post("/view")
async def view(data: PreviewRequest, response: Response, db: AsyncSession = Depends(get_db)):
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    html = await db.scalar(select(Lingguang_versions.html).join(Lingguang_previews,
        (Lingguang_previews.version_id == Lingguang_versions.id) &
        (Lingguang_previews.user_id == Lingguang_versions.user_id)).where(
        Lingguang_previews.token_hash == token_hash, Lingguang_previews.active.is_(True)).limit(1))
    response.headers["Cache-Control"] = "no-store"
    if html is None:
        raise HTTPException(404, "预览链接已失效或已关闭，请向分享者获取新二维码。", headers={"Cache-Control": "no-store"})
    return {"html": html}
