"""
config.py
---------
Central configuration for the certificate authenticity detection pipeline.
All paths, hyperparameters, and training settings live here so that
the other modules stay free of hard-coded values.

Quick-reference — recommended training parameters
──────────────────────────────────────────────────
  Parameter          Value
  ─────────────────────────────────────────────
  Epochs             30
  Batch size         32  (16 if low VRAM)
  Learning rate      0.0001  (1e-4)
  Optimizer          AdamW  (weight decay 1e-4)
  Loss function      CrossEntropyLoss  (class-weighted)
  Device             CUDA if available, else CPU
  Random seed        42  (fully reproducible runs)
  ─────────────────────────────────────────────
"""

import os
import random
from pathlib import Path

# ---------------------------------------------------------------------------
# Project root & key directories
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent          # certificate-ai/
DATASET_DIR           = BASE_DIR / "dataset"
PROCESSED_DATASET_DIR = BASE_DIR / "processed_dataset"    # structured split folder
MODELS_DIR  = BASE_DIR / "models"
CHECKPOINTS_DIR = MODELS_DIR / "checkpoints"
LOGS_DIR    = BASE_DIR / "logs"
OUTPUTS_DIR = BASE_DIR / "outputs" / "detection"

# Evaluation uses ONLY the test split — never train or val.
# Expected layout:
#   processed_dataset/
#       test/
#           genuine/
#           fake/
TEST_DIR = PROCESSED_DATASET_DIR / "test"

# Create output dirs at import time so nothing crashes on first run
for _d in (CHECKPOINTS_DIR, LOGS_DIR, OUTPUTS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------
# Top-level binary classes that map to dataset sub-folders
CLASS_NAMES  = ["genuine", "fake"]          # index 0 = genuine, 1 = fake
NUM_CLASSES  = len(CLASS_NAMES)

# Image pre-processing
IMAGE_SIZE   = 224          # resize to (IMAGE_SIZE × IMAGE_SIZE)
MEAN         = [0.485, 0.456, 0.406]   # ImageNet stats (used for transfer learning)
STD          = [0.229, 0.224, 0.225]

# Train / val / test split ratios (must sum to 1.0)
TRAIN_RATIO  = 0.70
VAL_RATIO    = 0.15
TEST_RATIO   = 0.15

RANDOM_SEED  = 42

# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------
MODEL_NAME       = "efficientnet_b0"   # backbone; see model.py for options
PRETRAINED       = True                # use ImageNet pre-trained weights
FREEZE_BACKBONE  = False               # freeze backbone during warm-up if True
DROPOUT_RATE     = 0.3

# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------
EPOCHS           = 30
BATCH_SIZE       = 32
NUM_WORKERS      = 0        # set >0 on Linux/Mac; keep 0 on Windows to avoid issues
PIN_MEMORY       = False    # set True when using CUDA

LEARNING_RATE    = 1e-4
WEIGHT_DECAY     = 1e-4
LR_SCHEDULER     = "cosine"   # "cosine" | "step" | "none"
LR_STEP_SIZE     = 10          # used only when LR_SCHEDULER == "step"
LR_GAMMA         = 0.1         # used only when LR_SCHEDULER == "step"

# Class-imbalance handling
USE_CLASS_WEIGHTS = True       # compute inverse-frequency weights for CrossEntropy

# Early stopping
EARLY_STOPPING_PATIENCE = 7

# ---------------------------------------------------------------------------
# Checkpointing
# ---------------------------------------------------------------------------
CHECKPOINT_EVERY_N_EPOCHS = 5          # save a periodic checkpoint every N epochs

# Internal checkpoint — used by train.py (full state for resuming training)
BEST_MODEL_PATH  = CHECKPOINTS_DIR / "best_model.pth"
LAST_MODEL_PATH  = CHECKPOINTS_DIR / "last_model.pth"

# Canonical best-model path — the single file used by evaluation, prediction,
# and deployment.  Name matches the expected path from Step 1 of evaluation.
BEST_MODEL_CANONICAL_PATH = MODELS_DIR / "certificate_detector_best.pth"

# ---------------------------------------------------------------------------
# Evaluation / Prediction
# ---------------------------------------------------------------------------
CONFIDENCE_THRESHOLD = 0.5   # probability above which a sample is labelled fake

# ---------------------------------------------------------------------------
# Device  (auto-detected; override by setting DEVICE = "cpu" or "cuda")
# ---------------------------------------------------------------------------
import torch
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Update PIN_MEMORY automatically based on detected device
PIN_MEMORY = DEVICE == "cuda"


# ---------------------------------------------------------------------------
# Reproducibility
# ---------------------------------------------------------------------------
def set_seed(seed: int = RANDOM_SEED) -> None:
    """
    Set random seeds across every library that uses randomness so that
    experiments are fully reproducible run-to-run.

    Covers:
        Python built-in random
        NumPy
        PyTorch (CPU)
        PyTorch (CUDA, all GPUs)
        CuDNN deterministic mode

    Call this once at the very start of train.py before any data loading
    or model construction:
        from detection.config import set_seed
        set_seed()

    Args:
        seed: Integer seed value (default: RANDOM_SEED from config).
    """
    random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)

    try:
        import numpy as np
        np.random.seed(seed)
    except ImportError:
        pass

    torch.manual_seed(seed)
    torch.cuda.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)          # covers multi-GPU setups

    # Make CuDNN fully deterministic.
    # Note: disables some optimisations — remove if speed matters more than
    # exact reproducibility.
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark     = False


