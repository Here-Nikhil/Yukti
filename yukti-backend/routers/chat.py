"""
routers/chat.py
───────────────
POST /chat  (Auto mode)
  • Fetches the user's API key from Firestore.
  • Auto-detects provider from key prefix:
      gsk_... → Groq
      AIza... → Gemini
      sk-ant-... → Anthropic
  • Streams the response back as SSE (Server-Sent Events).

SSE format:
  data: <text chunk>\n\n
  data: [DONE]\n\n
"""

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


def detect_provider(api_key: str) -> str:
    if api_key.startswith("gsk_"):
        return "groq"
    if api_key.startswith("AIza"):
        return "gemini"
    if api_key.startswith("sk-ant-"):
        return "anthropic"
    raise ValueError("Unrecognised API key format. Expected Groq (gsk_), Gemini (AIza), or Anthropic (sk-ant-).")


@router.post("")
async def chat(
    body: ChatRequest,
    current_user: dict = Depends(get_current_user),
) -> StreamingResponse:
    uid = current_user["uid"]

    # ── 1. Fetch API key from Firestore ───────────────────────────────────────
    db       = get_firestore()
    user_doc = db.collection("users").document(uid).get()

    if not user_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="User profile not found in Firestore.")

    user_data = user_doc.to_dict()

    if user_data.get("mode") != "auto":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="User is not in Auto mode. Enable it in settings.")

    api_key = user_data.get("claudeApiKey")
    if not api_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="No API key stored. Add one in your account settings.")

    # ── 2. Detect provider ────────────────────────────────────────────────────
    try:
        provider = detect_provider(api_key)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # ── 3. Build system prompt + messages ─────────────────────────────────────
    file_context = "\n\n".join(
        f"### {pf.path}\n```\n{pf.content}\n```"
        for pf in body.project_files
    )
    system_prompt = f"{SYSTEM_PROMPT_BASE}\n\n---\n\n{file_context}"

    messages = [{"role": m.role, "content": m.content} for m in body.history]
    messages.append({"role": "user", "content": body.message})

    # ── 4. Stream ─────────────────────────────────────────────────────────────
    if provider == "groq":
        return StreamingResponse(
            _stream_groq(api_key, system_prompt, messages),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    if provider == "gemini":
        return StreamingResponse(
            _stream_gemini(api_key, system_prompt, messages),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    # anthropic
    return StreamingResponse(
        _stream_anthropic(api_key, system_prompt, messages),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Provider streaming functions ──────────────────────────────────────────────

async def _stream_groq(api_key: str, system_prompt: str, messages: list):
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        stream = client.chat.completions.create(
            model    = "llama-3.3-70b-versatile",
            messages = [{"role": "system", "content": system_prompt}] + messages,
            stream   = True,
        )
        for chunk in stream:
            text = chunk.choices[0].delta.content or ""
            if text:
                yield f"data: {text.replace(chr(10), chr(92) + 'n')}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as exc:
        yield f"data: [ERROR] Groq error: {exc}\n\n"


async def _stream_gemini(api_key: str, system_prompt: str, messages: list):
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name   = "gemini-1.5-flash",
            system_instruction = system_prompt,
        )
        history = [
            {"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]}
            for m in messages[:-1]
        ]
        chat   = model.start_chat(history=history)
        stream = chat.send_message(messages[-1]["content"], stream=True)
        for chunk in stream:
            text = chunk.text or ""
            if text:
                yield f"data: {text.replace(chr(10), chr(92) + 'n')}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as exc:
        yield f"data: [ERROR] Gemini error: {exc}\n\n"


async def _stream_anthropic(api_key: str, system_prompt: str, messages: list):
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        with client.messages.stream(
            model      = "claude-sonnet-4-6",
            max_tokens = 4096,
            system     = system_prompt,
            messages   = messages,
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {text.replace(chr(10), chr(92) + 'n')}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as exc:
        yield f"data: [ERROR] Anthropic error: {exc}\n\n"