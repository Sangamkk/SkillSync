"""High-level certificate OCR processing."""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from extraction.ocr.cleaner import clean_text
    from extraction.ocr.reader import (
        SUPPORTED_DOCUMENT_EXTENSIONS,
        CertificateOcrReader,
        DocumentReader,
    )
else:
    from .cleaner import clean_text
    from .reader import SUPPORTED_DOCUMENT_EXTENSIONS, CertificateOcrReader, DocumentReader


def _extract_legacy_lines(result: object) -> list[dict[str, object]]:
    if not isinstance(result, list):
        return []

    lines: list[dict[str, object]] = []
    for page in result:
        if not isinstance(page, list):
            return []
        for item in page:
            try:
                lines.append(
                    {
                        "text": clean_text(str(item[1][0])),
                        "confidence": round(float(item[1][1]), 4),
                    }
                )
            except (IndexError, TypeError, ValueError):
                continue
    return lines


def _extract_modern_lines(result: object) -> list[dict[str, object]]:
    """Read text and scores from PaddleOCR 3.x prediction objects."""
    if hasattr(result, "json"):
        result = result.json
    if isinstance(result, str):
        try:
            result = json.loads(result)
        except json.JSONDecodeError:
            return []

    if isinstance(result, dict):
        texts = result.get("rec_texts")
        scores = result.get("rec_scores", [])
        if isinstance(texts, list):
            return [
                {
                    "text": clean_text(str(text)),
                    "confidence": round(float(scores[index]), 4) if index < len(scores) else None,
                }
                for index, text in enumerate(texts)
            ]
        return [line for value in result.values() for line in _extract_modern_lines(value)]

    if isinstance(result, list):
        return [line for value in result for line in _extract_modern_lines(value)]
    return []


def extract_lines(result: object) -> list[dict[str, object]]:
    """Normalize legacy and current PaddleOCR output into text/confidence records."""
    legacy_lines = _extract_legacy_lines(result)
    return legacy_lines or _extract_modern_lines(result)


def default_ocr_output_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "outputs" / "ocr"


def save_raw_ocr_result(
    certificate_path: str | Path,
    text: str,
    output_dir: str | Path | None = None,
) -> Path:
    """Save OCR text as ``outputs/ocr/<certificate-name>.txt`` for review."""
    source = Path(certificate_path)
    destination_dir = Path(output_dir) if output_dir is not None else default_ocr_output_dir()
    destination_dir.mkdir(parents=True, exist_ok=True)
    destination = destination_dir / f"{source.stem}.txt"
    destination.write_text(text, encoding="utf-8")
    return destination


def dataset_root() -> Path:
    return Path(__file__).resolve().parents[2] / "dataset"


def find_certificate_files(root: Path) -> list[Path]:
    return sorted(
        path
        for path in root.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_DOCUMENT_EXTENSIONS
    )


def sample_diverse_certificates(files: list[Path], size: int, seed: int | None) -> list[Path]:
    """Sample across source folders first, then fill the remaining sample randomly."""
    if size <= 0 or not files:
        return []

    randomizer = random.Random(seed)
    by_source: dict[str, list[Path]] = {}
    for path in files:
        by_source.setdefault(path.parent.name, []).append(path)

    selected = [randomizer.choice(by_source[source]) for source in sorted(by_source)]
    if len(selected) >= size:
        return sorted(randomizer.sample(selected, size))

    selected_set = set(selected)
    remaining = [path for path in files if path not in selected_set]
    selected.extend(randomizer.sample(remaining, min(size - len(selected), len(remaining))))
    return sorted(selected)


def average_confidence(result: dict[str, object]) -> float | None:
    scores = [
        detection["confidence"]
        for page in result["pages"]
        for detection in page["detections"]
        if detection["confidence"] is not None
    ]
    return sum(scores) / len(scores) if scores else None


