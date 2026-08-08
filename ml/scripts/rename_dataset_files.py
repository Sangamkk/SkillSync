#!/usr/bin/env python3
"""Rename dataset files to {folder_name}_{####}.{ext} convention."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

VALID_NAME = re.compile(r"^([a-z0-9_]+)_(\d{4})\.([a-z0-9]+)$", re.IGNORECASE)
SUPPORTED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}


def dataset_root() -> Path:
    return Path(__file__).resolve().parent.parent / "dataset"


def is_already_named(path: Path, folder_name: str) -> bool:
    match = VALID_NAME.match(path.name)
    if not match:
        return False
    prefix, _, _ = match.groups()
    return prefix.lower() == folder_name.lower()


def next_index(folder: Path, folder_name: str) -> int:
    highest = 0
    for path in folder.iterdir():
        if not path.is_file():
            continue
        match = VALID_NAME.match(path.name)
        if match and match.group(1).lower() == folder_name.lower():
            highest = max(highest, int(match.group(2)))
    return highest + 1


def collect_targets(folder: Path) -> list[Path]:
    files = [
        path
        for path in folder.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    ]
    return sorted(files, key=lambda p: (p.stat().st_mtime, p.name.lower()))


def rename_folder(folder: Path, *, dry_run: bool) -> list[tuple[str, str]]:
    folder_name = folder.name
    index = next_index(folder, folder_name)
    changes: list[tuple[str, str]] = []

    for path in collect_targets(folder):
        if is_already_named(path, folder_name):
            continue

        ext = path.suffix.lower().lstrip(".")
        if ext == "jpeg":
            ext = "jpg"

        new_name = f"{folder_name}_{index:04d}.{ext}"
        new_path = folder / new_name

        while new_path.exists() and new_path != path:
            index += 1
            new_name = f"{folder_name}_{index:04d}.{ext}"
            new_path = folder / new_name

        changes.append((path.name, new_name))

        if not dry_run:
            path.rename(new_path)

        index += 1

    return changes


def iter_leaf_folders(root: Path, relative: str | None) -> list[Path]:
    if relative:
        target = root / relative
        if not target.is_dir():
            raise SystemExit(f"Folder not found: {target}")
        return [target]

    folders: list[Path] = []
    for group in ("genuine", "fake"):
        group_path = root / group
        if not group_path.is_dir():
            continue
        folders.extend(sorted(p for p in group_path.iterdir() if p.is_dir()))
    return folders


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Rename dataset files to {folder_name}_{####}.{ext}"
    )
    parser.add_argument(
        "--folder",
        help="Specific subfolder, e.g. genuine/coursera or fake/edited_name",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview renames without changing files",
    )
    args = parser.parse_args()

    root = dataset_root()
    if not root.is_dir():
        print(f"Dataset root not found: {root}", file=sys.stderr)
        return 1

    folders = iter_leaf_folders(root, args.folder)
    total = 0

    for folder in folders:
        changes = rename_folder(folder, dry_run=args.dry_run)
        if not changes:
            continue

        group = folder.parent.name
        print(f"\n[{group}/{folder.name}]")
        for old, new in changes:
            arrow = "->" if not args.dry_run else "~>"
            print(f"  {old} {arrow} {new}")
            total += 1

    if total == 0:
        print("No files to rename.")
    elif args.dry_run:
        print(f"\nDry run: {total} file(s) would be renamed.")
    else:
        print(f"\nRenamed {total} file(s).")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
