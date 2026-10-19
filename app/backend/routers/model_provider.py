import asyncio
import ipaddress
import json
import logging
import os
import time
from uuid import uuid4
import socket
from typing import Literal
from urllib.parse import urlsplit, urlunsplit

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, SecretStr
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.telemetry import observe_external_http
from services.lingguang_auth import get_lingguang_user as get_current_user
from models.lingguang_provider_keys import Lingguang_provider_keys
from schemas.auth import UserResponse

router = APIRouter(prefix="/api/v1/model-provider", tags=["模型算力"])
logger = logging.getLogger(__name__)
Protocol = Literal["chat", "responses", "anthropic"]


def cipher() -> Fernet:
    try:
        return Fernet(os.environ.get("MODEL_KEYS_ENCRYPTION_KEY", "").encode())
    except ValueError:
        raise HTTPException(503, "服务端加密密钥未配置或格式无效，暂不能保存或使用个人 Key。") from None


def storage_ready() -> bool:
    try:
        cipher()
        return True
    except HTTPException:
        return False


def seal(config: dict, user_id: str) -> str:
    return cipher().encrypt(json.dumps({"user_id": user_id, **config}).encode()).decode()


def unseal(value: str, user_id: str) -> dict:
    try:
        config = json.loads(cipher().decrypt(value.encode()))
        if config["user_id"] != user_id:
            raise ValueError("ownership")
        return config
    except (InvalidToken, ValueError, KeyError):
        raise HTTPException(409, "配置无法解密，请删除后重新配置。") from None


class ConfigRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    base_url: str = Field(min_length=8, max_length=500)
    model: str = Field(min_length=1, max_length=150, pattern=r"^[A-Za-z0-9._:/-]+$")
    protocol: Protocol = "chat"
    api_key: SecretStr | None = None


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1, max_length=500000)


class GenerationRequest(BaseModel):
    partial: str = Field(default="", max_length=500000)
    config_id: int = Field(gt=0)
    messages: list[Message] = Field(min_length=1, max_length=10)


def normalize_url(value: str) -> str:
    try:
        url = urlsplit(value.strip())
        if url.scheme != "https" or not url.hostname or url.username or url.password or url.query or url.fragment or url.port not in (None, 443):
            raise ValueError()
        if "%" in url.netloc or any(char.isspace() for char in value):
            raise ValueError()
        host = url.hostname.encode("idna").decode()
        netloc = f"[{host}]" if ":" in host else host
        return urlunsplit(("https", netloc, url.path.rstrip("/"), "", ""))
    except (ValueError, UnicodeError):
        raise HTTPException(422, "接口需为无账号、参数和片段的 HTTPS 基础地址，仅支持443端口。") from None


async def public_address(base_url: str) -> tuple[str, str]:
    host = urlsplit(base_url).hostname
    try:
        results = await asyncio.get_running_loop().getaddrinfo(host, 443, type=socket.SOCK_STREAM)
        addresses = {item[4][0] for item in results}
        if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
            raise HTTPException(422, "接口地址必须指向公网，禁止本机、内网和保留地址。")
        return host, sorted(addresses)[0]
    except socket.gaierror:
        raise HTTPException(422, "无法解析接口域名，请检查地址。") from None


def metadata(row, config: dict) -> dict:
    # 兼容原有仅保存OpenAI Key的配置。
    return {"id": row.id, "name": config.get("name", "OpenAI"),
            "base_url": config.get("base_url", "https://api.openai.com/v1"),
            "model": config.get("model", "gpt-5.4"),
            "protocol": config.get("protocol", "responses"), "configured": True}


async def owned_config(db: AsyncSession, user_id: str, config_id: int):
    row = await db.scalar(select(Lingguang_provider_keys).where(
        Lingguang_provider_keys.user_id == user_id, Lingguang_provider_keys.id == config_id))
    if row is None:
        raise HTTPException(404, "配置不存在或无权访问。")
    return row


