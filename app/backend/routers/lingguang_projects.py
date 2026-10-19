from pydantic import BaseModel, Field
from models.lingguang_projects import Lingguang_projects
from services.lingguang_entity_api import entity_router

class ProjectData(BaseModel):
    title: str = Field(min_length=1, max_length=200)

router = entity_router("lingguang_projects", Lingguang_projects, ProjectData)
