from pydantic import BaseModel, Field
from models.lingguang_messages import Lingguang_messages
from services.lingguang_entity_api import entity_router

class MessageData(BaseModel):
    project_id: int = Field(gt=0)
    content: str = Field(min_length=1, max_length=6000)

router = entity_router("lingguang_messages", Lingguang_messages, MessageData)
