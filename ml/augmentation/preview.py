"""
augmentation/preview.py
=======================

Preview script for the certificate augmentation pipeline.

What it does
------------
1. Loads one certificate image (auto-discovers from dataset/, or falls back to
   a synthetic placeholder if the dataset is empty).
2. Applies the torchvision training pipeline N times independently.
3. Saves each augmented version as an individual PNG file:

       outputs/augmentation_preview/
           original.png
           preview_1.png
           preview_2.png
           preview_3.png
           preview_4.png
           preview_5.png

4. Also saves a single side-by-side comparison grid:

       outputs/augmentation_preview/
           grid.png

Run directly
------------
    python -m augmentation.preview

    # Or with arguments:
    python -m augmentation.preview --image path/to/cert.png --n 8

Public API (importable)
-----------------------
    from augmentation.preview import (
        show_augmentation_grid,   # matplotlib popup
        save_augmentation_grid,   # grid PNG file
        save_preview_images,      # individual preview_N.png files  ← new
        preview_single,           # returns one augmented BGR array
    )
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path
from typing import List, Optional, Union

import cv2
import numpy as np

# Add project root to path so the module works both as a script and as an import
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from augmentation.config import AugmentationConfig, DEFAULT_CONFIG
from augmentation.transforms import AugmentationPipeline


# --------------------------------------------------------------------------- #
# Constants                                                                     #
# --------------------------------------------------------------------------- #

DATASET_DIR = _PROJECT_ROOT / "dataset"
OUTPUT_DIR  = _PROJECT_ROOT / "outputs" / "augmentation_preview"

# Image file extensions to search for
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


# --------------------------------------------------------------------------- #
# Internal helpers                                                              #
# --------------------------------------------------------------------------- #

def _find_first_image(search_root: Path) -> Optional[Path]:
    """
    Walk *search_root* recursively and return the first image file found.
    Returns None if the directory contains no images.
    """
    for path in sorted(search_root.rglob("*")):
        if path.is_file() and path.suffix.lower() in _IMAGE_EXTS:
            return path
    return None


def _make_placeholder(size: int = 600) -> np.ndarray:
    """
    Generate a synthetic certificate-like placeholder image (BGR, uint8).

    Used when the dataset folder contains no real images yet, so the
    preview script can still demonstrate the pipeline.
    """
    img = np.full((size, int(size * 1.4), 3), 245, dtype=np.uint8)  # off-white
    h, w = img.shape[:2]

    # Border
    cv2.rectangle(img, (15, 15), (w - 15, h - 15), (180, 140, 80), 3)
    cv2.rectangle(img, (22, 22), (w - 22, h - 22), (180, 140, 80), 1)

    # Title
    cv2.putText(img, "CERTIFICATE OF COMPLETION",
                (w // 2 - 230, 90),
                cv2.FONT_HERSHEY_SIMPLEX, 0.85, (40, 40, 120), 2, cv2.LINE_AA)

    # Subtitle
    cv2.putText(img, "This is to certify that",
                (w // 2 - 130, 160),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (80, 80, 80), 1, cv2.LINE_AA)

    # Name line
    cv2.putText(img, "Sample Holder",
                (w // 2 - 100, 230),
                cv2.FONT_HERSHEY_SIMPLEX, 1.1, (20, 20, 20), 2, cv2.LINE_AA)
    cv2.line(img, (w // 2 - 140, 245), (w // 2 + 140, 245), (100, 100, 100), 1)

    # Body text
    cv2.putText(img, "has successfully completed the course",
                (w // 2 - 175, 290),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (80, 80, 80), 1, cv2.LINE_AA)
    cv2.putText(img, "Certificate Forgery Detection  |  Advanced AI",
                (w // 2 - 200, 330),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (40, 40, 120), 1, cv2.LINE_AA)

    # Date
    cv2.putText(img, "Issued: August 2026",
                (w // 2 - 90, 400),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (100, 100, 100), 1, cv2.LINE_AA)

    # Signature placeholder
    cv2.line(img, (120, h - 80), (280, h - 80), (60, 60, 60), 1)
    cv2.putText(img, "Instructor", (155, h - 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 100, 100), 1, cv2.LINE_AA)

    # Logo / seal circle
    cv2.circle(img, (w - 120, h - 110), 60, (180, 140, 80), 2)
    cv2.putText(img, "SEAL", (w - 142, h - 105),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (180, 140, 80), 1, cv2.LINE_AA)

    return img


def _load_image(source: Union[str, Path, np.ndarray]) -> np.ndarray:
    """Load a BGR uint8 array from a file path or return the array as-is."""
    if isinstance(source, np.ndarray):
        return source
    path = Path(source)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")
    img = cv2.imread(str(path))
    if img is None:
        raise ValueError(f"cv2.imread could not decode: {path}")
    return img


def _bgr_to_rgb(image: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)


def _build_grid(
    original: np.ndarray,
    augmented: List[np.ndarray],
    thumb_size: tuple[int, int] = (320, 240),
) -> np.ndarray:
    """Assemble original + augmented thumbnails into a white-background grid (RGB)."""
    all_images = [original] + augmented
    n = len(all_images)
    cols = math.ceil(math.sqrt(n))
    rows = math.ceil(n / cols)

    tw, th = thumb_size
    grid = np.full((rows * th, cols * tw, 3), 255, dtype=np.uint8)

    for idx, img in enumerate(all_images):
        r, c = divmod(idx, cols)
        thumb = cv2.resize(img, (tw, th), interpolation=cv2.INTER_AREA)
        grid[r * th:(r + 1) * th, c * tw:(c + 1) * tw] = _bgr_to_rgb(thumb)

    return grid


def _add_labels(
    grid: np.ndarray,
    n_augmented: int,
    thumb_size: tuple[int, int] = (320, 240),
) -> np.ndarray:
    """Overlay text labels on each grid cell."""
    tw, th = thumb_size
    cols = math.ceil(math.sqrt(n_augmented + 1))
    labels = ["original"] + [f"preview_{i + 1}" for i in range(n_augmented)]

    for idx, label in enumerate(labels):
        r, c = divmod(idx, cols)
        x = c * tw + 8
        y = r * th + 22
        # Drop shadow
        cv2.putText(grid, label, (x + 1, y + 1),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (40, 40, 40), 1, cv2.LINE_AA)
        cv2.putText(grid, label, (x, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
    return grid


# --------------------------------------------------------------------------- #
# Public API                                                                    #
# --------------------------------------------------------------------------- #

def save_preview_images(
    source: Union[str, Path, np.ndarray],
    output_dir: Union[str, Path] = OUTPUT_DIR,
    n: int = 5,
    config: AugmentationConfig = DEFAULT_CONFIG,
) -> List[Path]:
    """
    Apply the augmentation pipeline *n* times and save each result as an
    individual PNG file alongside a copy of the original.

    Output layout::

        <output_dir>/
            original.png
            preview_1.png
            preview_2.png
            ...
            preview_N.png

    Parameters
    ----------
    source : str | Path | np.ndarray
        Path to a certificate image, or a pre-loaded BGR array.
    output_dir : str | Path
        Destination folder (created if it doesn't exist).
    n : int
        Number of augmented previews to generate.
    config : AugmentationConfig
        Pipeline configuration.

    Returns
    -------
    List[Path]
        Resolved paths of every saved file (original first, then previews).
    """
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    original = _load_image(source)
    pipeline = AugmentationPipeline(config)

    saved: List[Path] = []

    # Save original
    orig_path = out_dir / "original.png"
    cv2.imwrite(str(orig_path), original)
    saved.append(orig_path.resolve())
    print(f"  [saved] {orig_path.name}")

    # Save augmented previews
    for i in range(n):
        aug = pipeline.apply(original)
        out_path = out_dir / f"preview_{i + 1}.png"
        cv2.imwrite(str(out_path), aug)
        saved.append(out_path.resolve())
        print(f"  [saved] {out_path.name}")

    return saved


def save_augmentation_grid(
    source: Union[str, Path, np.ndarray],
    output_path: Union[str, Path],
    n: int = 5,
    config: AugmentationConfig = DEFAULT_CONFIG,
    thumb_size: tuple[int, int] = (320, 240),
) -> Path:
    """
    Save a side-by-side comparison grid (original + N augmented) as a PNG.

    Parameters
    ----------
    source : str | Path | np.ndarray
        Path to a certificate image, or a pre-loaded BGR array.
    output_path : str | Path
        Destination PNG file path.
    n : int
        Number of augmented variants in the grid.
    config : AugmentationConfig
        Pipeline configuration.
    thumb_size : (width, height)
        Pixel size of each thumbnail cell.

    Returns
    -------
    Path
        Resolved path of the saved grid file.
    """
    original = _load_image(source)
    pipeline = AugmentationPipeline(config)
    augmented = pipeline.augment(original, n=n)

    grid     = _build_grid(original, augmented, thumb_size)
    grid     = _add_labels(grid, n, thumb_size)
    grid_bgr = cv2.cvtColor(grid, cv2.COLOR_RGB2BGR)

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out), grid_bgr)
    print(f"  [saved] {out.name}  (comparison grid)")
    return out.resolve()


def show_augmentation_grid(
    source: Union[str, Path, np.ndarray],
    n: int = 5,
    config: AugmentationConfig = DEFAULT_CONFIG,
    thumb_size: tuple[int, int] = (320, 240),
    title: str = "Augmentation Preview",
) -> None:
    """
    Display original + N augmented thumbnails in a Matplotlib window.

    Requires matplotlib (``pip install matplotlib``).
    """
    try:
        import matplotlib.pyplot as plt
    except ImportError as exc:
        raise ImportError(
            "matplotlib is required for show_augmentation_grid. "
            "Install it with: pip install matplotlib"
        ) from exc

    original = _load_image(source)
    pipeline = AugmentationPipeline(config)
    augmented = pipeline.augment(original, n=n)

    grid = _build_grid(original, augmented, thumb_size)
    grid = _add_labels(grid, n, thumb_size)

    cols   = math.ceil(math.sqrt(n + 1))
    rows   = math.ceil((n + 1) / cols)
    fig_w  = cols * (thumb_size[0] / 96)
    fig_h  = rows * (thumb_size[1] / 96)

    fig, ax = plt.subplots(figsize=(fig_w, fig_h))
    ax.imshow(grid)
    ax.axis("off")
    fig.suptitle(title, fontsize=11)
    plt.tight_layout()
    plt.show()


def preview_single(
    source: Union[str, Path, np.ndarray],
    config: AugmentationConfig = DEFAULT_CONFIG,
) -> np.ndarray:
    """
    Apply one random augmentation pass and return the BGR result array.

    Useful for quick notebook inspection::

        from PIL import Image
        img = preview_single("cert.jpg")
        Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB)).show()
    """
    original = _load_image(source)
    return AugmentationPipeline(config).apply(original)


# --------------------------------------------------------------------------- #
# CLI entry point                                                               #
# --------------------------------------------------------------------------- #

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate augmentation preview images for a certificate."
    )
    parser.add_argument(
        "--image", "-i",
        type=str,
        default=None,
        help=(
            "Path to a certificate image.  If omitted, the script searches "
            "dataset/ for the first available image, or falls back to a "
            "synthetic placeholder."
        ),
    )
    parser.add_argument(
        "--n", "-n",
        type=int,
        default=5,
        help="Number of augmented previews to generate (default: 5).",
    )
    parser.add_argument(
        "--output-dir", "-o",
        type=str,
        default=str(OUTPUT_DIR),
        help=f"Output directory (default: {OUTPUT_DIR}).",
    )
    parser.add_argument(
        "--no-grid",
        action="store_true",
        help="Skip saving the comparison grid.png.",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()

    # ------------------------------------------------------------------ #
    # 1. Resolve source image                                              #
    # ------------------------------------------------------------------ #
    if args.image:
        image_path = Path(args.image)
        if not image_path.exists():
            print(f"[error] File not found: {image_path}", file=sys.stderr)
            sys.exit(1)
        source: Union[Path, np.ndarray] = image_path
        source_label = image_path.name
    else:
        found = _find_first_image(DATASET_DIR)
        if found:
            source       = found
            source_label = str(found.relative_to(_PROJECT_ROOT))
            print(f"[preview] Using dataset image: {source_label}")
        else:
            print("[preview] No images found in dataset/ — using synthetic placeholder.")
            source       = _make_placeholder()
            source_label = "synthetic placeholder"

    # ------------------------------------------------------------------ #
    # 2. Save individual preview images                                    #
    # ------------------------------------------------------------------ #
    out_dir = Path(args.output_dir)
    print(f"\n[preview] Source : {source_label}")
    print(f"[preview] Output : {out_dir}")
    print(f"[preview] Copies : {args.n}\n")

    saved = save_preview_images(
        source=source,
        output_dir=out_dir,
        n=args.n,
        config=DEFAULT_CONFIG,
    )

    # ------------------------------------------------------------------ #
    # 3. Save comparison grid                                              #
    # ------------------------------------------------------------------ #
    if not args.no_grid:
        save_augmentation_grid(
            source=source,
            output_path=out_dir / "grid.png",
            n=args.n,
            config=DEFAULT_CONFIG,
        )

    # ------------------------------------------------------------------ #
    # 4. Summary                                                           #
    # ------------------------------------------------------------------ #
    print(f"\n[preview] Done. {len(saved)} file(s) saved to: {out_dir.resolve()}")
    print("[preview] Inspect the images to verify augmentations look realistic.")


if __name__ == "__main__":
    main()
