from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthUser, get_optional_user
from app.core.database import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services import chat_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthUser | None = Depends(get_optional_user),
):
    try:
        answer = await chat_service.chat_with_tools(
            db=db,
            messages=[m.model_dump() for m in payload.messages],
            user_id=user.id if user else None,
        )
        return ChatResponse(answer=answer)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
