from typing import Literal

from pydantic import BaseModel, Field

# Bounds keep a single request from carrying an arbitrarily large prompt to
# OpenAI; roles are restricted so clients cannot inject system messages.
MAX_MESSAGES = 30
MAX_MESSAGE_CHARS = 4000


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=MAX_MESSAGES)


class ChatResponse(BaseModel):
    answer: str
