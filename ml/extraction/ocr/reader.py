"""PaddleOCR reader wrapper used by certificate extraction modules."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

from .utils import validate_certificate_path

SUPPORTED_DOCUMENT_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}


class DocumentReader:
    """Load a certificate as a sequence of page images.

    PDFs are rendered page-by-page with PyMuPDF. Raster certificates are returned
    as a one-item list, so downstream OCR can use one consistent interface.
    """

    def read_pages(self, path: str | Path) -> list[object]:
        certificate = Path(path)
        if not certificate.is_file():
            raise FileNotFoundError(f"Certificate file not found: {certificate}")

        suffix = certificate.suffix.lower()
        if suffix not in SUPPORTED_DOCUMENT_EXTENSIONS:
            supported = ", ".join(sorted(SUPPORTED_DOCUMENT_EXTENSIONS))
            raise ValueError(f"Unsupported file type '{suffix}'. Supported types: {supported}")

        if suffix == ".pdf":
            return self._read_pdf(certificate)
        return self._read_image(certificate)

    @staticmethod
    def _read_pdf(path: Path) -> list[object]:
        try:
            import fitz
            from PIL import Image
        except ImportError as exc:
            raise RuntimeError("Install OCR dependencies with: pip install -r requirements.txt") from exc

        pages: list[object] = []
        with fitz.open(path) as document:
            for page in document:
                pixmap = page.get_pixmap(alpha=False)
                with Image.open(BytesIO(pixmap.tobytes("png"))) as image:
                    pages.append(image.copy())
        return pages

    @staticmethod
    def _read_image(path: Path) -> list[object]:
        try:
            from PIL import Image
        except ImportError as exc:
            raise RuntimeError("Install OCR dependencies with: pip install -r requirements.txt") from exc

        with Image.open(path) as image:
            return [image.copy()]


def read_document(path: str | Path) -> list[object]:
    """Read a PDF or image certificate into a list of page images."""
    return DocumentReader().read_pages(path)


class CertificateOcrReader:
    """Lazily initialize PaddleOCR and read one certificate at a time."""

    def __init__(self, language: str = "en") -> None:
        try:
            from paddleocr import PaddleOCR
        except ImportError as exc:
            raise RuntimeError(
               "Install OCR dependencies with: pip install -r requirements.txt"
            ) from exc

    self._ocr = PaddleOCR(
        lang=language
    )

    def read(self, path: str | Path) -> object:
        """Run OCR on a supported certificate image or PDF."""
        certificate = validate_certificate_path(path)
        if hasattr(self._ocr, "ocr"):
            return self._ocr.ocr(str(certificate), cls=True)
        return list(self._ocr.predict(str(certificate)))

    def read_page(self, image: object) -> object:
        """Run OCR on one PIL page image returned by :class:`DocumentReader`."""
        try:
            import numpy as np
        except ImportError as exc:
            raise RuntimeError("Install OCR dependencies with: pip install -r requirements.txt") from exc

        page_array = np.array(image.convert("RGB"))
        if hasattr(self._ocr, "ocr"):
            return self._ocr.ocr(page_array, cls=True)
        return list(self._ocr.predict(page_array))
