"""
data/dataloader.py
==================

Factory function that builds train, val, and test DataLoaders with the
correct transforms wired to each split.

The golden rule enforced here
------------------------------

    split      transform applied
    ---------  ------------------------------------
    train   →  get_train_transforms()   ← random augmentation
    val     →  get_val_transforms()     ← resize + normalize only
    test    →  get_val_transforms()     ← resize + normalize only

Augmentation is NEVER applied during validation or testing.

Usage
-----
    from data.dataloader import build_dataloaders
    from augmentation import AugmentationConfig

    cfg = AugmentationConfig()
    loaders = build_dataloaders("dataset", config=cfg, batch_size=32)

    train_loader = loaders["train"]
    val_loader   = loaders["val"]
    test_loader  = loaders["test"]   # optional, may be None

    for images, labels in train_loader:
        # images: Tensor (B, 3, 224, 224)  — augmented
        # labels: Tensor (B,)              — 0=genuine, 1=fake
        ...

    for images, labels in val_loader:
        # images: Tensor (B, 3, 224, 224)  — no augmentation
        ...
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict, Optional

from torch.utils.data import DataLoader

from augmentation.config import AugmentationConfig, DEFAULT_CONFIG
from augmentation.transforms import get_train_transforms, get_val_transforms
from data.dataset import CertificateDataset


# --------------------------------------------------------------------------- #
# Public factory                                                                #
# --------------------------------------------------------------------------- #

def build_dataloaders(
    dataset_root: str | Path,
    config: AugmentationConfig = DEFAULT_CONFIG,
    batch_size: int = 32,
    num_workers: int = 0,
    val_fraction: float = 0.15,
    test_fraction: float = 0.15,
    seed: int = 42,
    pin_memory: bool = False,
    drop_last_train: bool = True,
) -> Dict[str, Optional[DataLoader]]:
    """
    Build and return train, val, and test DataLoaders.

    Transform assignment
    --------------------
    - ``train`` split  →  ``get_train_transforms(config)``
      Full augmentation pipeline (rotation, colour jitter, sharpness, JPEG).

    - ``val`` split    →  ``get_val_transforms(config)``
      Deterministic: Resize(224) + ToTensor + Normalize only.
      No randomness whatsoever.

    - ``test`` split   →  ``get_val_transforms(config)``
      Identical to val — deterministic evaluation.

    Parameters
    ----------
    dataset_root : str | Path
        Root of the dataset, containing ``genuine/`` and ``fake/`` folders.
    config : AugmentationConfig
        Controls image size, augmentation strength, and normalization stats.
    batch_size : int
        Samples per mini-batch for all loaders.  Default: 32.
    num_workers : int
        Subprocesses for data loading.  0 = load in the main process
        (safest default on Windows).
    val_fraction : float
        Fraction of each class to reserve for validation.  Default: 0.15.
    test_fraction : float
        Fraction of each class to reserve for test.  Default: 0.15.
    seed : int
        Random seed for the stratified split.  Default: 42.
    pin_memory : bool
        Pin memory for faster CPU → GPU transfers.  Set True when using GPU.
    drop_last_train : bool
        Drop the last incomplete batch in the training loader (keeps batch
        size consistent when using BatchNorm).  Default: True.

    Returns
    -------
    Dict[str, DataLoader | None]
        Keys: ``"train"``, ``"val"``, ``"test"``.
        A value is None when the corresponding split is empty (e.g. tiny
        dataset where test_fraction rounds to zero samples).
    """
    root = Path(dataset_root)

    # ------------------------------------------------------------------ #
    # Build transform objects — one instance each, reused per split       #
    # ------------------------------------------------------------------ #
    # Training: full random augmentation pipeline
    train_transform = get_train_transforms(config)

    # Val / test: deterministic — resize + normalize ONLY
    eval_transform  = get_val_transforms(config)

    # ------------------------------------------------------------------ #
    # Build datasets                                                       #
    # ------------------------------------------------------------------ #
    shared_split_kwargs = dict(
        root=root,
        val_fraction=val_fraction,
        test_fraction=test_fraction,
        seed=seed,
    )

    ds_train = CertificateDataset(
        split="train",
        transform=train_transform,   # ← augmentation ON
        **shared_split_kwargs,
    )
    ds_val = CertificateDataset(
        split="val",
        transform=eval_transform,    # ← augmentation OFF
        **shared_split_kwargs,
    )
    ds_test = CertificateDataset(
        split="test",
        transform=eval_transform,    # ← augmentation OFF
        **shared_split_kwargs,
    )

    # ------------------------------------------------------------------ #
    # Report split sizes                                                   #
    # ------------------------------------------------------------------ #
    print(f"[dataloader] {ds_train}")
    print(f"[dataloader] {ds_val}")
    print(f"[dataloader] {ds_test}")

    # ------------------------------------------------------------------ #
    # Shared DataLoader kwargs                                             #
    # ------------------------------------------------------------------ #
    shared_loader_kwargs = dict(
        batch_size=batch_size,
        num_workers=num_workers,
        pin_memory=pin_memory,
    )

    # ------------------------------------------------------------------ #
    # Build loaders — return None for empty splits                        #
    # ------------------------------------------------------------------ #
    train_loader: Optional[DataLoader] = (
        DataLoader(
            ds_train,
            shuffle=True,            # shuffle training order every epoch
            drop_last=drop_last_train,
            **shared_loader_kwargs,
        )
        if len(ds_train) > 0 else None
    )

    val_loader: Optional[DataLoader] = (
        DataLoader(
            ds_val,
            shuffle=False,           # deterministic evaluation order
            drop_last=False,
            **shared_loader_kwargs,
        )
        if len(ds_val) > 0 else None
    )

    test_loader: Optional[DataLoader] = (
        DataLoader(
            ds_test,
            shuffle=False,           # deterministic evaluation order
            drop_last=False,
            **shared_loader_kwargs,
        )
        if len(ds_test) > 0 else None
    )

    return {
        "train": train_loader,
        "val":   val_loader,
        "test":  test_loader,
    }


# --------------------------------------------------------------------------- #
# Convenience: single-split loader                                             #
# --------------------------------------------------------------------------- #

def get_loader(
    dataset_root: str | Path,
    split: str,
    config: AugmentationConfig = DEFAULT_CONFIG,
    batch_size: int = 32,
    num_workers: int = 0,
    val_fraction: float = 0.15,
    test_fraction: float = 0.15,
    seed: int = 42,
    pin_memory: bool = False,
) -> Optional[DataLoader]:
    """
    Return a single DataLoader for the requested split.

    The correct transform is selected automatically:
    - ``split="train"``  →  augmentation ON
    - ``split="val"``    →  augmentation OFF
    - ``split="test"``   →  augmentation OFF

    Parameters
    ----------
    dataset_root : str | Path
        Dataset root directory.
    split : str
        ``"train"``, ``"val"``, or ``"test"``.
    config : AugmentationConfig
        Pipeline configuration.
    batch_size : int
        Samples per mini-batch.
    num_workers : int
        Data-loading subprocesses (0 = main process).
    val_fraction : float
        Fraction reserved for validation.
    test_fraction : float
        Fraction reserved for test.
    seed : int
        Split seed.
    pin_memory : bool
        Pin memory for GPU transfers.

    Returns
    -------
    DataLoader | None
        None if the split is empty.
    """
    loaders = build_dataloaders(
        dataset_root=dataset_root,
        config=config,
        batch_size=batch_size,
        num_workers=num_workers,
        val_fraction=val_fraction,
        test_fraction=test_fraction,
        seed=seed,
        pin_memory=pin_memory,
    )
    return loaders[split]
