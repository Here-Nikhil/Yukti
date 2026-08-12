import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional

class Action(str, Enum):
    REPLACE = "replace"
    INSERT = "insert"
    DELETE = "delete"

class Confidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

@dataclass
class ParsedInstruction:
    file: Optional[str]
    action: Action
    target: Optional[str]
    replacement: Optional[str]
    line_hint: Optional[int]
    confidence: Confidence
    raw: str  # original LLM text that produced this instruction

class LLMOutputParser:
    
    def parse(self, llm_output: str, available_files: list[str]) -> list[ParsedInstruction]:
        """
        Main entry point. Takes raw LLM output and list of files in the project.
        Returns a list of ParsedInstruction objects.
        """
        instructions = []

        # Try each format in order of specificity
        # Unified diff is most specific, free text is least
        if self._looks_like_unified_diff(llm_output):
            instructions = self._parse_unified_diff(llm_output)
        else:
            # Split output into chunks — LLM may give multiple instructions
            chunks = self._split_into_chunks(llm_output)
            for chunk in chunks:
                instruction = self._parse_chunk(chunk, available_files)
                if instruction:
                    instructions.append(instruction)

        # Resolve file references against actual project files
        for instruction in instructions:
            instruction.file = self._resolve_file(instruction.file, available_files)

        import logging
        for inst in instructions:
            logging.warning(f"PARSER DEBUG: file={inst.file} action={inst.action} target_preview={str(inst.target)[:60]!r} replacement_preview={str(inst.replacement)[:60]!r}")

        return instructions

    # ─── Format Detectors ────────────────────────────────────────────────

    def _looks_like_unified_diff(self, text: str) -> bool:
        return "--- a/" in text or "+++ b/" in text or text.strip().startswith("@@")

    def _looks_like_line_reference(self, text: str) -> bool:
        patterns = [
            r"line[s]?\s+\d+",
            r"at line \d+",
            r"on line \d+",
            r"line \d+[-–]\d+",
        ]
        return any(re.search(p, text, re.IGNORECASE) for p in patterns)

    def _looks_like_replace_block(self, text: str) -> bool:
        patterns = [
            r"replace.+with",
            r"change.+to",
            r"swap.+for",
            r"instead of",
        ]
        return any(re.search(p, text, re.IGNORECASE) for p in patterns)

    def _looks_like_insert(self, text: str) -> bool:
        patterns = [
            r"add.+above",
            r"add.+below",
            r"insert.+before",
            r"insert.+after",
            r"add this function",
            r"add the following",
        ]
        return any(re.search(p, text, re.IGNORECASE) for p in patterns)

    # ─── Chunk Splitter ───────────────────────────────────────────────────

    def _split_into_chunks(self, text: str) -> list[str]:
        """
        LLM output often contains multiple instructions separated by
        numbered lists, blank lines, or headings. Split them.
        """
        # If the whole text contains exactly one code block, treat as single chunk
        fence_count = text.count("```")
        if fence_count >= 2:
            return [text.strip()]

        # Split on numbered list items: "1.", "2.", etc.
        numbered = re.split(r'\n(?=\d+\.)', text)
        if len(numbered) > 1:
            return [c.strip() for c in numbered if c.strip()]

        # Split on double newlines but re-join if a code block spans the boundary
        paragraphs = re.split(r'\n{2,}', text)
        if len(paragraphs) > 1:
            merged = []
            buffer = ""
            in_code_block = False
            for para in paragraphs:
                toggles = para.count("```")
                if in_code_block:
                    buffer = buffer + "\n\n" + para
                    if toggles % 2 == 1:
                        in_code_block = False
                        merged.append(buffer.strip())
                        buffer = ""
                else:
                    if toggles % 2 == 1:
                        in_code_block = True
                        buffer = para
                    else:
                        if para.strip():
                            # If this paragraph has no code block but next might,
                            # buffer it to merge with the next paragraph
                            if not merged or "```" in merged[-1]:
                                merged.append(para.strip())
                            else:
                                merged[-1] = merged[-1] + "\n\n" + para.strip()
            if buffer.strip():
                merged.append(buffer.strip())
            return merged if merged else [text.strip()]

        # Single instruction
        return [text.strip()]

    # ─── Per-Chunk Parser ─────────────────────────────────────────────────

    def _parse_chunk(self, chunk: str, available_files: list[str]) -> Optional[ParsedInstruction]:
        file_hint = self._extract_file_hint(chunk, available_files)
        line_hint = self._extract_line_hint(chunk)
        code_blocks = self._extract_code_blocks(chunk)

        if self._looks_like_unified_diff(chunk):
            return self._parse_unified_diff(chunk)[0] if chunk else None

        if self._looks_like_replace_block(chunk):
            return self._parse_replace_block(chunk, file_hint, line_hint, code_blocks)

        if self._looks_like_insert(chunk):
            return self._parse_insert_block(chunk, file_hint, line_hint, code_blocks)

        if self._looks_like_line_reference(chunk) and code_blocks:
            return self._parse_line_reference(chunk, file_hint, line_hint, code_blocks)

        # Fallback: if there's a code block, treat as a replace with low confidence
        if code_blocks:
            return ParsedInstruction(
                file=file_hint,
                action=Action.REPLACE,
                target=None,
                replacement=code_blocks[0],
                line_hint=line_hint,
                confidence=Confidence.LOW,
                raw=chunk
            )

        return None

    # ─── Format-Specific Parsers ──────────────────────────────────────────

    def _parse_unified_diff(self, text: str) -> list[ParsedInstruction]:
        instructions = []
        # Match diff hunks
        hunk_pattern = re.compile(
            r'--- a/(.+?)\n\+\+\+ b/(.+?)\n((?:@@.+?@@\n(?:[ +\-].*\n?)*)+)',
            re.MULTILINE
        )
        for match in hunk_pattern.finditer(text):
            file_path = match.group(2)
            hunk_body = match.group(3)

            removed_lines = [l[1:] for l in hunk_body.splitlines() if l.startswith('-') and not l.startswith('---')]
            added_lines = [l[1:] for l in hunk_body.splitlines() if l.startswith('+') and not l.startswith('+++')]

            line_match = re.search(r'@@ -(\d+)', hunk_body)
            line_hint = int(line_match.group(1)) if line_match else None

            instructions.append(ParsedInstruction(
                file=file_path,
                action=Action.REPLACE,
                target='\n'.join(removed_lines),
                replacement='\n'.join(added_lines),
                line_hint=line_hint,
                confidence=Confidence.HIGH,
                raw=text
            ))
        return instructions

    def _parse_replace_block(self, chunk: str, file_hint, line_hint, code_blocks) -> ParsedInstruction:
        # Try to extract "replace X with Y" explicitly
        pattern = re.search(
            r'replace[:\s]+(.+?)\s+with[:\s]+(.+)',
            chunk, re.IGNORECASE | re.DOTALL
        )
        if pattern and not code_blocks:
            return ParsedInstruction(
                file=file_hint,
                action=Action.REPLACE,
                target=pattern.group(1).strip(),
                replacement=pattern.group(2).strip(),
                line_hint=line_hint,
                confidence=Confidence.MEDIUM,
                raw=chunk
            )

        # If there are two code blocks, first is target, second is replacement
        if len(code_blocks) >= 2:
            return ParsedInstruction(
                file=file_hint,
                action=Action.REPLACE,
                target=code_blocks[0],
                replacement=code_blocks[1],
                line_hint=line_hint,
                confidence=Confidence.HIGH,
                raw=chunk
            )

        # Only one code block — replacement is known, target must be fuzzy matched
        if len(code_blocks) == 1:
            return ParsedInstruction(
                file=file_hint,
                action=Action.REPLACE,
                target=None,
                replacement=code_blocks[0],
                line_hint=line_hint,
                confidence=Confidence.MEDIUM,
                raw=chunk
            )

        return ParsedInstruction(
            file=file_hint,
            action=Action.REPLACE,
            target=None,
            replacement=None,
            line_hint=line_hint,
            confidence=Confidence.LOW,
            raw=chunk
        )

    def _parse_insert_block(self, chunk: str, file_hint, line_hint, code_blocks) -> ParsedInstruction:
        # Determine insert position from text
        position_above = re.search(r'above|before', chunk, re.IGNORECASE)

        # The anchor (what to insert above/below) is often mentioned by name
        anchor_match = re.search(
            r'(?:above|below|before|after)\s+(?:the\s+)?[`"]?(\w+)[`"]?',
            chunk, re.IGNORECASE
        )
        anchor = anchor_match.group(1) if anchor_match else None

        return ParsedInstruction(
            file=file_hint,
            action=Action.INSERT,
            target=anchor,  # fuzzy.py will find this in the file
            replacement=code_blocks[0] if code_blocks else None,
            line_hint=line_hint,
            confidence=Confidence.MEDIUM if anchor else Confidence.LOW,
            raw=chunk
        )

    def _parse_line_reference(self, chunk: str, file_hint, line_hint, code_blocks) -> ParsedInstruction:
        return ParsedInstruction(
            file=file_hint,
            action=Action.REPLACE,
            target=None,  # fuzzy.py will use line_hint to find it
            replacement=code_blocks[0] if code_blocks else None,
            line_hint=line_hint,
            confidence=Confidence.HIGH if line_hint else Confidence.MEDIUM,
            raw=chunk
        )

    # ─── Helpers ──────────────────────────────────────────────────────────

    def _extract_code_blocks(self, text: str) -> list[str]:
        import logging
        logging.warning(f"CODE BLOCK DEBUG: fence_count={text.count('```')} text_preview={text[:120]!r}")

        # Fenced code blocks: ```lang\n...\n```
        fenced = re.findall(r'```(?:\w+)?[ \t]*\n(.*?)```', text, re.DOTALL)
        if not fenced:
            fenced = re.findall(r'```[ \t]*\n(.*?)```', text, re.DOTALL)
        if fenced:
            return [b.rstrip() for b in fenced]

        # No backticks — split on section headers first
        section_split = re.split(
            r'\n?(?:find this|replace with|original|updated?|before|after)\s*(?:in\s+[\w/\-\.]+)?\s*:\s*\n',
            text, flags=re.IGNORECASE
        )
        if len(section_split) >= 3:
            blocks = []
            for section in section_split[1:]:
                code = re.sub(
                    r'^(?:python|javascript|typescript|js|ts|css|sql|go|rust|java|bash|sh|json|yaml|html)\s*\n',
                    '', section.strip(), flags=re.IGNORECASE
                )
                if code.strip():
                    blocks.append(code.strip())
            if len(blocks) >= 2:
                return blocks

        # Fallback: language-tagged blocks
        lang_block = re.findall(
            r'^(?:python|javascript|typescript|js|ts|css|sql|go|rust|java|bash|sh|json|yaml|html)\s*\n(.*?)(?=\n(?:python|javascript|typescript|js|ts|css|sql|go|rust|java|bash|sh|json|yaml|html)\s*\n|\Z)',
            text, re.DOTALL | re.IGNORECASE | re.MULTILINE
        )
        if lang_block:
            return [b.strip() for b in lang_block if b.strip()]

        # Inline single backticks
        inline = re.findall(r'`([^`]+)`', text)
        return [i.strip() for i in inline] if inline else []

    def _extract_line_hint(self, text: str) -> Optional[int]:
        match = re.search(r'line[s]?\s+(\d+)', text, re.IGNORECASE)
        return int(match.group(1)) if match else None

    def _extract_file_hint(self, text: str, available_files: list[str]) -> Optional[str]:
        # Look for explicit file paths mentioned in text
        path_pattern = re.search(
            r'(?:in|file|modify|update|edit)\s+[`"]?([\w/\-\.]+\.\w+)[`"]?',
            text, re.IGNORECASE
        )
        if path_pattern:
            return path_pattern.group(1)

        # Look for any string that matches an available file name
        for f in available_files:
            filename = f.split('/')[-1]
            if filename in text:
                return f

        return None

    def _resolve_file(self, file_hint: Optional[str], available_files: list[str]) -> Optional[str]:
        if not file_hint:
            return None

        # Exact match
        if file_hint in available_files:
            return file_hint

        # Match by filename only (ignore path)
        for f in available_files:
            if f.endswith(file_hint) or f.split('/')[-1] == file_hint.split('/')[-1]:
                return f

        # No match — fuzzy.py will handle this
        return file_hint