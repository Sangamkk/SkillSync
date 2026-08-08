#!/usr/bin/env python3
"""Analyze certificate dataset: file counts, formats, and platform breakdown."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

SUPPORTED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}
GROUPS = ("genuine", "fake")

FOLDER_TO_PLATFORM = {
    "coursera": "Coursera",
    "udemy": "Udemy",
    "google": "Google",
    "ibm": "IBM",
    "microsoft": "Microsoft",
    "aws": "AWS",
    "cisco": "Cisco",
    "linkedin": "LinkedIn",
    "nptel": "NPTEL",
    "others": "Others",
}

KNOWN_PLATFORMS = (
    "Coursera",
    "Udemy",
    "Google",
    "IBM",
    "Microsoft",
    "AWS",
    "Cisco",
    "LinkedIn",
    "NPTEL",
)

OCR_METADATA_FIELDS = {
    "name": ("name", "recipient_name", "learner_name"),
    "organization": ("organization", "issuer", "platform"),
    "course": ("course", "course_name", "program", "title"),
}


def project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def dataset_root() -> Path:
    return project_root() / "dataset"


def reports_dir() -> Path:
    return project_root() / "reports"


def is_certificate_file(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS


def scan_dataset(root: Path) -> dict[str, dict[str, list[Path]]]:
    layout: dict[str, dict[str, list[Path]]] = {group: {} for group in GROUPS}

    for group in GROUPS:
        group_path = root / group
        if not group_path.is_dir():
            continue
        for subfolder in sorted(group_path.iterdir()):
            if not subfolder.is_dir():
                continue
            files = sorted(path for path in subfolder.iterdir() if is_certificate_file(path))
            layout[group][subfolder.name] = files

    return layout


def load_metadata(path: Path) -> list[dict[str, str]]:
    if not path.is_file():
        return []

    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        return [dict(row) for row in reader]


def metadata_platform_lookup(rows: list[dict[str, str]]) -> dict[str, str]:
    lookup: dict[str, str] = {}
    for row in rows:
        filename = row.get("filename", "").strip()
        platform = row.get("platform", "").strip()
        if filename and platform:
            lookup[filename] = platform
    return lookup


def platform_for_file(
    path: Path,
    group: str,
    subfolder: str,
    metadata_lookup: dict[str, str],
) -> str:
    if path.name in metadata_lookup:
        return metadata_lookup[path.name]

    if group == "genuine":
        return FOLDER_TO_PLATFORM.get(subfolder, "Others")

    return "Others"


def sort_platforms(platform_counts: dict[str, int]) -> list[tuple[str, int]]:
    known = {name: platform_counts[name] for name in KNOWN_PLATFORMS if name in platform_counts}
    others = platform_counts.get("Others", 0)
    extra = {
        name: count
        for name, count in platform_counts.items()
        if name not in KNOWN_PLATFORMS and name != "Others"
    }

    ordered: list[tuple[str, int]] = []
    for name in KNOWN_PLATFORMS:
        if name in known:
            ordered.append((name, known[name]))

    for name in sorted(extra):
        ordered.append((name, extra[name]))

    if others:
        ordered.append(("Others", others))

    return ordered


def iter_certificate_files(layout: dict[str, dict[str, list[Path]]]) -> list[Path]:
    files: list[Path] = []
    for subfolders in layout.values():
        for paths in subfolders.values():
            files.extend(paths)
    return sorted(files)


def relative_dataset_path(path: Path, root: Path) -> str:
    return path.relative_to(root.parent).as_posix()


def check_image(path: Path) -> str | None:
    try:
        from PIL import Image
    except ImportError:
        return "Pillow is not installed (pip install Pillow)"

    try:
        with Image.open(path) as img:
            img.verify()
        with Image.open(path) as img:
            img.load()
        return None
    except Exception as exc:
        return str(exc)


def check_pdf(path: Path) -> str | None:
    try:
        from pypdf import PdfReader
    except ImportError:
        return "pypdf is not installed (pip install pypdf)"

    try:
        reader = PdfReader(str(path), strict=True)
        if len(reader.pages) == 0:
            return "PDF has no pages"
        return None
    except Exception as exc:
        return str(exc)


def find_corrupted_files(
    layout: dict[str, dict[str, list[Path]]],
    root: Path,
) -> list[dict[str, str]]:
    corrupted: list[dict[str, str]] = []

    for path in iter_certificate_files(layout):
        suffix = path.suffix.lower()
        if suffix == ".pdf":
            error = check_pdf(path)
        elif suffix in IMAGE_EXTENSIONS:
            error = check_image(path)
        else:
            continue

        if error:
            corrupted.append(
                {
                    "path": relative_dataset_path(path, root),
                    "error": error,
                }
            )

    return corrupted


def file_hash(path: Path, *, algorithm: str = "sha256") -> str:
    """Return a content hash without loading the entire file into memory."""
    digest = hashlib.new(algorithm)
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def find_duplicate_files(
    layout: dict[str, dict[str, list[Path]]],
    root: Path,
) -> list[dict[str, object]]:
    """Group certificate files whose SHA-256 content hashes are identical."""
    files_by_hash: dict[str, list[Path]] = {}

    for path in iter_certificate_files(layout):
        try:
            digest = file_hash(path)
        except OSError:
            # Unreadable files are already reported by the corruption check.
            continue
        files_by_hash.setdefault(digest, []).append(path)

    return [
        {
            "sha256": digest,
            "files": [relative_dataset_path(path, root) for path in paths],
        }
        for digest, paths in sorted(files_by_hash.items())
        if len(paths) > 1
    ]


def image_resolution_summary(
    layout: dict[str, dict[str, list[Path]]],
) -> dict[str, object]:
    """Calculate image-certificate dimensions, ignoring unreadable files."""
    try:
        from PIL import Image
    except ImportError:
        return {"count": 0, "error": "Pillow is not installed (pip install Pillow)"}

    dimensions: list[tuple[int, int]] = []
    for path in iter_certificate_files(layout):
        if path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        try:
            with Image.open(path) as image:
                dimensions.append(image.size)
        except Exception:
            # Corrupted images are listed separately in the corruption report.
            continue

    if not dimensions:
        return {"count": 0}

    widths, heights = zip(*dimensions)
    return {
        "count": len(dimensions),
        "minimum": {"width": min(widths), "height": min(heights)},
        "maximum": {"width": max(widths), "height": max(heights)},
        "average": {
            "width": round(sum(widths) / len(widths)),
            "height": round(sum(heights) / len(heights)),
        },
    }


def normalize_text(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", value.casefold()))


def metadata_value(row: dict[str, str], field: str) -> str:
    for key in OCR_METADATA_FIELDS[field]:
        value = row.get(key, "").strip()
        if value:
            return value
    return ""


def text_contains(text: str, value: str) -> bool:
    normalized_value = normalize_text(value)
    return bool(normalized_value and normalized_value in normalize_text(text))


def labeled_value_found(text: str, labels: tuple[str, ...]) -> bool:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for index, line in enumerate(lines):
        normalized = normalize_text(line)
        if any(label in normalized for label in labels):
            remainder = re.sub(r"(?i).*?(?:" + "|".join(labels) + r")\s*[:\-]?\s*", "", line)
            if normalize_text(remainder):
                return True
            if index + 1 < len(lines) and normalize_text(lines[index + 1]):
                return True
    return False


def evaluate_ocr_fields(
    text: str,
    metadata_row: dict[str, str],
    platform: str,
) -> dict[str, bool]:
    """Evaluate OCR text against metadata when available, otherwise use labels."""
    name = metadata_value(metadata_row, "name")
    organization = metadata_value(metadata_row, "organization") or platform
    course = metadata_value(metadata_row, "course")

    return {
        "text_extracted": bool(normalize_text(text)),
        "name_found": text_contains(text, name)
        if name
        else labeled_value_found(text, ("name", "presented to", "certifies that", "awarded to")),
        "organization_found": text_contains(text, organization)
        if organization and organization != "Others"
        else labeled_value_found(text, ("organization", "issuer", "institution")),
        "course_found": text_contains(text, course)
        if course
        else labeled_value_found(text, ("course", "program", "completed")),
    }


def extract_v2_paddle_text(result: object) -> str:
    texts: list[str] = []
    for page in result or []:
        for line in page or []:
            try:
                texts.append(str(line[1][0]))
            except (IndexError, TypeError):
                continue
    return "\n".join(texts)


def collect_recognized_text(value: object) -> list[str]:
    """Extract recognized text from PaddleOCR 3.x result dictionaries."""
    if isinstance(value, dict):
        texts: list[str] = []
        for key, item in value.items():
            if key in {"rec_texts", "texts"} and isinstance(item, list):
                texts.extend(str(text) for text in item)
            else:
                texts.extend(collect_recognized_text(item))
        return texts
    if isinstance(value, list):
        return [text for item in value for text in collect_recognized_text(item)]
    return []


def ocr_input(path: Path) -> object:
    if path.suffix.lower() != ".pdf":
        return str(path)

    try:
        import fitz
        import numpy as np
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError("PyMuPDF, NumPy, and Pillow are required to OCR PDF files") from exc

    with fitz.open(path) as document:
        if not document.page_count:
            raise RuntimeError("PDF has no pages")
        pixmap = document[0].get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
        return np.array(image)


def run_ocr_quality_check(
    layout: dict[str, dict[str, list[Path]]],
    root: Path,
    metadata_rows: list[dict[str, str]],
    *,
    sample_size: int,
    seed: int | None,
) -> list[dict[str, object]]:
    files = iter_certificate_files(layout)
    selected = random.Random(seed).sample(files, k=min(sample_size, len(files)))
    metadata_by_filename = {row.get("filename", "").strip(): row for row in metadata_rows}

    if not selected:
        return []

    try:
        from paddleocr import PaddleOCR
    except ImportError:
        return [
            {
                "path": relative_dataset_path(path, root),
                "text_extracted": False,
                "name_found": False,
                "organization_found": False,
                "course_found": False,
                "error": "PaddleOCR is not installed (pip install -r requirements.txt)",
            }
            for path in selected
        ]

    try:
        engine = PaddleOCR(lang="en", use_angle_cls=True, show_log=False)
    except TypeError:
        engine = PaddleOCR(lang="en")

    results: list[dict[str, object]] = []
    for path in selected:
        group = path.parent.parent.name
        subfolder = path.parent.name
        platform = platform_for_file(path, group, subfolder, metadata_platform_lookup(metadata_rows))
        entry: dict[str, object] = {"path": relative_dataset_path(path, root)}
        try:
            source = ocr_input(path)
            if hasattr(engine, "ocr"):
                text = extract_v2_paddle_text(engine.ocr(source, cls=True))
            else:
                raw_results = []
                for item in engine.predict(source):
                    data = getattr(item, "json", item)
                    if isinstance(data, str):
                        data = json.loads(data)
                    raw_results.append(data)
                text = "\n".join(collect_recognized_text(raw_results))
            entry.update(evaluate_ocr_fields(text, metadata_by_filename.get(path.name, {}), platform))
        except Exception as exc:
            entry.update(
                {
                    "text_extracted": False,
                    "name_found": False,
                    "organization_found": False,
                    "course_found": False,
                    "error": str(exc),
                }
            )
        results.append(entry)

    return results


def render_corrupted(corrupted: list[dict[str, str]]) -> str:
    lines = ["", "Corrupted:", ""]

    if not corrupted:
        lines.append("(none)")
        return "\n".join(lines) + "\n"

    for entry in corrupted:
        lines.append(entry["path"])
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def render_duplicates(duplicates: list[dict[str, object]]) -> str:
    lines = ["", "Duplicate Files", ""]

    if not duplicates:
        lines.append("(none)")
        return "\n".join(lines) + "\n"

    for group in duplicates:
        for path in group["files"]:
            lines.append(str(path))
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def render_image_resolution(resolution: dict[str, object]) -> str:
    lines = ["", "Image Resolution", ""]

    if resolution.get("error"):
        lines.append(str(resolution["error"]))
    elif not resolution["count"]:
        lines.append("(no image certificates found)")
    else:
        for label, key in (("Min", "minimum"), ("Max", "maximum"), ("Average", "average")):
            size = resolution[key]
            lines.append(f"{label} : {size['width']} × {size['height']}")

    return "\n".join(lines) + "\n"


def build_summary(
    layout: dict[str, dict[str, list[Path]]],
    metadata_rows: list[dict[str, str]],
) -> dict:
    metadata_lookup = metadata_platform_lookup(metadata_rows)

    total_genuine = 0
    total_fake = 0
    total_pdfs = 0
    total_images = 0
    by_platform: Counter[str] = Counter()
    by_subfolder: dict[str, dict[str, int]] = {group: {} for group in GROUPS}

    files_on_disk: list[str] = []
    disk_set: set[str] = set()

    for group, subfolders in layout.items():
        group_total = 0
        for subfolder, paths in subfolders.items():
            by_subfolder[group][subfolder] = len(paths)
            group_total += len(paths)

            for path in paths:
                files_on_disk.append(path.name)
                disk_set.add(path.name)

                suffix = path.suffix.lower()
                if suffix == ".pdf":
                    total_pdfs += 1
                elif suffix in IMAGE_EXTENSIONS:
                    total_images += 1

                platform = platform_for_file(path, group, subfolder, metadata_lookup)
                by_platform[platform] += 1

        if group == "genuine":
            total_genuine = group_total
        else:
            total_fake = group_total

    metadata_filenames = [row.get("filename", "").strip() for row in metadata_rows]
    metadata_set = {name for name in metadata_filenames if name}

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_genuine": total_genuine,
        "total_fake": total_fake,
        "total_pdfs": total_pdfs,
        "total_images": total_images,
        "by_platform": dict(by_platform),
        "by_subfolder": by_subfolder,
        "totals": {
            "files_on_disk": len(files_on_disk),
            "metadata_rows": len(metadata_rows),
        },
        "coverage": {
            "on_disk_not_in_metadata": sorted(disk_set - metadata_set),
            "in_metadata_not_on_disk": sorted(metadata_set - disk_set),
        },
    }


def attach_corruption_report(summary: dict, corrupted: list[dict[str, str]]) -> dict:
    summary["corrupted_files"] = corrupted
    summary["corrupted_count"] = len(corrupted)
    return summary


def attach_duplicate_report(summary: dict, duplicates: list[dict[str, object]]) -> dict:
    summary["duplicate_groups"] = duplicates
    summary["duplicate_file_count"] = sum(len(group["files"]) for group in duplicates)
    return summary


def attach_resolution_report(summary: dict, resolution: dict[str, object]) -> dict:
    summary["image_resolution"] = resolution
    return summary


def attach_ocr_quality_report(summary: dict, results: list[dict[str, object]]) -> dict:
    summary["ocr_quality_check"] = {
        "sampled_certificates": len(results),
        "text_extracted_count": sum(bool(result["text_extracted"]) for result in results),
        "name_found_count": sum(bool(result["name_found"]) for result in results),
        "organization_found_count": sum(bool(result["organization_found"]) for result in results),
        "course_found_count": sum(bool(result["course_found"]) for result in results),
        "results": results,
    }
    return summary


def render_summary(summary: dict) -> str:
    lines = [
        "========== DATASET SUMMARY ==========",
        "",
        f"Total Genuine : {summary['total_genuine']}",
        f"Total Fake : {summary['total_fake']}",
        f"Total PDFs : {summary['total_pdfs']}",
        f"Total Images : {summary['total_images']}",
        "",
    ]

    platform_counts = summary["by_platform"]
    if platform_counts:
        for platform, count in sort_platforms(platform_counts):
            lines.append(f"{platform} : {count}")
    else:
        lines.append("(no certificates found)")

    return "\n".join(lines) + "\n"


def render_ocr_quality_check(results: list[dict[str, object]]) -> str:
    lines = ["", "OCR Quality Check", ""]
    if not results:
        lines.append("(no certificates sampled)")
        return "\n".join(lines) + "\n"

    for result in results:
        lines.append(str(result["path"]))
        lines.append(f"  Text extracted : {'Yes' if result['text_extracted'] else 'No'}")
        lines.append(f"  Name found : {'Yes' if result['name_found'] else 'No'}")
        lines.append(f"  Organization found : {'Yes' if result['organization_found'] else 'No'}")
        lines.append(f"  Course found : {'Yes' if result['course_found'] else 'No'}")
        if result.get("error"):
            lines.append(f"  Error : {result['error']}")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def render_report(
    summary: dict,
    corrupted: list[dict[str, str]],
    duplicates: list[dict[str, object]],
    resolution: dict[str, object],
    ocr_results: list[dict[str, object]],
    *,
    verbose: bool,
) -> str:
    if verbose:
        text = render_verbose(summary).rstrip()
    else:
        text = render_summary(summary).rstrip()

    return (
        text
        + render_corrupted(corrupted)
        + render_duplicates(duplicates)
        + render_image_resolution(resolution)
        + render_ocr_quality_check(ocr_results)
    )


def render_verbose(summary: dict) -> str:
    lines = [
        render_summary(summary).rstrip(),
        "",
        "========== DETAILED BREAKDOWN ==========",
        "",
    ]

    for group in GROUPS:
        lines.append(group.capitalize())
        subfolders = summary["by_subfolder"].get(group, {})
        for name, count in sorted(subfolders.items()):
            lines.append(f"  {name}: {count}")
        lines.append("")

    coverage = summary["coverage"]
    lines.append("Coverage gaps")
    lines.append(f"  On disk, missing from metadata: {len(coverage['on_disk_not_in_metadata'])}")
    for name in coverage["on_disk_not_in_metadata"]:
        lines.append(f"    - {name}")
    lines.append(f"  In metadata, missing on disk: {len(coverage['in_metadata_not_on_disk'])}")
    for name in coverage["in_metadata_not_on_disk"]:
        lines.append(f"    - {name}")

    return "\n".join(lines) + "\n"


def markdown_table(rows: list[tuple[str, str]], headers: tuple[str, str]) -> list[str]:
    lines = [f"| {headers[0]} | {headers[1]} |", "| --- | ---: |"]
    lines.extend(f"| {name} | {value} |" for name, value in rows)
    return lines


def build_markdown_report(summary: dict) -> str:
    """Render the current dataset analysis as project-documentation Markdown."""
    lines = [
        "# Dataset Report",
        "",
        f"Generated: {summary['generated_at']}",
        "",
        "## Overview",
        "",
        f"- Total samples: {summary['totals']['files_on_disk']}",
        f"- PDF samples: {summary['total_pdfs']}",
        f"- Image samples: {summary['total_images']}",
        "",
        "## Class Distribution",
        "",
    ]
    lines.extend(
        markdown_table(
            [("Genuine", str(summary["total_genuine"])), ("Fake", str(summary["total_fake"]))],
            ("Class", "Samples"),
        )
    )

    lines.extend(["", "## Platform Distribution", ""])
    platforms = sort_platforms(summary["by_platform"])
    if platforms:
        lines.extend(markdown_table([(name, str(count)) for name, count in platforms], ("Platform", "Samples")))
    else:
        lines.append("No certificate samples found.")

    lines.extend(["", "## Corrupted Files", ""])
    corrupted = summary["corrupted_files"]
    if corrupted:
        lines.extend(f"- `{entry['path']}`" for entry in corrupted)
    else:
        lines.append("No corrupted files detected.")

    lines.extend(["", "## Duplicate Files", ""])
    duplicates = summary["duplicate_groups"]
    if duplicates:
        for index, group in enumerate(duplicates, start=1):
            lines.append(f"Duplicate group {index} (SHA-256: `{group['sha256']}`):")
            lines.extend(f"- `{path}`" for path in group["files"])
            lines.append("")
    else:
        lines.append("No duplicate files detected.")

    lines.extend(["", "## Image Resolution", ""])
    resolution = summary["image_resolution"]
    if resolution.get("error"):
        lines.append(str(resolution["error"]))
    elif not resolution["count"]:
        lines.append("No image certificates found.")
    else:
        for label, key in (("Minimum", "minimum"), ("Maximum", "maximum"), ("Average", "average")):
            size = resolution[key]
            lines.append(f"- {label}: {size['width']} x {size['height']}")

    lines.extend(["", "## OCR Observations", ""])
    ocr = summary["ocr_quality_check"]
    if not ocr["sampled_certificates"]:
        lines.append("No certificates were sampled for OCR.")
    else:
        lines.extend(
            [
                f"- Sampled certificates: {ocr['sampled_certificates']}",
                f"- Text extracted: {ocr['text_extracted_count']}",
                f"- Names found: {ocr['name_found_count']}",
                f"- Organizations found: {ocr['organization_found_count']}",
                f"- Courses found: {ocr['course_found_count']}",
                "",
                "| Certificate | Text extracted | Name | Organization | Course |",
                "| --- | :---: | :---: | :---: | :---: |",
            ]
        )
        for result in ocr["results"]:
            yes_no = lambda value: "Yes" if value else "No"
            lines.append(
                "| `{path}` | {text} | {name} | {organization} | {course} |".format(
                    path=result["path"],
                    text=yes_no(result["text_extracted"]),
                    name=yes_no(result["name_found"]),
                    organization=yes_no(result["organization_found"]),
                    course=yes_no(result["course_found"]),
                )
            )
        errors = [result for result in ocr["results"] if result.get("error")]
        if errors:
            lines.extend(["", "OCR errors:"])
            lines.extend(f"- `{result['path']}`: {result['error']}" for result in errors)

    return "\n".join(lines).rstrip() + "\n"


def save_markdown_report(summary: dict, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(build_markdown_report(summary), encoding="utf-8")
    return path


def save_report(summary: dict, text: str, output_dir: Path) -> tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = output_dir / f"dataset_summary_{stamp}.json"
    text_path = output_dir / f"dataset_summary_{stamp}.txt"

    json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    text_path.write_text(text, encoding="utf-8")
    return json_path, text_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze the certificate dataset")
    parser.add_argument(
        "--save",
        action="store_true",
        help="Write report files to reports/",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Include subfolder and metadata coverage details",
    )
    parser.add_argument(
        "--skip-corruption",
        action="store_true",
        help="Skip corrupted file checks",
    )
    parser.add_argument(
        "--skip-duplicates",
        action="store_true",
        help="Skip duplicate file checks",
    )
    parser.add_argument(
        "--skip-resolution",
        action="store_true",
        help="Skip image resolution analysis",
    )
    parser.add_argument(
        "--skip-ocr",
        action="store_true",
        help="Skip the PaddleOCR quality check",
    )
    parser.add_argument(
        "--ocr-sample-size",
        type=int,
        default=20,
        help="Number of random certificates to check with PaddleOCR (default: 20)",
    )
    parser.add_argument(
        "--ocr-seed",
        type=int,
        help="Optional random seed for repeatable OCR sampling",
    )
    parser.add_argument(
        "--markdown-report-path",
        type=Path,
        default=reports_dir() / "dataset_report.md",
        help="Markdown dataset report path (default: reports/dataset_report.md)",
    )
    parser.add_argument(
        "--no-markdown-report",
        action="store_true",
        help="Do not write the Markdown dataset report",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=reports_dir(),
        help="Directory for saved reports (default: reports/)",
    )
    args = parser.parse_args()

    root = dataset_root()
    if not root.is_dir():
        print(f"Dataset root not found: {root}", file=sys.stderr)
        return 1
    if args.ocr_sample_size < 0:
        parser.error("--ocr-sample-size must be zero or greater")

    layout = scan_dataset(root)
    metadata_rows = load_metadata(root / "metadata.csv")
    summary = build_summary(layout, metadata_rows)
    corrupted = [] if args.skip_corruption else find_corrupted_files(layout, root)
    duplicates = [] if args.skip_duplicates else find_duplicate_files(layout, root)
    resolution = {"count": 0} if args.skip_resolution else image_resolution_summary(layout)
    ocr_results = (
        []
        if args.skip_ocr
        else run_ocr_quality_check(
            layout,
            root,
            metadata_rows,
            sample_size=args.ocr_sample_size,
            seed=args.ocr_seed,
        )
    )
    summary = attach_corruption_report(summary, corrupted)
    summary = attach_duplicate_report(summary, duplicates)
    summary = attach_resolution_report(summary, resolution)
    summary = attach_ocr_quality_report(summary, ocr_results)
    text = render_report(
        summary,
        corrupted,
        duplicates,
        resolution,
        ocr_results,
        verbose=args.verbose,
    )

    print(text, end="")

    if not args.no_markdown_report:
        markdown_path = save_markdown_report(summary, args.markdown_report_path)
        print(f"Dataset report: {markdown_path}")

    if args.save:
        json_path, text_path = save_report(summary, text, args.output_dir)
        print(f"Saved: {text_path}")
        print(f"Saved: {json_path}")

    return 1 if corrupted or duplicates else 0


if __name__ == "__main__":
    raise SystemExit(main())
