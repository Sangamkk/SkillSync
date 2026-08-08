"""
dataset.py
----------
PyTorch Dataset and DataLoader factory for certificate authenticity detection.

Supports two folder layouts:

Layout A — explicit split folders (preferred for Step 3):
    dataset/
        train/
            genuine/    →  label 0
            fake/       →  label 1
        validation/
            genuine/    →  label 0
            fake/       →  label 1
        test/           (optional)
            genuine/
            fake/

Layout B — flat layout (auto-split at load time):
    dataset/
        genuine/        →  label 0  (sub-folders per platform, e.g. aws/, coursera/)
        fake/           →  label 1  (sub-folders per tamper type, e.g. edited_name/)

The loader detects which layout is present and handles both transparently.

Label mapping:
    genuine  →  0
    fake     →  1
"""

import os
import random
from pathlib import Path
from typing import List, Tuple, Optional, Dict

from PIL import Image
import torch
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
import torchvision.transforms as T

from detection.config import (
    DATASET_DIR, CLASS_NAMES, IMAGE_SIZE,
    MEAN, STD, BATCH_SIZE, NUM_WORKERS, PIN_MEMORY,
    TRAIN_RATIO, VAL_RATIO, RANDOM_SEED,
)

# Supported image extensions
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}

# Label mapping (must match CLASS_NAMES index order in config.py)
LABEL_MAP: Dict[str, int] = {name: idx for idx, name in enumerate(CLASS_NAMES)}
# e.g. {"genuine": 0, "fake": 1}


# ---------------------------------------------------------------------------
# Helper: recursively collect all images under a root folder
# ---------------------------------------------------------------------------
def _collect_images(root: Path) -> List[Path]:
    """Return a sorted list of image file paths found anywhere under *root*."""
    paths = []
    for p in root.rglob("*"):
        if p.suffix.lower() in IMAGE_EXTENSIONS:
            paths.append(p)
    return sorted(paths)


# ---------------------------------------------------------------------------
# Layout detection
# ---------------------------------------------------------------------------
def detect_layout(dataset_dir: Path) -> str:
    """
    Inspect *dataset_dir* and return which folder layout is present.

    Returns:
        "split"  — explicit train/ validation/ sub-folders exist
        "flat"   — only class-name sub-folders (genuine/, fake/) exist
    """
    split_dirs = {"train", "validation", "val", "test"}
    children   = {p.name.lower() for p in dataset_dir.iterdir() if p.is_dir()}

    if children & split_dirs:
        return "split"
    return "flat"


# ---------------------------------------------------------------------------
# Layout A: read from explicit train/ validation/ test/ folders
# ---------------------------------------------------------------------------
def _load_split_folder(
    split_dir: Path,
) -> List[Tuple[Path, int]]:
    """
    Read all images from *split_dir*/<class_name>/ and assign integer labels.

    Expected structure:
        split_dir/
            genuine/  →  label 0
            fake/     →  label 1

    Any sub-folders inside genuine/ or fake/ are traversed recursively.
    """
    samples: List[Tuple[Path, int]] = []

    for class_name, label in LABEL_MAP.items():
        class_dir = split_dir / class_name
        if not class_dir.exists():
            # Tolerate missing class dirs in optional splits (e.g. test/)
            continue
        images = _collect_images(class_dir)
        samples.extend((img, label) for img in images)

    return samples


