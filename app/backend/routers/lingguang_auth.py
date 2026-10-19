from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field, SecretStr, field_validator
from core.auth import create_access_token, decode_access_token
from dependencies.auth import get_current_user
import secrets
from services.lingguang_auth import UNIFIED_SOURCE
from services.lingguang_auth import COOKIE, auth_request, configuration, get_lingguang_user, password_login, session_claims
from schemas.auth import UserResponse

router = APIRouter(prefix="/api/v1/lingguang-auth", tags=["灵光独立账号"])


def browser_submission(request: Request):
    if "X-Lingguang-CSRF" not in request.headers:
        raise HTTPException(403, "请通过灵光账号表单提交。")
    if request.headers.get("sec-fetch-site") == "cross-site":
        raise HTTPException(403, "不允许跨站提交账号请求。")


class Credentials(BaseModel):
    email: EmailStr
    password: SecretStr

    @field_validator("password")
    @classmethod
    def bounded_password(cls, value):
        if not 1 <= len(value.get_secret_value()) <= 128:
            raise ValueError("密码长度需为1至128位")
        return value


class Registration(Credentials):
    confirm_password: SecretStr


@router.get("/status")
async def status(response: Response):
    response.headers["Cache-Control"] = "no-store"
    try:
        configuration()
        return {"configured": True}
    except HTTPException:
        return {"configured": False}


@router.post("/register", status_code=201)
async def register(data: Registration, response: Response, request: Request):
    browser_submission(request)
    password = data.password.get_secret_value()
    if password != data.confirm_password.get_secret_value():
        raise HTTPException(422, "两次密码不一致。")
    if len(password) < 8:
        raise HTTPException(422, "注册密码至少8位，最终强度规则由账号服务校验。")
    config = configuration()
    await auth_request("/dbconnections/signup", payload={"client_id": config["AUTH0_CLIENT_ID"],
        "connection": config["AUTH0_CONNECTION"], "email": str(data.email).lower(), "password": password})
    response.headers["Cache-Control"] = "no-store"
    return {"registered": True, "message": "账号已创建。如收到验证邮件，请先完成验证，然后登录。"}


@router.post("/login")
async def login(data: Credentials, response: Response, request: Request):
    browser_submission(request)
    user, token = await password_login(str(data.email).lower(), data.password.get_secret_value())
    response.set_cookie(COOKIE, token, max_age=3600, httponly=True, secure=True, samesite="lax", path="/api/v1")
    response.headers["Cache-Control"] = "no-store"
    return {"user": user, "csrf": decode_access_token(token)["csrf"]}


@router.post("/unified-session")
async def unified_session(request: Request, response: Response, user: UserResponse = Depends(get_current_user)):
    browser_submission(request)
    if user.id.startswith("lingguang:auth0:"):
        raise HTTPException(403, "独立账号不能转换为统一账号。")
    csrf = secrets.token_urlsafe(32)
    token = create_access_token({"sub": user.id, "email": user.email, "name": user.name,
        "role": "user", "auth_source": UNIFIED_SOURCE, "csrf": csrf}, expires_minutes=60)
    response.set_cookie(COOKIE, token, max_age=3600, httponly=True, secure=True, samesite="lax", path="/api/v1")
    response.headers["Cache-Control"] = "no-store"
    return {"user": user, "csrf": csrf}


@router.get("/me")
async def me(request: Request, response: Response, user: UserResponse = Depends(get_lingguang_user)):
    response.headers["Cache-Control"] = "no-store"
    return {"user": user, "csrf": session_claims(request)["csrf"]}


@router.post("/logout")
async def logout(response: Response, user: UserResponse = Depends(get_lingguang_user)):
    response.delete_cookie(COOKIE, path="/api/v1", secure=True, httponly=True, samesite="lax")
    response.headers["Cache-Control"] = "no-store"
    return {"logged_out": True}
