from pydantic import BaseModel
from typing import Optional, Literal
from enum import Enum


# ── Enums ──────────────────────────────────────────────────────────────────────

class ActionEnum(str, Enum):
    REPLACE = "replace"
    INSERT  = "insert"
    DELETE  = "delete"

class ConfidenceEnum(str, Enum):
    HIGH   = "high"
    MEDIUM = "medium"
    LOW    = "low"


# ── /parse ─────────────────────────────────────────────────────────────────────

class ParseRequest(BaseModel):
    llm_output:      str
    available_files: list[str]

class ParsedInstruction(BaseModel):
    file:        Optional[str]
    action:      ActionEnum
    target:      Optional[str]
    replacement: Optional[str]
    line_hint:   Optional[int]
    confidence:  ConfidenceEnum
    raw:         str

class Ambiguity(BaseModel):
    description:        str
    options:            list[str]
    clarification_prompt: str

class ParseResponse(BaseModel):
    instructions: list[ParsedInstruction]
    ambiguities:  list[Ambiguity]


# ── /apply ─────────────────────────────────────────────────────────────────────

class FileContent(BaseModel):
    path:    str
    content: str

class ApplyRequest(BaseModel):
    project_id:   str
    instructions: list[ParsedInstruction]
    files:        list[FileContent]

class DiffHunk(BaseModel):
    type: Literal["add", "del", "ctx"]
    line: str
    n:    int

class FileDiff(BaseModel):
    file:    str
    hunks:   list[DiffHunk]
    applied: bool

class ApplyResponse(BaseModel):
    diffs:         list[FileDiff]
    updated_files: list[FileContent]


# ── /chat ──────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role:    Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    message:       str
    history:       list[ChatMessage]
    project_files: list[FileContent]


# ── /verify-token ──────────────────────────────────────────────────────────────

class VerifyTokenRequest(BaseModel):
    token: str

class VerifyTokenResponse(BaseModel):
    uid:   str
    email: str
    valid: bool
