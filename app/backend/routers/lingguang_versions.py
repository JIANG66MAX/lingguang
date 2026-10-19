from pydantic import BaseModel, Field
from models.lingguang_versions import Lingguang_versions
from services.lingguang_entity_api import entity_router

class VersionData(BaseModel):
    project_id: int = Field(gt=0)
    prompt: str = Field(min_length=1, max_length=6000)
    html: str = Field(min_length=1, max_length=1000000)

router = entity_router("lingguang_versions", Lingguang_versions, VersionData)
