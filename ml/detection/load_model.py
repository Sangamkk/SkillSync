"""
load_model.py
-------------
Single entry point for loading the best-performing certificate detector.

Expected file
─────────────
    models/
        certificate_detector_best.pth

This file is written by train.py every time the model achieves a new
best validation loss.  It contains:

    {
        "epoch":                 int    — epoch at which the best val loss occurred
        "model_state_dict":      dict   — EfficientNet-B0 weights (fine-tuned)
        "optimizer_state_dict":  dict   — AdamW state (for resuming training)
        "val_loss":              float  — best validation CrossEntropyLoss
        "val_acc":               float  — validation accuracy at that epoch
    }

Usage
─────
    # Load and inspect
    python -m detection.load_model

    # Programmatic
    from detection.load_model import load_best_model
    model = load_best_model()               # ready for inference
    model = load_best_model(device="cuda")  # explicit device
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import torch
import torch.nn as nn

from detection.config import (
    BEST_MODEL_CANONICAL_PATH,
    BEST_MODEL_PATH,
    DEVICE,
    MODEL_NAME,
    NUM_CLASSES,
    CLASS_NAMES,
)
from detection.model import build_model


# ─────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────

def _resolve_path(path: Optional[str | Path]) -> Path:
    """
    Return the checkpoint path to load from.

    Priority order:
        1. Explicit *path* argument (if provided)
        2. models/certificate_detector_best.pth  (canonical, used in production)
        3. models/checkpoints/best_model.pth     (fallback from train.py)
    """
    if path is not None:
        return Path(path)

    if BEST_MODEL_CANONICAL_PATH.exists():
        return BEST_MODEL_CANONICAL_PATH

    if BEST_MODEL_PATH.exists():
        return BEST_MODEL_PATH

    raise FileNotFoundError(
        "No trained model found. Expected one of:\n"
        f"  {BEST_MODEL_CANONICAL_PATH}\n"
        f"  {BEST_MODEL_PATH}\n"
        "Run 'python -m detection.train' first to produce a checkpoint."
    )


def _print_load_report(
    path:      Path,
    meta:      dict,
    model:     nn.Module,
    device:    str,
) -> None:
    """Print a structured report after loading a checkpoint."""
    total     = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)

    D = "─" * 56
    print(f"\n{'═'*56}")
    print("  Model Load Report")
    print(f"{'═'*56}")
    print(f"  File       : {path.name}")
    print(f"  Full path  : {path}")
    print(D)
    print(f"  Backbone   : {MODEL_NAME}")
    print(f"  Classes    : {NUM_CLASSES}  {CLASS_NAMES}")
    print(f"  Total params    : {total:>12,}")
    print(f"  Trainable params: {trainable:>12,}")
    print(D)
    print(f"  Saved at epoch  : {meta.get('epoch',  'unknown')}")
    print(f"  Val loss        : {meta.get('val_loss', 'unknown')}")
    print(f"  Val accuracy    : {meta.get('val_acc',  'unknown')}")
    print(D)
    print(f"  Device     : {device}")
    print(f"  Mode       : eval  (inference-ready)")
    print(f"{'═'*56}\n")


# ─────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────

def load_best_model(
    path:   Optional[str | Path] = None,
    device: str = DEVICE,
    verbose: bool = True,
) -> nn.Module:
    """
    Load the best trained certificate detector and return it in eval mode.

    Handles two checkpoint formats:
        • Wrapped dict   {"model_state_dict": ..., "epoch": ..., ...}
          Written by train.py — includes epoch, val_loss, val_acc metadata.
        • Raw state_dict  {layer_name: tensor, ...}
          Written with torch.save(model.state_dict(), path).

    Args:
        path:    Path to a .pth file.  If None the canonical path
                 models/certificate_detector_best.pth is used, falling
                 back to models/checkpoints/best_model.pth.
        device:  "cpu" or "cuda".  Defaults to config.DEVICE.
        verbose: Print a load report (default True).

    Returns:
        nn.Module — EfficientNet-B0 with custom ClassifierHead,
                    loaded weights, set to eval mode, moved to *device*.
    """
    checkpoint_path = _resolve_path(path)

    # ── Load file ─────────────────────────────────────────────────────────
    raw = torch.load(
        checkpoint_path,
        map_location=device,
        weights_only=True,
    )

    # ── Build fresh model architecture ───────────────────────────────────
    model = build_model()

    # ── Extract weights and metadata ─────────────────────────────────────
    if isinstance(raw, dict) and "model_state_dict" in raw:
        # Wrapped format (train.py default)
        model.load_state_dict(raw["model_state_dict"])
        meta = {k: v for k, v in raw.items() if k != "model_state_dict"}
    else:
        # Raw state_dict
        model.load_state_dict(raw)
        meta = {}

    # ── Move to device and set eval mode ─────────────────────────────────
    model.to(device)
    model.eval()   # inference mode: Dropout off, BatchNorm uses running stats

    if verbose:
        _print_load_report(checkpoint_path, meta, model, device)

    return model


def get_checkpoint_info(
    path: Optional[str | Path] = None,
) -> dict:
    """
    Return metadata from a checkpoint without building the full model.

    Useful for quickly inspecting what epoch and validation metrics
    are stored in a .pth file.

    Returns:
        dict with keys: epoch, val_loss, val_acc, file, exists
    """
    try:
        checkpoint_path = _resolve_path(path)
    except FileNotFoundError:
        return {"exists": False, "file": str(BEST_MODEL_CANONICAL_PATH)}

    raw = torch.load(
        checkpoint_path,
        map_location="cpu",
        weights_only=True,
    )

    if isinstance(raw, dict) and "model_state_dict" in raw:
        return {
            "exists":   True,
            "file":     str(checkpoint_path),
            "epoch":    raw.get("epoch",    "unknown"),
            "val_loss": raw.get("val_loss", "unknown"),
            "val_acc":  raw.get("val_acc",  "unknown"),
        }

    return {
        "exists": True,
        "file":   str(checkpoint_path),
        "epoch":  "unknown (raw state_dict format)",
    }


# ─────────────────────────────────────────────────────────────────────────
# Entry point  (python -m detection.load_model)
# ─────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    # ── Check what files exist ────────────────────────────────────────────
    print(f"\n  Canonical path : {BEST_MODEL_CANONICAL_PATH}")
    print(f"  Exists         : {BEST_MODEL_CANONICAL_PATH.exists()}")
    print(f"  Fallback path  : {BEST_MODEL_PATH}")
    print(f"  Exists         : {BEST_MODEL_PATH.exists()}")

    # ── Inspect metadata without loading full model ───────────────────────
    info = get_checkpoint_info()
    if not info["exists"]:
        print(
            "\n  No checkpoint found.\n"
            "  Run  python -m detection.train  to train the model first.\n"
        )
        sys.exit(0)

    print(f"\n  Checkpoint metadata:")
    for k, v in info.items():
        print(f"    {k:<12}  {v}")

    # ── Full load ─────────────────────────────────────────────────────────
    model = load_best_model(device=DEVICE, verbose=True)

    # ── Smoke test ────────────────────────────────────────────────────────
    dummy  = torch.randn(4, 3, 224, 224).to(DEVICE)
    with torch.no_grad():
        logits = model(dummy)
        probs  = torch.softmax(logits, dim=1)

    print(f"  Forward pass  : input {tuple(dummy.shape)} → output {tuple(logits.shape)}")
    print(f"  Sample probs  :")
    for i, (p_gen, p_fake) in enumerate(probs.tolist()):
        verdict = "FAKE" if p_fake >= 0.5 else "GENUINE"
        print(f"    [{i}]  genuine={p_gen:.4f}  fake={p_fake:.4f}  → {verdict}")

    # Training mode must NOT be active after load
    assert not model.training, "Model must be in eval mode after load_best_model()"
    print(f"\n  model.training = {model.training}  (must be False for inference)  ✓")
    print("  Model is ready for evaluation and prediction.\n")
