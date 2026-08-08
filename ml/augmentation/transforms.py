"""
Augmentation pipeline for certificate images — torchvision implementation.

Two pipeline variants are provided:

* ``get_train_transforms(cfg)``  — full augmentation for training
* ``get_val_transforms(cfg)``    — deterministic resize + normalize only
                                   (used for validation / inference)

Both return a ``torchvision.transforms.Compose`` object that accepts a
PIL Image and outputs a normalised ``torch.Tensor`` of shape (3, 224, 224).

A helper ``AugmentationPipeline`` wraps the torchvision compose and also
supports numpy (BGR, uint8) input/output so that preview.py can reuse it
without a separate OpenCV pipeline.

Usage
-----
    from augmentation.transforms import get_train_transforms, get_val_transforms
    from augmentation.config import AugmentationConfig

    cfg = AugmentationConfig(brightness_delta=0.25)
    train_tf = get_train_transforms(cfg)
    val_tf   = get_val_transforms(cfg)

    # With a PIL image:
    tensor = train_tf(pil_image)           # → torch.Tensor (3, 224, 224)

    # With a numpy BGR array (e.g. from cv2.imread):
    from augmentation.transforms import AugmentationPipeline
    pipeline = AugmentationPipeline(cfg)
    aug_np   = pipeline.apply(bgr_array)   # → numpy BGR uint8

Safe augmentations included
---------------------------
  ✓ Resize 224×224
  ✓ RandomRotation ±5°
  ✓ ColorJitter brightness ±20 %, contrast ±20 %
  ✓ RandomAdjustSharpness (small factor, low probability)
  ✓ RandomApply JPEG compression (mild, low probability)
  ✓ ToTensor + Normalize (ImageNet statistics)

Augmentations intentionally excluded
-------------------------------------
  ✗ HorizontalFlip / VerticalFlip  — unrealistic for certificates
  ✗ Rotation > 5°                  — unrealistic
  ✗ Heavy blur                     — destroys certificate detail
  ✗ Large random crop              — changes certificate layout
"""

from __future__ import annotations

import io
import random
from typing import List, Optional

import cv2
import numpy as np
from PIL import Image

import torch
import torchvision.transforms as T
import torchvision.transforms.functional as TF

from augmentation.config import AugmentationConfig, DEFAULT_CONFIG


# --------------------------------------------------------------------------- #
# Custom transform: JPEG compression artefacts                                 #
# --------------------------------------------------------------------------- #

class RandomJpegCompression:
    """
    Torchvision-compatible transform that re-encodes a PIL image as JPEG at a
    randomly sampled quality level, then decodes it back to PIL.

    This simulates the artefacts present in certificates that have been
    saved, uploaded, or downloaded as JPEG files.

    Parameters
    ----------
    quality_range : (int, int)
        Inclusive (min, max) JPEG quality.  Higher = better quality.
        Recommended: (75, 95) for mild degradation.
    p : float
        Probability of applying the transform.
    """

    def __init__(
        self,
        quality_range: tuple[int, int] = (75, 95),
        p: float = 0.3,
    ) -> None:
        self.quality_range = quality_range
        self.p = p

    def __call__(self, img: Image.Image) -> Image.Image:
        if random.random() > self.p:
            return img
        quality = random.randint(*self.quality_range)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality)
        buffer.seek(0)
        return Image.open(buffer).copy()

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"quality_range={self.quality_range}, p={self.p})"
        )


# --------------------------------------------------------------------------- #
# Pipeline builders                                                             #
# --------------------------------------------------------------------------- #

def get_train_transforms(config: AugmentationConfig = DEFAULT_CONFIG) -> T.Compose:
    """
    Build the training augmentation pipeline.

    Input  : PIL Image (any size, RGB)
    Output : torch.Tensor of shape (3, 224, 224), normalised with ImageNet stats

    Transform order
    ---------------
    1. Resize to (image_size × image_size) — deterministic, always first
    2. RandomRotation ±max_rotation_deg    — subtle scanner-tilt simulation
    3. ColorJitter brightness + contrast   — lighting / scanner variation
    4. RandomAdjustSharpness               — image quality variation
    5. RandomJpegCompression               — downloaded / re-saved file artefacts
    6. ToTensor                            — PIL → float32 tensor [0, 1]
    7. Normalize (ImageNet mean / std)     — required for pretrained EfficientNet
    """
    cfg = config
    return T.Compose([
        # 1. Resize
        T.Resize((cfg.image_size, cfg.image_size)),

        # 2. Subtle rotation only — scanner tilt
        T.RandomRotation(
            degrees=cfg.max_rotation_deg,
            interpolation=T.InterpolationMode.BILINEAR,
            fill=cfg.rotation_fill,
        ),

        # 3. Colour jitter — brightness and contrast only
        #    saturation and hue are 0 (document images)
        T.ColorJitter(
            brightness=cfg.brightness_delta,
            contrast=cfg.contrast_delta,
            saturation=cfg.saturation_delta,
            hue=cfg.hue_delta,
        ),

        # 4. Sharpness — mild, applied with low probability
        T.RandomAdjustSharpness(
            sharpness_factor=cfg.sharpness_factor,
            p=cfg.sharpness_prob,
        ),

        # 5. JPEG compression artefacts — mild, applied with low probability
        RandomJpegCompression(
            quality_range=cfg.jpeg_quality_range,
            p=cfg.jpeg_prob,
        ),

        # 6 + 7. Tensor conversion + ImageNet normalisation
        T.ToTensor(),
        T.Normalize(mean=cfg.normalize_mean, std=cfg.normalize_std),
    ])


