"""
evaluate.py
-----------
Evaluation utilities for the certificate authenticity detection model.

Usage (from project root, with venv active):
    # evaluate the best saved model on the test split
    python -m detection.evaluate

    # or import and call directly:
    from detection.evaluate import evaluate_model
    results = evaluate_model(model, test_loader)

Outputs:
    - Printed classification report (precision / recall / F1 per class)
    - Confusion matrix saved to outputs/detection/confusion_matrix.png
    - JSON results file saved to outputs/detection/eval_results.json
"""

import json
from pathlib import Path
from typing import Dict, Optional, Tuple

import torch
import torch.nn as nn
import numpy as np
import matplotlib
matplotlib.use("Agg")           # headless backend — safe on all platforms
import matplotlib.pyplot as plt
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    accuracy_score,
    f1_score,
)
from torch.utils.data import DataLoader
from tqdm import tqdm

from detection.config import (
    DEVICE, CLASS_NAMES, OUTPUTS_DIR,
    BEST_MODEL_PATH, BATCH_SIZE,
)
from detection.dataset import get_dataloaders
from detection.model import build_model, load_checkpoint


# ---------------------------------------------------------------------------
# Core: run inference over a DataLoader and collect predictions
# ---------------------------------------------------------------------------
@torch.no_grad()
def collect_predictions(
    model: nn.Module,
    loader: DataLoader,
    device: str = DEVICE,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Run model over *loader* and collect ground-truth labels,
    predicted labels, and predicted probabilities for the positive class.

    Returns:
        y_true  : shape (N,)  integer labels
        y_pred  : shape (N,)  predicted class indices
        y_prob  : shape (N,)  probability of class index 1 (fake)
    """
    model.eval()
    all_labels, all_preds, all_probs = [], [], []

    for images, labels in tqdm(loader, desc="Evaluating", leave=False, unit="batch"):
        images = images.to(device, non_blocking=True)
        logits = model(images)
        probs  = torch.softmax(logits, dim=1)

        all_labels.append(labels.cpu().numpy())
        all_preds.append(probs.argmax(dim=1).cpu().numpy())
        all_probs.append(probs[:, 1].cpu().numpy())   # prob of "fake"

    return (
        np.concatenate(all_labels),
        np.concatenate(all_preds),
        np.concatenate(all_probs),
    )


# ---------------------------------------------------------------------------
# Confusion matrix plot
# ---------------------------------------------------------------------------
def plot_confusion_matrix(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    class_names: list = CLASS_NAMES,
    save_path: Optional[Path] = None,
) -> None:
    """Plot and optionally save a normalised confusion matrix."""
    cm = confusion_matrix(y_true, y_pred)
    cm_norm = cm.astype(float) / cm.sum(axis=1, keepdims=True)

    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(cm_norm, interpolation="nearest", cmap="Blues")
    fig.colorbar(im, ax=ax)

    ax.set(
        xticks=range(len(class_names)),
        yticks=range(len(class_names)),
        xticklabels=class_names,
        yticklabels=class_names,
        xlabel="Predicted label",
        ylabel="True label",
        title="Confusion Matrix (normalised)",
    )

    thresh = cm_norm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(
                j, i,
                f"{cm[i, j]}\n({cm_norm[i, j]:.2f})",
                ha="center", va="center",
                color="white" if cm_norm[i, j] > thresh else "black",
                fontsize=11,
            )

    fig.tight_layout()

    if save_path:
        save_path.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"[Evaluate] Confusion matrix saved to {save_path}")

    plt.close(fig)


# ---------------------------------------------------------------------------
# Training-curve plot (optional helper, called from train.py results)
# ---------------------------------------------------------------------------
def plot_training_curves(
    history: Dict[str, list],
    save_path: Optional[Path] = None,
) -> None:
    """Plot loss and accuracy curves from a training history dict."""
    epochs = range(1, len(history["train_loss"]) + 1)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))

    # Loss
    ax1.plot(epochs, history["train_loss"], label="Train")
    ax1.plot(epochs, history["val_loss"],   label="Val")
    ax1.set(title="Loss", xlabel="Epoch", ylabel="CrossEntropyLoss")
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    # Accuracy
    ax2.plot(epochs, history["train_acc"], label="Train")
    ax2.plot(epochs, history["val_acc"],   label="Val")
    ax2.set(title="Accuracy", xlabel="Epoch", ylabel="Accuracy")
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    fig.tight_layout()

    if save_path:
        save_path.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"[Evaluate] Training curves saved to {save_path}")

    plt.close(fig)


# ---------------------------------------------------------------------------
# Main evaluation function
# ---------------------------------------------------------------------------
def evaluate_model(
    model: nn.Module,
    loader: DataLoader,
    device: str = DEVICE,
    save_dir: Path = OUTPUTS_DIR,
) -> Dict:
    """
    Evaluate *model* on *loader* and return a metrics dict.

    Saves:
        confusion_matrix.png  — normalised confusion matrix
        eval_results.json     — all scalar metrics
    """
    y_true, y_pred, y_prob = collect_predictions(model, loader, device)

    acc   = accuracy_score(y_true, y_pred)
    f1    = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    try:
        auc = roc_auc_score(y_true, y_prob)
    except ValueError:
        auc = float("nan")   # only one class present in batch

    report = classification_report(
        y_true, y_pred,
        target_names=CLASS_NAMES,
        zero_division=0,
    )

    print("\n" + "=" * 50)
    print(" Evaluation Results")
    print("=" * 50)
    print(f"  Accuracy  : {acc:.4f}")
    print(f"  F1 (wtd)  : {f1:.4f}")
    print(f"  ROC-AUC   : {auc:.4f}")
    print("\nClassification Report:")
    print(report)

    # Confusion matrix plot
    cm_path = save_dir / "confusion_matrix.png"
    plot_confusion_matrix(y_true, y_pred, save_path=cm_path)

    # Persist scalar results
    results = {
        "accuracy":  round(float(acc), 6),
        "f1_weighted": round(float(f1), 6),
        "roc_auc":   round(float(auc), 6),
        "classification_report": report,
    }
    json_path = save_dir / "eval_results.json"
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(results, indent=2))
    print(f"[Evaluate] Results saved to {json_path}")

    return results


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    if not BEST_MODEL_PATH.exists():
        raise FileNotFoundError(
            f"No checkpoint found at {BEST_MODEL_PATH}. "
            "Run detection/train.py first."
        )

    _, _, test_loader = get_dataloaders(batch_size=BATCH_SIZE)

    model = build_model()
    model = load_checkpoint(str(BEST_MODEL_PATH), model=model, device=DEVICE)

    evaluate_model(model, test_loader, device=DEVICE)
