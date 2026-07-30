"""
main.py — Yukti Backend
───────────────────────
FastAPI application for Yukti: applies LLM-suggested code changes to
real project files.

Cloud Run requires port 8080 (set in Dockerfile CMD).
"""
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.firebase import init_firebase
from core.db import database
from routers import apply, auth, chat, parse

# ── Initialise Firebase once at startup ───────────────────────────────────────
init_firebase()

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title       = "Yukti Backend",
    description = "Applies LLM code suggestions to real project files.",
    version     = "1.0.0",
)

# CORS — tighten allow_origins to your Lovable domain before going to prod.
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(parse.router)
app.include_router(apply.router)
app.include_router(chat.router)


@app.get("/", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "yukti-backend"}