"""Shared OCR path and format utilities."""

from __future__ import annotations

from pathlib import Path


SUPPORTED_OCR_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}


def validate_certificate_path(path: str | Path) -> Path:
    """Return a supported certificate path or raise a clear error."""
    certificate = Path(path)
    if not certificate.is_file():
        raise FileNotFoundError(f"Certificate file not found: {certificate}")
    if certificate.suffix.lower() not in SUPPORTED_OCR_EXTENSIONS:
        raise ValueError(f"Unsupported certificate format: {certificate.suffix}")
    return certificate
