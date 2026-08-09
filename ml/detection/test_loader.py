"""
test_loader.py
--------------
Load the test dataset for final evaluation.

Step 2 of evaluation — loads ONLY the test split, never training data.

Expected folder structure
──────────────────────────────────────────────────
    processed_dataset/
        test/
            genuine/    →  label 0  (never-seen-during-training images)
            fake/       →  label 1

Rules enforced by this module
──────────────────────────────────────────────────
    1. Only reads from processed_dataset/test/
       The path is validated — passing a train/ or val/ directory raises
       an error immediately.

    2. No shuffle
       Test images are always loaded in the same deterministic order so
       that results are reproducible and comparable across runs.

    3. No augmentation
       Only resize(224×224) + ImageNet normalisation are applied.
       Augmentation would alter pixel values and corrupt metrics.

    4. No weight updates
       This module is read-only. It produces a DataLoader; it does not
       import train.py or touch the model.

Why never evaluate on training data?
──────────────────────────────────────────────────
    The model has already seen every training image many times and has
    partially memorised them.  Accuracy measured on training data is
    inflated and tells you nothing about how the model performs on new
    certificates.  Test accuracy on held-out data is the only honest
    measure of real-world performance.

Usage
──────────────────────────────────────────────────
    # Standalone report
    python -m detection.test_loader

    # Programmatic
    from detection.test_loader import get_test_loader
    test_loader, test_dataset = get_test_loader()
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional, Tuple

from torch.utils.data import DataLoader

from detection.config import (
    PROCESSED_DATASET_DIR,
    TEST_DIR,
    BATCH_SIZE,
    CLASS_NAMES,
    IMAGE_SIZE,
)
from detection.dataset import load_test_dataset, CertificateDataset


# ─────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────

def get_test_loader(
    test_dir:   Optional[Path | str] = None,
    batch_size: int = BATCH_SIZE,
) -> Tuple[DataLoader, CertificateDataset]:
    """
    Load the test dataset and return (test_loader, test_dataset).

    This is the single correct entry point for loading evaluation data.
    It delegates to dataset.load_test_dataset() which enforces all
    safety rules (no train/val paths, no shuffle, no augmentation).

    Args:
        test_dir:   Path to the test root folder.
                    Defaults to processed_dataset/test/.
        batch_size: Images per mini-batch.  Defaults to config.BATCH_SIZE.

    Returns:
        test_loader   — DataLoader wrapping the test images.
        test_dataset  — CertificateDataset for label/path inspection.
    """
    return load_test_dataset(
        test_dir   = test_dir,
        batch_size = batch_size,
    )


def describe_test_set(dataset: CertificateDataset) -> None:
    """
    Print a detailed description of the test dataset: class counts,
    label map, transform pipeline, and first few image paths.
    """
    counts = dataset.class_counts()
    total  = len(dataset)

    D = "─" * 58
    print(f"\n{'═'*58}")
    print("  Test Dataset Description")
    print(f"{'═'*58}")
    print(f"  Total images   : {total}")
    print(D)

    for cls_name in CLASS_NAMES:
        n   = counts.get(cls_name, 0)
        pct = 100 * n / max(total, 1)
        bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
        print(f"  {cls_name:<10}  label={CLASS_NAMES.index(cls_name)}"
              f"  [{bar}]  {n:>5} images  ({pct:.1f}%)")

    print(D)
    print(f"  Image size     : {IMAGE_SIZE}×{IMAGE_SIZE} px")
    print(f"  Transforms     : Resize → ToTensor → Normalize (no augmentation)")
    print(f"  Shuffle        : False")
    print(D)
    print(f"  Label map      : genuine=0   fake=1")
    print(D)

    # Show up to 5 sample paths per class
    print("  Sample paths:")
    shown = {name: 0 for name in CLASS_NAMES}
    for path, label in dataset.samples:
        cls_name = CLASS_NAMES[label]
        if shown[cls_name] < 3:
            print(f"    [{cls_name}]  {path.name}")
            shown[cls_name] += 1
        if all(v >= 3 for v in shown.values()):
            break

    print(f"{'═'*58}\n")


# ─────────────────────────────────────────────────────────────────────────
# Entry point  (python -m detection.test_loader)
# ─────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    print(f"\n  processed_dataset/ root : {PROCESSED_DATASET_DIR}")
    print(f"  test/ path              : {TEST_DIR}")
    print(f"  test/ exists            : {TEST_DIR.exists()}")

    if not TEST_DIR.exists():
        print(
            f"\n  Directory not found: {TEST_DIR}\n"
            f"  Create it and add certificate images:\n"
            f"    {TEST_DIR}/genuine/  ← genuine certificates\n"
            f"    {TEST_DIR}/fake/     ← fake certificates\n"
            f"\n  Then re-run:  python -m detection.test_loader\n"
        )
        sys.exit(0)

    # Load
    test_loader, test_dataset = get_test_loader(batch_size=BATCH_SIZE)

    # Describe
    describe_test_set(test_dataset)

    # Confirm first batch shape
    import torch
    batch_images, batch_labels = next(iter(test_loader))
    print(f"  First batch shape  : {list(batch_images.shape)}")
    print(f"  First batch labels : {batch_labels.tolist()}")
    print(f"  Dtype              : {batch_images.dtype}")
    print(f"  Value range        : [{batch_images.min():.3f}, {batch_images.max():.3f}]"
          f"  (ImageNet-normalised)\n")

    # Safety assertion — confirm this is a test loader (no train/val data)
    root_str = str(TEST_DIR).lower()
    for forbidden in ("train", "validation"):
        assert forbidden not in root_str.split("\\")[-1] and \
               forbidden not in root_str.split("/")[-1], \
            f"Test directory path contains '{forbidden}' — aborting."

    print("  Safety check: path does not contain 'train' or 'validation'  ✓")
    print("  Test dataset loaded successfully — ready for evaluation.\n")