# Apply seed at import time so every module that imports config gets
# a reproducible random state from the very first line.
set_seed(RANDOM_SEED)


# ---------------------------------------------------------------------------
# Entry point — print full config table
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    D = "─" * 52
    print(f"\n{'═'*52}")
    print("  Certificate AI — Training Configuration")
    print(f"{'═'*52}")

    sections = {
        "Paths": {
            "BASE_DIR":          BASE_DIR,
            "DATASET_DIR":       DATASET_DIR,
            "CHECKPOINTS_DIR":   CHECKPOINTS_DIR,
            "LOGS_DIR":          LOGS_DIR,
            "OUTPUTS_DIR":       OUTPUTS_DIR,
        },
        "Dataset": {
            "CLASS_NAMES":       CLASS_NAMES,
            "NUM_CLASSES":       NUM_CLASSES,
            "IMAGE_SIZE":        f"{IMAGE_SIZE}×{IMAGE_SIZE}",
            "TRAIN/VAL/TEST":    f"{TRAIN_RATIO}/{VAL_RATIO}/{TEST_RATIO}",
        },
        "Model": {
            "MODEL_NAME":        MODEL_NAME,
            "PRETRAINED":        PRETRAINED,
            "FREEZE_BACKBONE":   FREEZE_BACKBONE,
            "DROPOUT_RATE":      DROPOUT_RATE,
        },
        "Training": {
            "EPOCHS":            EPOCHS,
            "BATCH_SIZE":        BATCH_SIZE,
            "LEARNING_RATE":     f"{LEARNING_RATE:.0e}",
            "WEIGHT_DECAY":      f"{WEIGHT_DECAY:.0e}",
            "OPTIMIZER":         "AdamW",
            "LOSS_FUNCTION":     "CrossEntropyLoss (class-weighted)",
            "LR_SCHEDULER":      LR_SCHEDULER,
            "USE_CLASS_WEIGHTS": USE_CLASS_WEIGHTS,
        },
        "Reproducibility": {
            "RANDOM_SEED":       RANDOM_SEED,
            "python random":     "seeded ✓",
            "numpy":             "seeded ✓",
            "torch CPU":         "seeded ✓",
            "torch CUDA":        "seeded ✓",
            "cudnn.deterministic": torch.backends.cudnn.deterministic,
        },
        "Device & Runtime": {
            "DEVICE":            DEVICE,
            "CUDA available":    torch.cuda.is_available(),
            "PIN_MEMORY":        PIN_MEMORY,
            "NUM_WORKERS":       NUM_WORKERS,
        },
        "Early Stopping & Checkpoints": {
            "EARLY_STOPPING_PATIENCE":   EARLY_STOPPING_PATIENCE,
            "CHECKPOINT_EVERY_N_EPOCHS": CHECKPOINT_EVERY_N_EPOCHS,
            "BEST_MODEL_PATH":   BEST_MODEL_PATH.name,
            "LAST_MODEL_PATH":   LAST_MODEL_PATH.name,
            "CONFIDENCE_THRESHOLD": CONFIDENCE_THRESHOLD,
        },
    }

    for section, params in sections.items():
        print(f"\n  {section}")
        print(f"  {D}")
        for key, val in params.items():
            print(f"  {key:<30}  {val}")

    print(f"\n{'═'*52}\n")