def build_splits_from_folders(
    dataset_dir: Path = DATASET_DIR,
) -> Tuple[List[Tuple[Path, int]], List[Tuple[Path, int]], List[Tuple[Path, int]]]:
    """
    Build (train, val, test) sample lists from explicit split folders.

    Accepts either "validation" or "val" as the validation folder name.
    Test split is optional — returns an empty list when absent.

    Returns:
        (train_samples, val_samples, test_samples)
    """
    train_dir = dataset_dir / "train"
    if not train_dir.exists():
        raise FileNotFoundError(
            f"Expected 'train/' folder not found under {dataset_dir}"
        )

    # Accept both "validation/" and "val/"
    val_dir = dataset_dir / "validation"
    if not val_dir.exists():
        val_dir = dataset_dir / "val"
    if not val_dir.exists():
        raise FileNotFoundError(
            f"Expected 'validation/' or 'val/' folder not found under {dataset_dir}"
        )

    test_dir = dataset_dir / "test"   # optional

    train_samples = _load_split_folder(train_dir)
    val_samples   = _load_split_folder(val_dir)
    test_samples  = _load_split_folder(test_dir) if test_dir.exists() else []

    if len(train_samples) == 0:
        raise RuntimeError(
            f"No training images found under {train_dir}. "
            "Make sure genuine/ and fake/ sub-folders contain images."
        )

    # Print a summary table
    _print_split_summary(
        {"train": train_samples, "val": val_samples, "test": test_samples}
    )

    return train_samples, val_samples, test_samples


def _print_split_summary(splits: Dict[str, List[Tuple[Path, int]]]) -> None:
    """Print a formatted table showing sample counts per split and class."""
    print("\n[Dataset] Folder layout — split summary")
    print(f"  {'Split':<12} {'genuine (0)':>12} {'fake (1)':>10} {'total':>8}")
    print("  " + "-" * 46)
    for split_name, samples in splits.items():
        genuine = sum(1 for _, lbl in samples if lbl == 0)
        fake    = sum(1 for _, lbl in samples if lbl == 1)
        total   = len(samples)
        print(f"  {split_name:<12} {genuine:>12} {fake:>10} {total:>8}")
    print()


# ---------------------------------------------------------------------------
# Build the full image / label list and split into train / val / test
# (Layout B — flat folder, programmatic split)
# ---------------------------------------------------------------------------
def build_splits(
    dataset_dir: Path = DATASET_DIR,
    train_ratio: float = TRAIN_RATIO,
    val_ratio: float = VAL_RATIO,
    seed: int = RANDOM_SEED,
) -> Tuple[List[Tuple[Path, int]], List[Tuple[Path, int]], List[Tuple[Path, int]]]:
    """
    Collect all images, assign integer labels, and split into
    (train, val, test) lists of (path, label) tuples.
    """
    all_samples: List[Tuple[Path, int]] = []

    for label, class_name in enumerate(CLASS_NAMES):
        class_dir = dataset_dir / class_name
        if not class_dir.exists():
            raise FileNotFoundError(
                f"Expected class folder not found: {class_dir}"
            )
        images = _collect_images(class_dir)
        all_samples.extend((img, label) for img in images)

    if len(all_samples) == 0:
        raise RuntimeError(
            f"No images found under {dataset_dir}. "
            "Add images to dataset/genuine/ and dataset/fake/."
        )

    rng = random.Random(seed)
    rng.shuffle(all_samples)

    n = len(all_samples)
    n_train = int(n * train_ratio)
    n_val   = int(n * val_ratio)

    train_samples = all_samples[:n_train]
    val_samples   = all_samples[n_train : n_train + n_val]
    test_samples  = all_samples[n_train + n_val :]

    return train_samples, val_samples, test_samples


# ---------------------------------------------------------------------------
# Transforms
# ---------------------------------------------------------------------------
def get_transforms(split: str) -> T.Compose:
    """
    Return torchvision transforms for the given split.
    Training split applies data augmentation; val/test use only resize + normalize.
    """
    if split == "train":
        return T.Compose([
            T.Resize((IMAGE_SIZE + 32, IMAGE_SIZE + 32)),
            T.RandomCrop(IMAGE_SIZE),
            T.RandomHorizontalFlip(p=0.5),
            T.RandomRotation(degrees=10),
            T.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
            T.ToTensor(),
            T.Normalize(mean=MEAN, std=STD),
        ])
    else:  # val / test / predict
        return T.Compose([
            T.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            T.ToTensor(),
            T.Normalize(mean=MEAN, std=STD),
        ])


# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------
class CertificateDataset(Dataset):
    """
    PyTorch Dataset for binary certificate authenticity classification.

    Args:
        samples:    List of (image_path, label) tuples.
        split:      One of "train", "val", "test", or "predict".
        transform:  Optional custom transform; if None the default for the
                    split is used.
    """

    def __init__(
        self,
        samples: List[Tuple[Path, int]],
        split: str = "train",
        transform: Optional[T.Compose] = None,
    ):
        self.samples   = samples
        self.split     = split
        self.transform = transform or get_transforms(split)
        self.class_names: List[str] = CLASS_NAMES

    # ------------------------------------------------------------------
    def __len__(self) -> int:
        return len(self.samples)

    # ------------------------------------------------------------------
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        path, label = self.samples[idx]
        image = Image.open(path).convert("RGB")
        tensor = self.transform(image)
        return tensor, label

    # ------------------------------------------------------------------
    def class_counts(self) -> Dict[str, int]:
        """Return a dict mapping class name → number of samples."""
        counts: Dict[str, int] = {name: 0 for name in self.class_names}
        for _, label in self.samples:
            counts[self.class_names[label]] += 1
        return counts


# ---------------------------------------------------------------------------
# WeightedRandomSampler for class-imbalanced datasets
# ---------------------------------------------------------------------------
def make_weighted_sampler(dataset: CertificateDataset) -> WeightedRandomSampler:
    """
    Build a WeightedRandomSampler that up-samples minority classes so
    each training batch sees a balanced class distribution.
    """
    counts = dataset.class_counts()
    class_weights = {
        name: 1.0 / max(count, 1)
        for name, count in counts.items()
    }
    sample_weights = [
        class_weights[CLASS_NAMES[label]]
        for _, label in dataset.samples
    ]
    return WeightedRandomSampler(
        weights=sample_weights,
        num_samples=len(sample_weights),
        replacement=True,
    )


# ---------------------------------------------------------------------------
# DataLoader factory  — auto-detects layout A or B
# ---------------------------------------------------------------------------
def get_dataloaders(
    dataset_dir: Path = DATASET_DIR,
    batch_size: int = BATCH_SIZE,
    use_weighted_sampler: bool = True,
    seed: int = RANDOM_SEED,
) -> Tuple[DataLoader, DataLoader, DataLoader]:
    """
    Build and return (train_loader, val_loader, test_loader).

    Automatically detects whether *dataset_dir* uses the explicit
    split-folder layout (train/ validation/) or the flat layout
    (genuine/ fake/) and calls the appropriate builder.

    Args:
        dataset_dir:          Root of the dataset folder.
        batch_size:           Samples per mini-batch.
        use_weighted_sampler: If True, use WeightedRandomSampler for training
                              to handle class imbalance.
        seed:                 Random seed — only used for the flat layout split.

    Returns:
        Tuple of (train_loader, val_loader, test_loader).
        test_loader may wrap an empty dataset when no test split exists.
    """
    layout = detect_layout(dataset_dir)
    print(f"[Dataset] Detected layout: '{layout}' under {dataset_dir}")

    if layout == "split":
        train_samples, val_samples, test_samples = build_splits_from_folders(dataset_dir)
    else:
        train_samples, val_samples, test_samples = build_splits(
            dataset_dir=dataset_dir, seed=seed
        )

    train_ds = CertificateDataset(train_samples, split="train")
    val_ds   = CertificateDataset(val_samples,   split="val")
    test_ds  = CertificateDataset(test_samples,  split="test")

    if use_weighted_sampler and len(train_ds) > 0:
        sampler = make_weighted_sampler(train_ds)
        train_loader = DataLoader(
            train_ds,
            batch_size=batch_size,
            sampler=sampler,
            num_workers=NUM_WORKERS,
            pin_memory=PIN_MEMORY,
        )
    else:
        train_loader = DataLoader(
            train_ds,
            batch_size=batch_size,
            shuffle=True,
            num_workers=NUM_WORKERS,
            pin_memory=PIN_MEMORY,
        )

    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=PIN_MEMORY,
    )

    test_loader = DataLoader(
        test_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=PIN_MEMORY,
    )

    if layout == "flat":
        print(f"[Dataset] Train: {len(train_ds)} | Val: {len(val_ds)} | Test: {len(test_ds)}")
        print(f"[Dataset] Train class counts: {train_ds.class_counts()}")

    return train_loader, val_loader, test_loader


