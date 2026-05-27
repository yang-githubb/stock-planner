from __future__ import annotations

import json

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services import finnhub_service, portfolio_service


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_quote",
            "description": "Get current quote for a stock symbol.",
            "parameters": {"type": "object", "properties": {"symbol": {"type": "string"}}, "required": ["symbol"]},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_company_news",
            "description": "Get recent company news for a symbol.",
            "parameters": {"type": "object", "properties": {"symbol": {"type": "string"}}, "required": ["symbol"]},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_portfolio_summary",
            "description": "Get signed-in user's portfolio summary by portfolio id.",
            "parameters": {
                "type": "object",
                "properties": {"portfolio_id": {"type": "integer"}},
                "required": ["portfolio_id"],
            },
        },
    },
]


async def _run_tool(
    db: AsyncSession,
    user_id: str | None,
    name: str,
    args: dict,
) -> str:
    if name == "get_quote":
        return json.dumps(await finnhub_service.get_quote(args["symbol"].upper()))
    if name == "get_company_news":
        from datetime import datetime, timedelta

        today = datetime.now().strftime("%Y-%m-%d")
        from_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        return json.dumps(await finnhub_service.get_company_news(args["symbol"].upper(), from_date, today))
    if name == "get_portfolio_summary":
        if not user_id:
            return json.dumps({"error": "authentication_required"})
        summary = await portfolio_service.get_portfolio_summary(
            db, int(args["portfolio_id"]), live_prices=False, user_id=user_id
        )
        return json.dumps(summary)
    return json.dumps({"error": f"unknown_tool:{name}"})


async def chat_with_tools(
    db: AsyncSession,
    messages: list[dict[str, str]],
    user_id: str | None = None,
) -> str:
    if not settings.OPENAI_API_KEY:
        return "Chat is not configured yet. Set OPENAI_API_KEY in backend/.env."

    try:
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        completion = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a stock expert assistant. Keep answers concise and factual. "
                        "Use tools when market/portfolio data is needed."
                    ),
                },
                *messages,
            ],
            tools=TOOLS,
        )
    except Exception as exc:
        return f"Chat request failed (tool-call stage): {exc}"

    msg = completion.choices[0].message
    tool_calls = msg.tool_calls or []
    if not tool_calls:
        return msg.content or "No response generated."

    tool_messages: list[dict[str, str]] = []
    for tool_call in tool_calls:
        fn = tool_call.function
        args = json.loads(fn.arguments or "{}")
        output = await _run_tool(db, user_id, fn.name, args)
        tool_messages.append(
            {
                "role": "tool",
                "tool_call_id": tool_call.id,
                "name": fn.name,
                "content": output,
            }
        )

    try:
        completion2 = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "Summarize tool results clearly for the user with bullet points when helpful.",
                },
                *messages,
                {
                    "role": "assistant",
                    "content": msg.content or "",
                    "tool_calls": tool_calls,
                },
                *tool_messages,
            ],
        )
        return completion2.choices[0].message.content or "No response generated."
    except Exception as exc:
        return f"Chat request failed (final stage): {exc}"
