"""
routers/chat.py
───────────────
POST /chat  (Auto mode)
  • Fetches the user's personal Claude API key from Firestore.
  • Streams the Anthropic response back as SSE (Server-Sent Events).
  • Injects all project files into the system prompt so Claude has context.

SSE format (each event):
  data: <text chunk>\n\n
  data: [DONE]\n\n   ← signals end of stream to the frontend
"""

import anthropic
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from core.firebase import get_firestore
from models.schemas import ChatRequest
from routers.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPT_BASE = (
    "You are Yukti, an AI coding assistant. "
    "You have access to the user's full project files listed below. "
    "When suggesting changes, always output in unified diff format so "
    "Yukti can apply them automatically. Be concise and precise."
)


@router.post("")
async def chat(
    body: ChatRequest,
    current_user: dict = Depends(get_current_user),
) -> StreamingResponse:
    """
    Proxy a chat message to Anthropic using the user's own API key,
    streamed back as Server-Sent Events.
    """
    uid = current_user["uid"]

    # ── 1. Fetch the user's Claude API key from Firestore ─────────────────────
    db       = get_firestore()
    user_doc = db.collection("users").document(uid).get()

    if not user_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found in Firestore.",
        )

    user_data = user_doc.to_dict()

    if user_data.get("mode") != "auto":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not in Auto mode. Enable it in settings.",
        )

    api_key = user_data.get("claudeApiKey")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Claude API key stored. Add one in your account settings.",
        )

    # ── 2. Build system prompt with all project files as context ──────────────
    file_context = "\n\n".join(
        f"### {pf.path}\n```\n{pf.content}\n```"
        for pf in body.project_files
    )
    system_prompt = f"{SYSTEM_PROMPT_BASE}\n\n---\n\n{file_context}"

    # ── 3. Build message history ───────────────────────────────────────────────
    messages = [
        {"role": m.role, "content": m.content}
        for m in body.history
    ]
    messages.append({"role": "user", "content": body.message})

    # ── 4. Stream from Anthropic ──────────────────────────────────────────────
    client = anthropic.Anthropic(api_key=api_key)

    async def event_generator():
        try:
            with client.messages.stream(
                model      = "claude-sonnet-4-6",
                max_tokens = 4096,
                system     = system_prompt,
                messages   = messages,
            ) as stream:
                for text_chunk in stream.text_stream:
                    # Escape any bare newlines inside the SSE data field.
                    safe_chunk = text_chunk.replace("\n", "\\n")
                    yield f"data: {safe_chunk}\n\n"

            yield "data: [DONE]\n\n"

        except anthropic.AuthenticationError:
            yield "data: [ERROR] Invalid Claude API key. Please update it in settings.\n\n"
        except anthropic.RateLimitError:
            yield "data: [ERROR] Claude rate limit reached. Try again shortly.\n\n"
        except Exception as exc:
            yield f"data: [ERROR] Unexpected error: {exc}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            # Prevent any proxy or CDN from buffering the stream.
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
