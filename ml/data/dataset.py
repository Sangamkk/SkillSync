"""
data/dataset.py
===============

CertificateDataset — a PyTorch Dataset for certificate forgery detection.

Folder layout expected
----------------------
dataset/
    genuine/          ← label 0  (any sub-folder structure OK)
        aws/
        coursera/
        ...
    fake/             ← label 1
        edited_name/
        edited_logo/
        ...

Label encoding
--------------
    genuine  →  0
    fake     →  1

Split behaviour
---------------
The dataset is built for a specific split ("train", "val", or "test").
The caller is responsible for passing the correct transform:

    split="train"  →  get_train_transforms()   (random augmentation)
    split="val"    →  get_val_transforms()      (deterministic, no augmentation)
    split="test"   →  get_val_transforms()      (deterministic, no augmentation)

This ensures augmentation is NEVER applied during evaluation.

Usage
-----
    from data.dataset import CertificateDataset
    from augmentation import get_train_transforms, get_val_transforms
    from augmentation import AugmentationConfig

    cfg     = AugmentationConfig()
    ds_train = CertificateDataset("dataset", split="train",
                                  transform=get_train_transforms(cfg))
    ds_val   = CertificateDataset("dataset", split="val",
                                  transform=get_val_transforms(cfg))

    image, label = ds_train[0]   # torch.Tensor (3,224,224), int
"""

from __future__ import annotations

import random
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

from PIL import Image
import torch
from torch.utils.data import Dataset


# --------------------------------------------------------------------------- #
# Constants                                                                     #
# --------------------------------------------------------------------------- #

LABEL_MAP: Dict[str, int] = {
    "genuine": 0,
    "fake":    1,
}

# Image extensions the dataset loader will accept
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}

# Valid split names
_VALID_SPLITS = {"train", "val", "test"}


# --------------------------------------------------------------------------- #
# Dataset                                                                       #
# --------------------------------------------------------------------------- #