def run_dataset_ocr(
    root: Path,
    *,
    sample_size: int = 25,
    seed: int | None = None,
    output_dir: Path | None = None,
) -> dict[str, object]:
    """Run OCR on a diverse dataset sample and return baseline-quality observations."""
    files = find_certificate_files(root)
    selected = sample_diverse_certificates(files, sample_size, seed)
    active_output_dir = output_dir or default_ocr_output_dir()
    reader: CertificateOcrReader | None = None
    document_reader: DocumentReader | None = None
    observations: list[dict[str, object]] = []

    for path in selected:
        print(f"Processing: {path.name}")
        try:
            reader = reader or CertificateOcrReader()
            document_reader = document_reader or DocumentReader()
            result = process_certificate(
                path,
                reader=reader,
                document_reader=document_reader,
                output_dir=active_output_dir,
            )
            confidence = average_confidence(result)
            text_extracted = bool(result["text"].strip())
            readable_text = bool(text_extracted and confidence is not None and confidence >= 0.70)
            observation = {
                "path": str(path),
                "text_extracted": text_extracted,
                "readable_text": readable_text,
                "missing_text": not text_extracted,
                "incorrect_text": "manual_review_required",
                "average_confidence": round(confidence, 4) if confidence is not None else None,
                "output_path": result["output_path"],
            }
            observations.append(observation)
            print("✓ OCR Completed")
            print(f"Text Saved: {result['output_path']}")
            print(f"Confidence: {(confidence or 0) * 100:.1f}%\n")
        except Exception as exc:
            observations.append(
                {
                    "path": str(path),
                    "text_extracted": False,
                    "readable_text": False,
                    "missing_text": True,
                    "incorrect_text": "manual_review_required",
                    "average_confidence": None,
                    "error": str(exc),
                }
            )
            print(f"✗ OCR Failed: {exc}\n")

    processed = len(observations)
    successful = sum(bool(item["text_extracted"]) for item in observations)
    report = {
        "sampled_certificates": processed,
        "ocr_success_rate": successful / processed if processed else 0.0,
        "readable_text_count": sum(bool(item["readable_text"]) for item in observations),
        "missing_text_count": sum(bool(item["missing_text"]) for item in observations),
        "incorrect_text": "Manual review required; ground-truth text is not available in the dataset metadata.",
        "observations": observations,
    }
    active_output_dir.mkdir(parents=True, exist_ok=True)
    report_path = active_output_dir / "ocr_test_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    report["report_path"] = str(report_path)
    return report


def process_certificate(
    path: str | Path,
    reader: CertificateOcrReader | None = None,
    document_reader: DocumentReader | None = None,
    *,
    save_output: bool = True,
    output_dir: str | Path | None = None,
) -> dict[str, object]:
    """Extract text and confidence scores from every page of a certificate.

    PDF and raster certificates use the same image-page OCR pipeline. Each page
    includes its recognized text lines and confidence scores.
    """
    active_reader = reader or CertificateOcrReader()
    active_document_reader = document_reader or DocumentReader()
    page_results: list[dict[str, object]] = []

    for number, image in enumerate(active_document_reader.read_pages(path), start=1):
        raw_result = active_reader.read_page(image)
        lines = extract_lines(raw_result)
        page_results.append(
            {
                "page_number": number,
                "text": "\n".join(line["text"] for line in lines),
                "detections": lines,
            }
        )

    result = {
        "path": str(Path(path)),
        "page_count": len(page_results),
        "text": "\n".join(page["text"] for page in page_results if page["text"]),
        "pages": page_results,
    }
    if save_output:
        result["output_path"] = str(save_raw_ocr_result(path, result["text"], output_dir))
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Run PaddleOCR on a dataset sample")
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=dataset_root(),
        help="Certificate dataset directory (default: dataset/)",
    )
    parser.add_argument(
        "--sample-size",
        type=int,
        default=25,
        help="Number of certificates to process, up to the available total (default: 25)",
    )
    parser.add_argument("--seed", type=int, help="Optional random seed for repeatable sampling")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=default_ocr_output_dir(),
        help="OCR text and report directory (default: outputs/ocr/)",
    )
    args = parser.parse_args()

    if args.sample_size < 1:
        parser.error("--sample-size must be at least 1")
    if not args.dataset_dir.is_dir():
        print(f"Dataset directory not found: {args.dataset_dir}", file=sys.stderr)
        return 1

    report = run_dataset_ocr(
        args.dataset_dir,
        sample_size=args.sample_size,
        seed=args.seed,
        output_dir=args.output_dir,
    )
    if not report["sampled_certificates"]:
        print("No PDF, PNG, JPG, or JPEG certificates found.")
        return 0

    print("========== OCR BASELINE ==========")
    print(f"OCR Success Rate: {report['ocr_success_rate'] * 100:.1f}%")
    print(f"Readable Text: {report['readable_text_count']}")
    print(f"Missing Text: {report['missing_text_count']}")
    print("Incorrect Text: manual review required")
    print(f"Report Saved: {report['report_path']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
