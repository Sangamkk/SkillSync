"""
certificate-ai · augmentation
==============================

Public surface of the augmentation package.  Import the key symbols
directly from ``augmentation`` without drilling into sub-modules:

    from augmentation import AugmentationConfig, DEFAULT_CONFIG
    from augmentation import get_train_transforms, get_val_transforms
    from augmentation import AugmentationPipeline
    from augmentation import show_augmentation_grid, save_augmentation_grid

Sub-modules
-----------
config      — AugmentationConfig dataclass and DEFAULT_CONFIG instance
transforms  — torchvision pipeline builders + AugmentationPipeline
preview     — Grid visualisation helpers (show / save)
"""

from augmentation.config import AugmentationConfig, DEFAULT_CONFIG
from augmentation.transforms import (
    get_train_transforms,
    get_val_transforms,
    RandomJpegCompression,
    AugmentationPipeline,
)
from augmentation.preview import (
    show_augmentation_grid,
    save_augmentation_grid,
    preview_single,
)

__all__ = [
    # Config
    "AugmentationConfig",
    "DEFAULT_CONFIG",
    # Transform builders
    "get_train_transforms",
    "get_val_transforms",
    "RandomJpegCompression",
    # Numpy-compatible wrapper
    "AugmentationPipeline",
    # Preview helpers
    "show_augmentation_grid",
    "save_augmentation_grid",
    "preview_single",
]