class CertificateDataset(Dataset):
    """
    PyTorch Dataset for certificate genuine / fake classification.

    Parameters
    ----------
    root : str | Path
        Path to the dataset root containing ``genuine/`` and ``fake/``
        sub-directories.
    split : str
        One of ``"train"``, ``"val"``, or ``"test"``.
        Used for informational purposes and split-file loading; the caller
        must supply the matching transform.
    transform : callable, optional
        A torchvision transform (or any callable) that accepts a PIL Image
        and returns a ``torch.Tensor``.
        - Pass ``get_train_transforms(cfg)`` for the training split.
        - Pass ``get_val_transforms(cfg)``   for val / test splits.
        If None, the raw PIL image is returned (useful for debugging).
    val_fraction : float
        Fraction of samples reserved for validation when splitting
        automatically (no explicit split files).  Default: 0.15.
    test_fraction : float
        Fraction of samples reserved for test.  Default: 0.15.
    seed : int
        Random seed for the train / val / test split.  Default: 42.
    split_file : str | Path, optional
        Path to a text file containing one filename (stem) per line that
        belongs to this split.  When provided, val_fraction / test_fraction
        are ignored and the explicit file list is used instead.
    """

    def __init__(
        self,
        root: str | Path,
        split: str = "train",
        transform: Optional[Callable] = None,
        val_fraction: float = 0.15,
        test_fraction: float = 0.15,
        seed: int = 42,
        split_file: Optional[str | Path] = None,
    ) -> None:
        if split not in _VALID_SPLITS:
            raise ValueError(
                f"split must be one of {_VALID_SPLITS}, got {split!r}"
            )

        self.root         = Path(root)
        self.split        = split
        self.transform    = transform
        self._val_frac    = val_fraction
        self._test_frac   = test_fraction
        self._seed        = seed

        if not self.root.exists():
            raise FileNotFoundError(f"Dataset root not found: {self.root}")

        # Collect all (path, label) pairs then carve out the requested split
        all_samples = self._collect_all_samples()

        if split_file is not None:
            self.samples = self._load_split_file(all_samples, Path(split_file))
        else:
            self.samples = self._auto_split(all_samples)[split]

    # ------------------------------------------------------------------ #
    # Internal: sample discovery                                           #
    # ------------------------------------------------------------------ #

    def _collect_all_samples(self) -> List[Tuple[Path, int]]:
        """
        Walk genuine/ and fake/ sub-trees and collect all image paths.

        Returns
        -------
        List of (image_path, label_int) tuples, sorted for reproducibility.
        """
        samples: List[Tuple[Path, int]] = []

        for class_name, label in LABEL_MAP.items():
            class_dir = self.root / class_name
            if not class_dir.exists():
                # Tolerate missing class directory — warn instead of crash
                print(
                    f"[CertificateDataset] Warning: "
                    f"expected directory not found: {class_dir}"
                )
                continue

            for path in sorted(class_dir.rglob("*")):
                if path.is_file() and path.suffix.lower() in _IMAGE_EXTS:
                    samples.append((path, label))

        if not samples:
            print(
                "[CertificateDataset] Warning: no images found under "
                f"{self.root}.  The dataset will be empty."
            )

        return samples

    # ------------------------------------------------------------------ #
    # Internal: splitting strategies                                       #
    # ------------------------------------------------------------------ #

    def _auto_split(
        self,
        all_samples: List[Tuple[Path, int]],
    ) -> Dict[str, List[Tuple[Path, int]]]:
        """
        Randomly partition all_samples into train / val / test.

        The split is stratified per class so each subset has roughly the
        same genuine : fake ratio.
        """
        rng = random.Random(self._seed)

        # Separate by class
        per_class: Dict[int, List[Tuple[Path, int]]] = {0: [], 1: []}
        for sample in all_samples:
            per_class[sample[1]].append(sample)

        train_samples: List[Tuple[Path, int]] = []
        val_samples:   List[Tuple[Path, int]] = []
        test_samples:  List[Tuple[Path, int]] = []

        for label, items in per_class.items():
            shuffled = items[:]
            rng.shuffle(shuffled)

            n       = len(shuffled)
            n_test  = max(1, int(n * self._test_frac))  if n > 0 else 0
            n_val   = max(1, int(n * self._val_frac))   if n > 0 else 0
            n_train = n - n_val - n_test

            # Guard against tiny datasets
            if n_train < 0:
                n_train = 0

            train_samples.extend(shuffled[:n_train])
            val_samples.extend(shuffled[n_train:n_train + n_val])
            test_samples.extend(shuffled[n_train + n_val:])

        # Shuffle within each split for good measure
        rng.shuffle(train_samples)
        rng.shuffle(val_samples)
        rng.shuffle(test_samples)

        return {
            "train": train_samples,
            "val":   val_samples,
            "test":  test_samples,
        }

    def _load_split_file(
        self,
        all_samples: List[Tuple[Path, int]],
        split_file: Path,
    ) -> List[Tuple[Path, int]]:
        """
        Filter all_samples to those whose stem appears in *split_file*.
        """
        if not split_file.exists():
            raise FileNotFoundError(f"Split file not found: {split_file}")

        allowed = {
            line.strip()
            for line in split_file.read_text().splitlines()
            if line.strip()
        }
        return [s for s in all_samples if s[0].stem in allowed]

    # ------------------------------------------------------------------ #
    # Dataset protocol                                                     #
    # ------------------------------------------------------------------ #

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor | Image.Image, int]:
        """
        Return one (image, label) pair.

        The image is:
        - A normalised ``torch.Tensor`` of shape ``(3, 224, 224)`` when a
          transform is set (normal training / evaluation use).
        - A raw ``PIL.Image`` when transform is None (debugging).

        The label is 0 (genuine) or 1 (fake).
        """
        path, label = self.samples[idx]

        try:
            image = Image.open(path).convert("RGB")
        except Exception as exc:
            raise RuntimeError(f"Could not open image {path}: {exc}") from exc

        if self.transform is not None:
            image = self.transform(image)

        return image, label

    # ------------------------------------------------------------------ #
    # Utilities                                                            #
    # ------------------------------------------------------------------ #

    def class_counts(self) -> Dict[str, int]:
        """Return a dict of {class_name: sample_count} for this split."""
        inv_map = {v: k for k, v in LABEL_MAP.items()}
        counts: Dict[str, int] = {name: 0 for name in LABEL_MAP}
        for _, label in self.samples:
            counts[inv_map[label]] += 1
        return counts

    def __repr__(self) -> str:
        counts = self.class_counts()
        return (
            f"CertificateDataset("
            f"split={self.split!r}, "
            f"genuine={counts['genuine']}, "
            f"fake={counts['fake']}, "
            f"total={len(self)})"
        )