@router.get("/configs")
async def list_configs(user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = list(await db.scalars(select(Lingguang_provider_keys).where(
        Lingguang_provider_keys.user_id == user.id).order_by(Lingguang_provider_keys.id)))
    ready = storage_ready()
    items = [metadata(row, unseal(row.encrypted_key, user.id)) for row in rows] if ready else []
    return {"items": items, "storage_ready": ready}


async def save_config(data: ConfigRequest, user: UserResponse, db: AsyncSession, config_id: int | None):
    base_url = normalize_url(data.base_url)
    await public_address(base_url)
    row = await owned_config(db, user.id, config_id) if config_id else None
    previous = unseal(row.encrypted_key, user.id) if row else {}
    key = data.api_key.get_secret_value().strip() if data.api_key else previous.get("key", "")
    if not key or len(key) > 4096 or any(char.isspace() for char in key):
        raise HTTPException(422, "请填写有效的 API Key。")
    config = {"name": data.name.strip(), "base_url": base_url, "model": data.model,
              "protocol": data.protocol, "key": key}
    if not config["name"]:
        raise HTTPException(422, "平台名称不能为空。")
    encrypted = seal(config, user.id)
    if row:
        row.encrypted_key = encrypted
    else:
        row = Lingguang_provider_keys(user_id=user.id, provider="custom", encrypted_key=encrypted)
        db.add(row)
    await db.commit()
    return metadata(row, config)


@router.post("/configs")
async def create_config(data: ConfigRequest, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await save_config(data, user, db, None)


@router.put("/configs/{config_id}")
async def update_config(config_id: int, data: ConfigRequest, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await save_config(data, user, db, config_id)


@router.delete("/configs/{config_id}")
async def remove_config(config_id: int, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await owned_config(db, user.id, config_id)
    await db.execute(delete(Lingguang_provider_keys).where(
        Lingguang_provider_keys.user_id == user.id, Lingguang_provider_keys.id == config_id))
    await db.commit()
    return {"deleted": True}


async def call_provider(config: dict, messages: list[dict]) -> str:
    base_url = normalize_url(config["base_url"])
    host, address = await public_address(base_url)
    protocol = config["protocol"]
    if protocol == "anthropic":
        path = "/messages"
        system = "\n".join(message["content"] for message in messages if message["role"] == "system")
        payload = {"model": config["model"], "max_tokens": 16000,
                   "system": system, "messages": [message for message in messages if message["role"] != "system"]}
        headers = {"x-api-key": config["key"], "anthropic-version": "2023-06-01"}
    elif protocol == "responses":
        path = "/responses"
        payload = {"model": config["model"], "input": messages, "max_output_tokens": 24000, "stream": False}
        headers = {"Authorization": f"Bearer {config['key']}"}
    else:
        path = "/chat/completions"
        payload = {"model": config["model"], "messages": messages, "stream": False}
        headers = {"Authorization": f"Bearer {config['key']}"}
    # 固定已验证公网IP，TLS仍验证原域名，禁用代理和重定向以防DNS重绑定。
    parsed = urlsplit(base_url)
    ip_host = f"[{address}]" if ":" in address else address
    url = urlunsplit(("https", ip_host, parsed.path + path, "", ""))
    headers["Host"] = f"[{host}]" if ":" in host else host
    try:
        async with httpx.AsyncClient(timeout=240, follow_redirects=False, trust_env=False) as client:
            response = await observe_external_http(client.post(url, json=payload, headers=headers, extensions={"sni_hostname": host}))
        if response.status_code >= 300:
            reasons = {401: "Key 鉴权失败", 403: "模型访问被拒绝", 404: "接口或模型不存在", 429: "额度不足或请求频率受限"}
            raise HTTPException(502, f"{config['name']}：{reasons.get(response.status_code, '接口请求失败')}（HTTP {response.status_code}）。请检查配置后重试。")
        result = response.json()
        if protocol == "anthropic":
            if result.get("stop_reason") == "max_tokens":
                raise HTTPException(502, "输出达到长度限制，代码可能截断，请精简需求后重试。")
            content = "".join(part.get("text", "") for part in result.get("content", []) if part.get("type") == "text")
        elif protocol == "responses":
            if result.get("status") == "incomplete":
                raise HTTPException(502, "模型输出未完成，请精简需求后重试。")
            content = "".join(part.get("text", "") for item in result.get("output", []) for part in item.get("content", []) if part.get("type") == "output_text")
        else:
            choice = result.get("choices", [{}])[0]
            if choice.get("finish_reason") == "length":
                raise HTTPException(502, "输出达到长度限制，代码可能截断，请精简需求后重试。")
            content = choice.get("message", {}).get("content", "")
        if not isinstance(content, str) or not content.strip():
            raise HTTPException(502, "接口没有返回文本代码，请确认模型及接口协议。")
        return content
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(504, "模型请求超时，请稍后重试。") from None
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError, AttributeError):
        raise HTTPException(502, "接口连接或响应格式异常，请检查地址和接口协议。") from None


async def provider_chunks(config: dict, messages: list[dict]):
    base_url = normalize_url(config["base_url"])
    host, address = await public_address(base_url)
    protocol = config["protocol"]
    if protocol == "anthropic":
        path = "/messages"
        payload = {"model": config["model"], "max_tokens": 24000, "stream": True,
            "system": "\n".join(item["content"] for item in messages if item["role"] == "system"),
            "messages": [item for item in messages if item["role"] != "system"]}
        headers = {"x-api-key": config["key"], "anthropic-version": "2023-06-01"}
    elif protocol == "responses":
        path = "/responses"
        payload = {"model": config["model"], "input": messages, "max_output_tokens": 24000, "stream": True}
        headers = {"Authorization": f"Bearer {config['key']}"}
    else:
        path = "/chat/completions"
        payload = {"model": config["model"], "messages": messages, "stream": True}
        headers = {"Authorization": f"Bearer {config['key']}"}
    parsed = urlsplit(base_url)
    ip_host = f"[{address}]" if ":" in address else address
    url = urlunsplit(("https", ip_host, parsed.path + path, "", ""))
    headers["Host"] = f"[{host}]" if ":" in host else host
    async with httpx.AsyncClient(timeout=20, follow_redirects=False, trust_env=False) as client:
        request = client.build_request("POST", url, json=payload, headers=headers,
                                      extensions={"sni_hostname": host})
        response = await observe_external_http(client.send(request, stream=True))
        try:
            if response.status_code >= 300:
                raise HTTPException(502, f"{config['name']} 请求失败（HTTP {response.status_code}），请检查Key、模型权限和接口地址。")
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                raw = line[5:].strip()
                if raw == "[DONE]":
                    return
                if not raw:
                    continue
                event = json.loads(raw)
                if event.get("error") or event.get("type") in ("error", "response.failed"):
                    raise HTTPException(502, "模型服务返回生成错误，请稍后重试。")
                if protocol == "anthropic":
                    delta = event.get("delta", {})
                    if event.get("type") == "content_block_delta" and delta.get("type") == "text_delta":
                        yield delta.get("text", "")
                    if event.get("type") == "message_stop":
                        return
                elif protocol == "responses":
                    if event.get("type") == "response.output_text.delta":
                        yield event.get("delta", "")
                    if event.get("type") in ("response.completed", "response.incomplete"):
                        return
                else:
                    for choice in event.get("choices", []):
                        content = choice.get("delta", {}).get("content")
                        if isinstance(content, str):
                            yield content
            raise HTTPException(502, "模型响应在结束标记前断开，请重试生成。")
        finally:
            await response.aclose()


class BuiltinGenerationRequest(BaseModel):
    partial: str = Field(default="", max_length=500000)
    model: Literal["gpt-5.4", "gpt-5.5", "claude-opus-4.6", "deepseek-v4-flash", "deepseek-v4-pro", "gemini-3.1-pro-preview"]
    messages: list[Message] = Field(min_length=1, max_length=10)


@router.post("/builtin-generate")
async def builtin_generate(data: BuiltinGenerationRequest, user: UserResponse = Depends(get_current_user)):
    from services.aihub import AIHubService
    from schemas.aihub import GenTxtRequest, ChatMessage
    from services.generation_segments import collect_segment, continuation_messages
    request_id = uuid4().hex[:16]
    started = time.monotonic()
    service = None
    logger.info("内置生成开始 request_id=%s model=%s partial_chars=%d", request_id, data.model, len(data.partial))
    try:
        service = AIHubService()
        if service.client is None:
            raise HTTPException(503, "内置模型服务未配置，请由管理员检查服务端AI配置。")
        messages = continuation_messages([message.model_dump() for message in data.messages], data.partial)
        result = await collect_segment(service.gentxt_stream(GenTxtRequest(model=data.model, stream=True,
            messages=[ChatMessage(**message) for message in messages], max_tokens=24000)))
        logger.info("内置生成返回 request_id=%s elapsed_seconds=%.2f content_chars=%d complete=%s",
                    request_id, time.monotonic() - started, len(result["content"]), result["complete"])
        return result
    except HTTPException as exc:
        logger.warning("内置生成失败 request_id=%s elapsed_seconds=%.2f status=%d",
                       request_id, time.monotonic() - started, exc.status_code)
        raise HTTPException(exc.status_code, f"{exc.detail}（诊断编号：{request_id}）", headers=exc.headers) from None
    except Exception as exc:
        logger.error("内置生成异常 request_id=%s elapsed_seconds=%.2f exception_type=%s",
                     request_id, time.monotonic() - started, type(exc).__name__)
        raise HTTPException(502, f"内置生成服务暂时异常，请稍后重试。（诊断编号：{request_id}）") from None
    finally:
        if service is not None and service.client is not None:
            try:
                await asyncio.wait_for(service.client.close(), timeout=1)
            except Exception as exc:
                logger.warning("内置客户端清理失败 request_id=%s exception_type=%s", request_id, type(exc).__name__)


@router.post("/generate")
async def generate(data: GenerationRequest, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await owned_config(db, user.id, data.config_id)
    config = unseal(row.encrypted_key, user.id)
    config = {**metadata(row, config), "key": config["key"]}
    await db.commit()
    from services.generation_segments import collect_segment, continuation_messages
    messages = continuation_messages([message.model_dump() for message in data.messages], data.partial)
    return await collect_segment(provider_chunks(config, messages))
