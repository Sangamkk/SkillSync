"""Text normalization helpers for OCR output."""

from __future__ import annotations

import re


def clean_text(text: str) -> str:
    """Normalize whitespace while preserving the text recognized by OCR."""
    return re.sub(r"\s+", " ", text).strip()
