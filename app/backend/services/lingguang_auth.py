"""灵光独立身份与浏览器会话，不匹配或迁移统一账号。"""
import hashlib
import os
import re
import secrets

import httpx
from fastapi import HTTPException, Request
from core.auth import AccessTokenError, create_access_token, decode_access_token
from core.telemetry import observe_external_http
from schemas.auth import UserResponse

COOKIE = "lingguang_session"
SOURCE = "lingguang-auth0-v1"
UNIFIED_SOURCE = "lingguang-unified-v1"


def configuration() -> dict:
    values = {name: os.getenv(name, "").strip() for name in
              ("AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET", "AUTH0_CONNECTION")}
    if not all(values.values()):
        raise HTTPException(503, "独立账号服务尚未配置，请管理员补充 Auth0 配置后再试。")
    if not re.fullmatch(r"[a-zA-Z0-9.-]+", values["AUTH0_DOMAIN"]) or "." not in values["AUTH0_DOMAIN"]:
        raise HTTPException(503, "Auth0 域名配置无效。")
    return values


def identity(domain: str, connection: str, subject: str) -> str:
    value = "\0".join((domain.lower(), connection, subject))
    return "lingguang:auth0:" + hashlib.sha256(value.encode()).hexdigest()


async def auth_request(path: str, *, payload: dict | None = None, token: str | None = None) -> dict:
    config = configuration()
    try:
        async with httpx.AsyncClient(timeout=25, follow_redirects=False) as client:
            url = f"https://{config['AUTH0_DOMAIN']}{path}"
            operation = client.get(url, headers={"Authorization": f"Bearer {token}"}) if token else client.post(url, json=payload)
            response = await observe_external_http(operation)
        data = response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, "账号服务暂时无法连接，请稍后重试。") from None
    if not isinstance(data, dict):
        raise HTTPException(502, "账号服务返回异常，请稍后重试。")
    if response.status_code >= 300:
        code = data.get("error") or data.get("code")
        if response.status_code == 429:
            raise HTTPException(429, "尝试过于频繁，请稍后重试。")
        if path == "/dbconnections/signup":
            if response.status_code == 409 or code in ("user_exists", "username_exists"):
                raise HTTPException(409, "该邮箱无法注册，请尝试登录或使用其他邮箱。")
            if code in ("invalid_password", "PasswordStrengthError", "PasswordDictionaryError", "PasswordNoUserInfoError", "PasswordHistoryError"):
                raise HTTPException(422, "密码不符合账号服务安全规则，请使用更强且未使用过的密码。")
            raise HTTPException(422, "注册未完成，请检查邮箱、密码及账号服务注册设置。")
        if code == "mfa_required":
            raise HTTPException(403, "此账号要求多因素认证，当前邮箱密码入口无法完成，请联系管理员。")
        if code in ("invalid_grant", "access_denied"):
            raise HTTPException(401, "邮箱或密码不正确，或账号暂时无法登录。")
        raise HTTPException(503, "认证未完成，请检查独立账号连接与密码认证配置。")
    return data


async def password_login(email: str, password: str) -> tuple[UserResponse, str]:
    config = configuration()
    tokens = await auth_request("/oauth/token", payload={
        "grant_type": "http://auth0.com/oauth/grant-type/password-realm",
        "client_id": config["AUTH0_CLIENT_ID"], "client_secret": config["AUTH0_CLIENT_SECRET"],
        "username": email, "password": password, "realm": config["AUTH0_CONNECTION"],
        "scope": "openid profile email",
    })
    access = tokens.get("access_token")
    if not isinstance(access, str) or not access:
        raise HTTPException(502, "认证服务未返回有效登录凭据。")
    profile = await auth_request("/userinfo", token=access)
    subject = profile.get("sub")
    if not isinstance(subject, str) or not subject.startswith("auth0|"):
        raise HTTPException(403, "该身份不属于灵光邮箱密码账号。")
    user = UserResponse(id=identity(config["AUTH0_DOMAIN"], config["AUTH0_CONNECTION"], subject),
                        email=profile.get("email") or email, name=profile.get("name"), role="user")
    csrf = secrets.token_urlsafe(32)
    token = create_access_token({"sub": user.id, "email": user.email, "name": user.name,
                                 "role": "user", "auth_source": SOURCE, "csrf": csrf}, expires_minutes=60)
    return user, token


def session_claims(request: Request) -> dict:
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(401, "请先登录灵光独立账号。")
    try:
        claims = decode_access_token(token)
    except AccessTokenError:
        raise HTTPException(401, "登录已过期，请重新登录。") from None
    source = claims.get("auth_source")
    subject = str(claims.get("sub", ""))
    if not subject or source not in (SOURCE, UNIFIED_SOURCE) or (source == SOURCE and not subject.startswith("lingguang:auth0:")) or (source == UNIFIED_SOURCE and subject.startswith("lingguang:auth0:")):
        raise HTTPException(401, "请重新登录灵光账号。")
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        supplied = request.headers.get("X-Lingguang-CSRF", "")
        expected = claims.get("csrf", "")
        if not expected or not secrets.compare_digest(supplied, expected):
            raise HTTPException(403, "会话校验失败，请刷新页面后重试。")
    return claims


async def get_lingguang_user(request: Request) -> UserResponse:
    claims = session_claims(request)
    return UserResponse(id=claims["sub"], email=claims.get("email", ""), name=claims.get("name"), role="user")
