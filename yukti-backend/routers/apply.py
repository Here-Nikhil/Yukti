from fastapi import APIRouter, Depends, HTTPException, status

from core.diff import DiffGenerator
from core.firebase import get_firestore
from core.fuzzy import FuzzyMatcher
from models.schemas import (
    ApplyRequest,
    ApplyResponse,
    FileDiff,
    FileContent,
    ParsedInstruction,
)
from routers.auth import get_current_user

router  = APIRouter(prefix="/apply", tags=["apply"])
_diff   = DiffGenerator()
_fuzzy  = FuzzyMatcher()


@router.post("", response_model=ApplyResponse)
async def apply_instructions(
    body: ApplyRequest,
    current_user: dict = Depends(get_current_user),
) -> ApplyResponse:
    file_map: dict[str, str] = {f.path: f.content for f in body.files}

    diffs:         list[FileDiff]    = []
    updated_files: list[FileContent] = []

    by_file: dict[str, list[ParsedInstruction]] = {}
    for inst in body.instructions:
        if inst.file:
            by_file.setdefault(inst.file, []).append(inst)

    for file_path, instructions in by_file.items():
        original = file_map.get(file_path)
        if original is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"File content not provided for path: {file_path!r}",
            )

        current_content = original
        file_applied    = True

        for inst in instructions:
            try:
                current_content = _diff.apply_instruction(
                    file_content = current_content,
                    instruction  = inst,
                    fuzzy        = _fuzzy,
                )
                import logging
                logging.warning(f"APPLY DEBUG: success for {inst.file}")
            except ValueError as e:
                import logging
                logging.warning(f"APPLY DEBUG: failed for {inst.file} error={e}")
                file_applied = False

        hunks = _diff.generate(
            original  = original,
            modified  = current_content,
            file_path = file_path,
        )

        diffs.append(FileDiff(file=file_path, hunks=hunks, applied=file_applied))
        updated_files.append(FileContent(path=file_path, content=current_content))

    # ── Persist updated files to Neon ─────────────────────────────────────────
    try:
        from core.db import database
        uid = current_user["uid"]
        for uf in updated_files:
            await database.execute(
                """
                INSERT INTO project_files (project_id, uid, path, content, language)
                VALUES (:project_id, :uid, :path, :content, :language)
                ON CONFLICT (project_id, path) DO UPDATE
                    SET content = EXCLUDED.content,
                        updated_at = now()
                """,
                values={
                    "project_id": body.project_id,
                    "uid": uid,
                    "path": uf.path,
                    "content": uf.content,
                    "language": uf.path.rsplit(".", 1)[-1] if "." in uf.path else "txt",
                }
            )
    except Exception:
        pass

    # ── Persist changesApplied counter in Firestore ───────────────────────────
    applied_count = sum(1 for d in diffs if d.applied)
    if applied_count:
        try:
            db       = get_firestore()
            proj_ref = db.collection("projects").document(body.project_id)
            proj_ref.update({"changesApplied": firestore_increment(applied_count)})
        except Exception:
            pass

    return ApplyResponse(diffs=diffs, updated_files=updated_files)


# ── Helper: Firestore server-side increment ───────────────────────────────────

def firestore_increment(n: int):
    from google.cloud.firestore_v1 import transforms
    return transforms.INCREMENT(n)