def get_val_transforms(config: AugmentationConfig = DEFAULT_CONFIG) -> T.Compose:
    """
    Build the validation / inference pipeline (no augmentation).

    Input  : PIL Image (any size, RGB)
    Output : torch.Tensor of shape (3, 224, 224), normalised with ImageNet stats
    """
    cfg = config
    return T.Compose([
        T.Resize((cfg.image_size, cfg.image_size)),
        T.ToTensor(),
        T.Normalize(mean=cfg.normalize_mean, std=cfg.normalize_std),
    ])


# --------------------------------------------------------------------------- #
# AugmentationPipeline — numpy-compatible wrapper                               #
# --------------------------------------------------------------------------- #

class AugmentationPipeline:
    """
    Thin wrapper around the torchvision training pipeline that accepts and
    returns numpy BGR arrays (as produced by cv2.imread).

    This keeps preview.py and any OpenCV-based scripts compatible without
    duplicating augmentation logic.

    Parameters
    ----------
    config : AugmentationConfig
        Pipeline settings.  Defaults to DEFAULT_CONFIG.
    """

    def __init__(self, config: AugmentationConfig = DEFAULT_CONFIG) -> None:
        self.cfg = config
        self._transform = get_train_transforms(config)

        if config.seed is not None:
            random.seed(config.seed)
            np.random.seed(config.seed)
            torch.manual_seed(config.seed)

    # ------------------------------------------------------------------ #
    # Conversion helpers                                                   #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _bgr_to_pil(image: np.ndarray) -> Image.Image:
        """Convert a BGR uint8 numpy array to a PIL RGB image."""
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        return Image.fromarray(rgb)

    @staticmethod
    def _tensor_to_bgr(tensor: torch.Tensor, cfg: AugmentationConfig) -> np.ndarray:
        """
        Denormalise an ImageNet-normalised (3, H, W) tensor back to a
        BGR uint8 numpy array for display / saving with OpenCV.
        """
        mean = torch.tensor(cfg.normalize_mean).view(3, 1, 1)
        std  = torch.tensor(cfg.normalize_std).view(3, 1, 1)
        denorm = tensor * std + mean                          # [0, 1]
        denorm = denorm.clamp(0.0, 1.0)
        rgb_np = (denorm.permute(1, 2, 0).numpy() * 255).astype(np.uint8)
        return cv2.cvtColor(rgb_np, cv2.COLOR_RGB2BGR)

    # ------------------------------------------------------------------ #
    # Public API                                                           #
    # ------------------------------------------------------------------ #

    def apply(self, image: np.ndarray) -> np.ndarray:
        """
        Apply one random augmentation pass to a BGR uint8 numpy array.

        Parameters
        ----------
        image : np.ndarray
            BGR uint8 array as returned by cv2.imread().

        Returns
        -------
        np.ndarray
            Augmented BGR uint8 array of shape (image_size, image_size, 3).
        """
        pil   = self._bgr_to_pil(image)
        tensor = self._transform(pil)
        return self._tensor_to_bgr(tensor, self.cfg)

    def apply_to_tensor(self, image: np.ndarray) -> torch.Tensor:
        """
        Apply one random augmentation pass and return a normalised tensor.

        Parameters
        ----------
        image : np.ndarray
            BGR uint8 array as returned by cv2.imread().

        Returns
        -------
        torch.Tensor
            Shape (3, image_size, image_size), ImageNet-normalised float32.
        """
        pil = self._bgr_to_pil(image)
        return self._transform(pil)

    def augment(
        self,
        image: np.ndarray,
        n: Optional[int] = None,
    ) -> List[np.ndarray]:
        """
        Generate *n* independently augmented BGR copies of *image*.

        Parameters
        ----------
        image : np.ndarray
            Source BGR uint8 array.
        n : int, optional
            Number of copies.  Falls back to ``config.copies_per_image``.

        Returns
        -------
        List[np.ndarray]
            List of augmented BGR uint8 arrays.
        """
        count = n if n is not None else self.cfg.copies_per_image
        return [self.apply(image) for _ in range(count)]