# ---------------------------------------------------------------------------
# Test-only loader — evaluation use only
# ---------------------------------------------------------------------------
def load_test_dataset(
    test_dir: Optional[Path] = None,
    batch_size: int = BATCH_SIZE,
) -> Tuple[DataLoader, "CertificateDataset"]:
    """
    Load the test split and return (test_loader, test_dataset).

    This function is the ONLY correct way to load data for evaluation.
    It enforces three hard rules:

        1. Reads ONLY from processed_dataset/test/  (or explicit test_dir).
           It has no access to train/ or validation/ directories.

        2. No shuffle — evaluation order must be deterministic and
           reproducible so results can be compared across runs.

        3. No augmentation — only resize + normalise transforms are
           applied (identical to the val transforms used during training).
           Augmentation would change the images and corrupt metrics.

    Expected folder structure:
        test_dir/
            genuine/    →  label 0   (any depth of sub-folders)
            fake/       →  label 1

    Args:
        test_dir:   Path to the test root folder.
                    Defaults to config.TEST_DIR
                    (processed_dataset/test/).
        batch_size: Images per mini-batch.

    Returns:
        (test_loader, test_dataset)
            test_loader   — DataLoader, no shuffle, test transforms only
            test_dataset  — CertificateDataset, for inspecting samples/labels
    """
    from detection.config import TEST_DIR as _DEFAULT_TEST_DIR

    root = Path(test_dir) if test_dir is not None else _DEFAULT_TEST_DIR

    # ── Guard: path must not contain 'train' or 'val' anywhere ───────────
    # This is a hard safety check: if someone accidentally passes a
    # training directory, we refuse to load it.
    root_str = str(root).lower()
    for forbidden in ("train", "validation", "val"):
        if root_str.endswith(f"/{forbidden}") or root_str.endswith(f"\\{forbidden}"):
            raise ValueError(
                f"Refusing to load '{root}'.\n"
                f"load_test_dataset() must only be called with the test "
                f"directory, not '{forbidden}/'.\n"
                f"Never evaluate on training or validation data."
            )

    if not root.exists():
        raise FileNotFoundError(
            f"Test directory not found: {root}\n"
            f"Create the folder and populate it with:\n"
            f"  {root}/genuine/   ← genuine certificate images\n"
            f"  {root}/fake/      ← fake certificate images"
        )

    # ── Load samples ──────────────────────────────────────────────────────
    samples = _load_split_folder(root)

    if len(samples) == 0:
        raise RuntimeError(
            f"No images found under {root}.\n"
            f"Add images to {root}/genuine/ and {root}/fake/."
        )

    # ── Build dataset — test transforms, no augmentation ──────────────────
    dataset = CertificateDataset(samples, split="test")  # uses val/test transforms

    # ── Build loader — no shuffle, deterministic order ────────────────────
    loader = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=False,        # NEVER shuffle test data
        num_workers=NUM_WORKERS,
        pin_memory=PIN_MEMORY,
        drop_last=False,      # evaluate every single image, no partial-batch drop
    )

    # ── Report ────────────────────────────────────────────────────────────
    counts = dataset.class_counts()
    print(f"\n[TestDataset] Root       : {root}")
    print(f"[TestDataset] Genuine (0): {counts.get('genuine', 0):>6}")
    print(f"[TestDataset] Fake    (1): {counts.get('fake',    0):>6}")
    print(f"[TestDataset] Total      : {len(dataset):>6}")
    print(f"[TestDataset] Batches    : {len(loader):>6}  (batch_size={batch_size})")
    print(f"[TestDataset] Shuffle    : False  (deterministic evaluation)")
    print(f"[TestDataset] Transforms : resize({IMAGE_SIZE}) + normalize  "
          f"(no augmentation)\n")

    return loader, dataset
