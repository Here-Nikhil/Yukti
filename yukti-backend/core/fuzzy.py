"""
core/fuzzy.py
─────────────
Finds anchor points inside file content when exact string matching fails.

Strategy (in order of priority):
  1. Exact substring match         → score 1.0
  2. Line-by-line Levenshtein via rapidfuzz → score = similarity ratio
     • If a line_hint is provided, search ±10 lines around it first, then
       fall back to the whole file so we never miss a distant match.
  3. If best score < 0.70 → return found=False (too risky to guess).
"""

from rapidfuzz import fuzz


# Minimum similarity ratio (0–1) to accept a fuzzy match.
THRESHOLD = 0.70

# When a line_hint is given, how many lines above/below to search first.
HINT_RADIUS = 10


class FuzzyMatcher:

    def find_anchor(
        self,
        file_content: str,
        target: str,
        line_hint: int | None = None,
    ) -> dict:
        """
        Locate `target` inside `file_content`.

        Parameters
        ----------
        file_content : full text of the source file
        target       : the snippet we're looking for (may be multi-line)
        line_hint    : 1-based line number hint from the LLM instruction

        Returns
        -------
        {
            "found":        bool,
            "line_number":  int,   # 1-based; -1 when not found
            "matched_text": str,   # the actual text that was matched
            "score":        float  # 0.0 – 1.0
        }
        """
        # ── 1. Exact substring match ──────────────────────────────────────────
        if target in file_content:
            # Find which 1-based line the match starts on.
            char_idx    = file_content.index(target)
            line_number = file_content[:char_idx].count("\n") + 1
            return {
                "found":        True,
                "line_number":  line_number,
                "matched_text": target,
                "score":        1.0,
            }

        # ── 2. Line-by-line fuzzy search ──────────────────────────────────────
        lines = file_content.splitlines()

        # The target might itself be multi-line; in that case we compare
        # windows of the same height. For single-line targets we compare
        # one line at a time.
        target_lines_raw = target.splitlines()
        target_lines     = [l for l in target_lines_raw if l.strip()]
        window_height    = max(len(target_lines_raw), 1)
        target_joined    = "\n".join(target_lines)

        best_score      = 0.0
        best_line_start = -1  # 0-based index into `lines`

        # Build the ordered list of candidate start indices so that,
        # when a hint is provided, we check the vicinity first.
        candidate_indices = list(range(len(lines) - window_height + 1))

        if line_hint is not None:
            # Convert 1-based hint to 0-based; clamp to valid range.
            hint_0 = max(0, line_hint - 1)
            lo     = max(0, hint_0 - HINT_RADIUS)
            hi     = min(len(lines) - window_height, hint_0 + HINT_RADIUS)
            nearby = list(range(lo, hi + 1))
            rest   = [i for i in candidate_indices if i not in set(nearby)]
            candidate_indices = nearby + rest

        for start_idx in candidate_indices:
            window_raw = lines[start_idx : start_idx + window_height]
            window = "\n".join(l for l in window_raw if l.strip())

            # token_set_ratio handles reordered / partially missing tokens
            # better than simple ratio for code snippets.
            if window_height == 1:
                score = fuzz.ratio(target_joined, window) / 100.0
            else:
                score = (
                    fuzz.ratio(target_joined, window)
                    + fuzz.partial_ratio(target_joined, window)
                ) / 200.0

            if score > best_score:
                best_score      = score
                best_line_start = start_idx

            # Short-circuit: can't do better than 1.0
            if best_score == 1.0:
                break

        import logging
        logging.warning(f"FUZZY DEBUG: best_score={best_score:.3f} best_line={best_line_start} target_preview={target_joined[:60]!r}")
        # ── 3. Threshold gate ─────────────────────────────────────────────────
        if best_score < THRESHOLD or best_line_start == -1:
            return {
                "found":        False,
                "line_number":  -1,
                "matched_text": "",
                "score":        best_score,
            }

        matched_text = "\n".join(lines[best_line_start : best_line_start + window_height])
        return {
            "found":        True,
            "line_number":  best_line_start + 1,  # convert to 1-based
            "matched_text": matched_text,
            "score":        best_score,
        }
