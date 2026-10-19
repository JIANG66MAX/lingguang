"""模型凭据仅经 model_provider 认证接口使用，不公开通用实体CRUD。"""
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/lingguang_provider_keys", tags=["受保护模型配置"])
