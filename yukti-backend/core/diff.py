"""
core/diff.py
────────────
DiffGenerator
  • generate()          – unified-style hunk list from two strings
  • apply_instruction() – apply one ParsedInstruction to file content,
                          using FuzzyMatcher for anchor detection and
                          context-aware indentation preservation.

Indentation rule (no AI involved):
  When inserting or replacing, read the 2 lines immediately above the
  insertion point, pick the one with more leading whitespace, and use
  that prefix for every new line that has no indentation of its own.
  This keeps the generated code at the correct nesting depth.
"""

import difflib
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    # Avoid circular import; the actual object is passed in at runtime.
    from core.fuzzy import FuzzyMatcher

from models.schemas import ActionEnum, ParsedInstruction


# Number of context lines shown around each change in the diff output.
CONTEXT_LINES = 3


class DiffGenerator:

    # ── Public API ────────────────────────────────────────────────────────────

    def generate(self, original: str, modified: str, file_path: str) -> list[dict]:
        """
        Compare `original` and `modified` and return a list of hunk dicts:
          { "type": "add" | "del" | "ctx", "line": str, "n": int }

        "n" is the 1-based line number in the *modified* file (add/ctx lines)
        or the *original* file (del lines), mirroring unified-diff semantics.
        """
        orig_lines = original.splitlines(keepends=True)
        mod_lines  = modified.splitlines(keepends=True)

        hunks: list[dict] = []

        # difflib.unified_diff yields lines prefixed with ' ', '+', or '-'.
        diff_iter = difflib.unified_diff(
            orig_lines,
            mod_lines,
            fromfile=f"a/{file_path}",
            tofile=f"b/{file_path}",
            n=CONTEXT_LINES,
        )

        orig_n = 0  # tracks current line in the original file
        mod_n  = 0  # tracks current line in the modified file

        for raw_line in diff_iter:
            # Skip the --- / +++ header lines produced by unified_diff.
            if raw_line.startswith("---") or raw_line.startswith("+++"):
                continue

            # Hunk range headers look like "@@ -a,b +c,d @@"; parse them
            # to reset our line counters correctly.
            if raw_line.startswith("@@"):
                parts = raw_line.split()
                # parts[1] is "-X,Y", parts[2] is "+X,Y"
                orig_n = int(parts[1].lstrip("-").split(",")[0])
                mod_n  = int(parts[2].lstrip("+").split(",")[0])
                continue

            stripped = raw_line.rstrip("\n")

            if raw_line.startswith("+"):
                hunks.append({"type": "add", "line": stripped[1:], "n": mod_n})
                mod_n += 1
            elif raw_line.startswith("-"):
                hunks.append({"type": "del", "line": stripped[1:], "n": orig_n})
                orig_n += 1
            else:
                # Context line (" " prefix)
                hunks.append({"type": "ctx", "line": stripped[1:], "n": mod_n})
                orig_n += 1
                mod_n  += 1

        return hunks

    def apply_instruction(
        self,
        file_content: str,
        instruction: ParsedInstruction,
        fuzzy: "FuzzyMatcher",
    ) -> str:
        """
        Apply one ParsedInstruction to `file_content` and return the
        resulting file content as a string.

        Actions
        -------
        replace – find `target`, swap it for `replacement` (indentation-aware)
        insert  – find `target` anchor and insert `replacement` after it
        delete  – find `target` and remove it

        Raises ValueError if the anchor cannot be found.
        """
        action = instruction.action

        # ── DELETE ────────────────────────────────────────────────────────────
        if action == ActionEnum.DELETE:
            anchor = self._locate(file_content, instruction, fuzzy)
            return self._delete_span(file_content, anchor["matched_text"])

        # ── REPLACE ───────────────────────────────────────────────────────────
        if action == ActionEnum.REPLACE:
            anchor      = self._locate(file_content, instruction, fuzzy)
            replacement = self._indent_block(
                new_block    = instruction.replacement or "",
                file_content = file_content,
                anchor_line  = anchor["line_number"],
            )
            return file_content.replace(anchor["matched_text"], replacement, 1)

        # ── INSERT ────────────────────────────────────────────────────────────
        if action == ActionEnum.INSERT:
            anchor     = self._locate(file_content, instruction, fuzzy)
            to_insert  = self._indent_block(
                new_block    = instruction.replacement or "",
                file_content = file_content,
                anchor_line  = anchor["line_number"],
            )
            # Insert *after* the matched span.
            insert_pos = (
                file_content.index(anchor["matched_text"])
                + len(anchor["matched_text"])
            )
            return (
                file_content[:insert_pos]
                + "\n"
                + to_insert
                + file_content[insert_pos:]
            )

        raise ValueError(f"Unknown action: {action}")

    # ── Private helpers ───────────────────────────────────────────────────────

    def _locate(
        self,
        file_content: str,
        instruction: ParsedInstruction,
        fuzzy: "FuzzyMatcher",
    ) -> dict:
        """Run FuzzyMatcher and raise if nothing is found."""
        if not instruction.target:
            raise ValueError("Instruction has no target; cannot locate anchor.")

        result = fuzzy.find_anchor(
            file_content = file_content,
            target       = instruction.target,
            line_hint    = instruction.line_hint,
        )
        if not result["found"]:
            raise ValueError(
                f"Could not locate target in file "
                f"(best score {result['score']:.2f} < threshold). "
                f"Target preview: {instruction.target[:80]!r}"
            )
        return result

    @staticmethod
    def _delete_span(file_content: str, span: str) -> str:
        """Remove `span` from `file_content`, cleaning up any leftover blank line."""
        idx = file_content.index(span)
        before = file_content[:idx]
        after  = file_content[idx + len(span):]

        # If the deletion leaves a blank line, remove it.
        if after.startswith("\n") and (before == "" or before.endswith("\n")):
            after = after[1:]

        return before + after

    @staticmethod
    def _detect_indent(file_content: str, anchor_line: int) -> str:
        """
        Read the 2 lines immediately above `anchor_line` (1-based) and
        return the leading whitespace of whichever has the deeper indent.
        Falls back to empty string if nothing useful is found.
        """
        lines = file_content.splitlines()

        # anchor_line is 1-based; convert to 0-based index.
        idx       = anchor_line - 1
        look_from = max(0, idx - 2)
        look_to   = idx  # exclusive

        candidates = lines[look_from:look_to]
        if not candidates:
            return ""

        def leading_ws(s: str) -> str:
            return s[: len(s) - len(s.lstrip())]

        # Pick the candidate with the most leading whitespace.
        return max((leading_ws(c) for c in candidates if c.strip()), key=len, default="")

    def _indent_block(
        self,
        new_block: str,
        file_content: str,
        anchor_line: int,
    ) -> str:
        """
        Apply context-detected indentation to `new_block`.

        Only lines that have *no* leading whitespace of their own get the
        detected prefix added — lines already indented are left untouched.
        This avoids double-indenting intentionally nested code.
        """
        base_indent = self._detect_indent(file_content, anchor_line)
        if not base_indent:
            return new_block

        result_lines = []
        for line in new_block.splitlines():
            if line and not line[0].isspace():
                result_lines.append(base_indent + line)
            else:
                result_lines.append(line)

        return "\n".join(result_lines)
