"""
routers/parse.py
────────────────
POST /parse
  Receives raw LLM output and the list of file paths in the project.
  Delegates actual parsing to core.parser.LLMOutputParser (not yet
  implemented — raises NotImplementedError; swap in the real logic when
  ready without touching this router).

  Low-confidence, genuinely ambiguous results are returned in
  `ambiguities` instead of `instructions`.
"""

from fastapi import APIRouter, Depends

from core.parser import LLMOutputParser
from models.schemas import (
    Ambiguity,
    ConfidenceEnum,
    ParseRequest,
    ParseResponse,
    ParsedInstruction,
)
from routers.auth import get_current_user

router = APIRouter(prefix="/parse", tags=["parse"])
_parser = LLMOutputParser()


@router.post("", response_model=ParseResponse)
async def parse_llm_output(
    body: ParseRequest,
    current_user: dict = Depends(get_current_user),
) -> ParseResponse:
    """
    Parse raw LLM output into structured change instructions.

    • High / medium confidence → `instructions` list.
    • Low confidence + genuinely ambiguous → `ambiguities` list with a
      ready-to-paste clarification prompt the user can take back to their LLM.
    """
    raw_instructions = _parser.parse(
        llm_output      = body.llm_output,
        available_files = body.available_files,
    )

    instructions: list[ParsedInstruction] = []
    ambiguities:  list[Ambiguity]         = []

    for inst in raw_instructions:
        pydantic_inst = ParsedInstruction(
            file        = inst.file,
            action      = inst.action,
            target      = inst.target,
            replacement = inst.replacement,
            line_hint   = inst.line_hint,
            confidence  = inst.confidence,
            raw         = inst.raw,
        )

        if inst.confidence == ConfidenceEnum.LOW and _is_ambiguous(inst, body.available_files):
            # Build a clarification prompt the user can paste directly
            # back into their LLM to get a more precise answer.
            ambiguities.append(
                Ambiguity(
                    description=f"Ambiguous target for file: {inst.file!r}",
                    options=_candidate_locations(inst, body.available_files),
                    clarification_prompt=_build_clarification_prompt(inst),
                )
            )
        else:
            instructions.append(pydantic_inst)

    return ParseResponse(instructions=instructions, ambiguities=ambiguities)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _is_ambiguous(inst, available_files: list[str]) -> bool:
    """
    True when the instruction's file is None *or* matches more than one
    available file (e.g. two files with the same basename).
    """
    if inst.file is None:
        return True
    matches = [f for f in available_files if inst.file in f]
    return len(matches) > 1


def _candidate_locations(inst, available_files: list[str]) -> list[str]:
    if inst.file is None:
        return available_files
    return [f for f in available_files if inst.file in f] or available_files


def _build_clarification_prompt(inst) -> str:
    return (
        f"In your previous response you suggested a change to "
        f"{inst.file!r} but the location is ambiguous. "
        f"Please re-state the change and include:\n"
        f"  1. The exact file path.\n"
        f"  2. The exact function / class name or line number.\n"
        f"  3. The complete original code block to be replaced.\n"
        f"Original raw instruction:\n{inst.raw}"
    )
