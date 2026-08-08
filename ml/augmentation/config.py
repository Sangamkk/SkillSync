"""
Augmentation configuration settings.

All augmentation parameters are centralized here so transforms.py and
preview.py read from a single source of truth.  Edit values in
AugmentationConfig to tune the pipeline without touching transform code.

Design constraints (certificate domain):
  ✓  Resize to 224×224   — EfficientNet input requirement
  ✓  Rotation ±5°        — Slight scanner tilt only
  ✓  Brightness ±20%     — Different lighting conditions
  ✓  Contrast  ±20%      — Different scanner/device variation
  ✓  Sharpness (small)   — Image quality variation
  ✓  JPEG compression    — Simulate downloaded / re-saved files
  ✓  ImageNet normalize  — Required for pretrained EfficientNet weights

  ✗  Horizontal / Vertical flip  — Never realistic for certificates
  ✗  90° or large rotation       — Never realistic
  ✗  Heavy blur                  — Destroys certificate detail
  ✗  Large random crop           — Changes certificate layout
"""

from dataclasses import dataclass
from typing import Tuple


@dataclass
class AugmentationConfig:
    """Holds all hyperparameters for the torchvision augmentation pipeline."""

    # ------------------------------------------------------------------ #
    # Resize — EfficientNet expects 224×224                               #
    # ------------------------------------------------------------------ #

    image_size: int = 224  # both height and width

    # ------------------------------------------------------------------ #
    # Geometric (safe, subtle only)                                        #
    # ------------------------------------------------------------------ #

    # Random rotation: angle sampled from [-max_rotation_deg, +max_rotation_deg]
    # Keep at ≤5° — larger angles are not realistic for scanned certificates
    max_rotation_deg: float = 5.0

    # Fill value used when rotating (0 = black border, matches BORDER_CONSTANT)
    rotation_fill: int = 0

    # ------------------------------------------------------------------ #
    # Colour jitter                                                        #
    # ------------------------------------------------------------------ #

    # torchvision ColorJitter brightness factor range: (1-delta, 1+delta)
    brightness_delta: float = 0.20   # ±20 %

    # torchvision ColorJitter contrast factor range: (1-delta, 1+delta)
    contrast_delta: float = 0.20     # ±20 %

    # Saturation jitter — keep at 0 for scanned documents (mostly greyscale)
    saturation_delta: float = 0.0

    # Hue jitter — 0 for document images
    hue_delta: float = 0.0

    # ------------------------------------------------------------------ #
    # Sharpness                                                            #
    # ------------------------------------------------------------------ #

    # torchvision RandomAdjustSharpness sharpness_factor range (1.0 = original)
    sharpness_factor: float = 1.5   # modest sharpening
    sharpness_prob: float = 0.3     # applied with this probability

    # ------------------------------------------------------------------ #
    # JPEG compression artefacts                                           #
    # ------------------------------------------------------------------ #

    # Simulated JPEG quality range — mild degradation only
    jpeg_quality_range: Tuple[int, int] = (75, 95)

    # Probability of applying JPEG re-compression per sample
    jpeg_prob: float = 0.3

    # ------------------------------------------------------------------ #
    # Normalization — ImageNet statistics (required for pretrained weights) #
    # ------------------------------------------------------------------ #

    normalize_mean: Tuple[float, float, float] = (0.485, 0.456, 0.406)
    normalize_std:  Tuple[float, float, float] = (0.229, 0.224, 0.225)

    # ------------------------------------------------------------------ #
    # Pipeline control                                                     #
    # ------------------------------------------------------------------ #

    # Random seed for reproducibility; None = non-deterministic
    seed: int | None = None

    # How many augmented copies to generate per source image (offline aug)
    copies_per_image: int = 5

    # ------------------------------------------------------------------ #
    # Explicitly disabled — do NOT enable these for certificates          #
    # ------------------------------------------------------------------ #

    # flip_horizontal: always False — unrealistic for certificates
    # flip_vertical:   always False — unrealistic for certificates
    # large_rotation:  max_rotation_deg is capped at 5° by convention
    # heavy_blur:      not in pipeline
    # large_crop:      not in pipeline


# Module-level default instance — import and use directly.
DEFAULT_CONFIG = AugmentationConfig()
