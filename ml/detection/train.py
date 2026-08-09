"""
train.py
--------
Training loop for certificate authenticity detection.

For each epoch the loop executes these stages in order:

    Training dataset
         │
         ▼
    ┌─────────────────────────────────────────────┐
    │  for each batch:                            │
    │                                             │
    │  1. Load Batch      images, labels          │
    │         ↓                                   │
    │  2. Forward Pass    logits = model(images)  │
    │         ↓                                   │
    │  3. Compute Loss    loss = criterion(...)   │
    │         ↓                                   │
    │  4. Backpropagation loss.backward()         │
    │         ↓                                   │
    │  5. Update Weights  optimizer.step()        │
    │         ↓                                   │
    │  6. Record          accumulate loss & acc   │
    └─────────────────────────────────────────────┘
         │
         ▼
    End of epoch → print train_loss, train_acc
                 → run validation pass
                 → checkpoint if improved
                 → early-stop if stalled

Usage:
    python -m detection.train
"""

import csv
import time
from pathlib import Path
from typing import Dict, List, Tuple

import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR, StepLR
from torch.utils.data import DataLoader
from tqdm import tqdm

from detection.config import (
    DEVICE, EPOCHS, LEARNING_RATE, WEIGHT_DECAY,
    LR_SCHEDULER, LR_STEP_SIZE, LR_GAMMA,
    EARLY_STOPPING_PATIENCE,
    CHECKPOINT_EVERY_N_EPOCHS, BEST_MODEL_PATH, LAST_MODEL_PATH,
    BEST_MODEL_CANONICAL_PATH,
    LOGS_DIR, BATCH_SIZE, MODEL_NAME,
    set_seed, RANDOM_SEED,
)
from detection.dataset import get_dataloaders
from detection.loss import build_criterion
from detection.model import build_model, count_parameters


# ═══════════════════════════════════════════════════════════════════════════
# Stage helpers — each function maps to one labelled stage in the loop
# ═══════════════════════════════════════════════════════════════════════════

def _load_batch(
    batch: Tuple[torch.Tensor, torch.Tensor],
    device: str,
) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Stage 1 — Load Batch
    Move images and labels from CPU RAM to the compute device.
    non_blocking=True overlaps transfer with computation when using CUDA.
    """
    images, labels = batch
    return (
        images.to(device, non_blocking=True),
        labels.to(device, non_blocking=True),
    )


def _forward_pass(
    model: nn.Module,
    images: torch.Tensor,
) -> torch.Tensor:
    """
    Stage 2 — Forward Pass
    Feed the batch through EfficientNet-B0 and get raw logits.
    Shape: (batch_size, 2)  →  [score_genuine, score_fake]
    """
    return model(images)


def _compute_loss(
    criterion: nn.Module,
    logits: torch.Tensor,
    labels: torch.Tensor,
) -> torch.Tensor:
    """
    Stage 3 — Compute Loss
    CrossEntropyLoss measures how far the predictions are from the
    true labels.  Lower = better.
    """
    return criterion(logits, labels)


def _backpropagate(
    optimizer: torch.optim.Optimizer,
    loss: torch.Tensor,
) -> None:
    """
    Stage 4 — Backpropagation
    Compute gradients of the loss with respect to every trainable
    parameter via the chain rule, then clip them to prevent exploding
    gradients.
    """
    loss.backward()
    # Gradient clipping: keeps updates stable, especially early in training
    nn.utils.clip_grad_norm_(
        [p for group in optimizer.param_groups for p in group["params"]],
        max_norm=1.0,
    )


def _update_weights(optimizer: torch.optim.Optimizer) -> None:
    """
    Stage 5 — Update Weights
    AdamW adjusts every parameter in the direction that reduces loss,
    scaled by the adaptive learning rate.
    """
    optimizer.step()


def _record_batch(
    loss: torch.Tensor,
    logits: torch.Tensor,
    labels: torch.Tensor,
    running_loss: float,
    correct: int,
    total: int,
) -> Tuple[float, int, int]:
    """
    Stage 6 — Record
    Accumulate loss (sum × batch_size) and correct-prediction count
    so we can compute epoch-level averages at the end.
    """
    batch_size    = labels.size(0)
    running_loss += loss.item() * batch_size
    preds         = logits.argmax(dim=1)
    correct      += (preds == labels).sum().item()
    total        += batch_size
    return running_loss, correct, total


# ═══════════════════════════════════════════════════════════════════════════
# Single epoch — training pass
# ═══════════════════════════════════════════════════════════════════════════

def train_one_epoch(
    model:     nn.Module,
    loader:    DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device:    str,
    epoch:     int,
    total_epochs: int,
) -> Tuple[float, float]:
    """
    Run one full training pass over *loader*.

    Executes stages 1–6 for every batch, then returns:
        (avg_loss, accuracy)  — epoch-level averages

    The tqdm bar shows live batch loss and running accuracy so you
    can see the model learning in real time.
    """
    model.train()   # activates Dropout and BatchNorm in training mode

    running_loss = 0.0
    correct      = 0
    total        = 0

    pbar = tqdm(
        loader,
        desc=f"  Epoch {epoch:>3}/{total_epochs} [Train]",
        unit="batch",
        leave=False,
        dynamic_ncols=True,
    )

    for batch in pbar:

        # ── Stage 1: Load batch ──────────────────────────────────────────
        images, labels = _load_batch(batch, device)

        # ── Stage 4 prep: zero gradients before forward pass ────────────
        # Must be done BEFORE forward — stale gradients from the previous
        # batch would corrupt this batch's update.
        optimizer.zero_grad(set_to_none=True)

        # ── Stage 2: Forward pass ────────────────────────────────────────
        logits = _forward_pass(model, images)

        # ── Stage 3: Compute loss ────────────────────────────────────────
        loss = _compute_loss(criterion, logits, labels)

        # ── Stage 4: Backpropagation ─────────────────────────────────────
        _backpropagate(optimizer, loss)

        # ── Stage 5: Update weights ──────────────────────────────────────
        _update_weights(optimizer)

        # ── Stage 6: Record ──────────────────────────────────────────────
        running_loss, correct, total = _record_batch(
            loss, logits, labels, running_loss, correct, total
        )

        # Live bar: current batch loss + running accuracy
        pbar.set_postfix(
            loss=f"{loss.item():.4f}",
            acc=f"{correct/max(total,1):.3f}",
        )

    avg_loss = running_loss / max(total, 1)
    accuracy = correct / max(total, 1)
    return avg_loss, accuracy


# ═══════════════════════════════════════════════════════════════════════════
# Single epoch — validation pass  (NO gradient updates — read-only)
# ═══════════════════════════════════════════════════════════════════════════

def validate_one_epoch(
    model:        nn.Module,
    loader:       DataLoader,
    criterion:    nn.Module,
    device:       str,
    epoch:        int,
    total_epochs: int,
) -> Tuple[float, float, Dict[str, float]]:
    """
    Run one full validation pass over *loader*.

    Validation pipeline (read-only — weights are NEVER modified):
        Validation Dataset
              ↓
        Stage 1: Load Batch
              ↓
        Stage 2: Forward Pass    (model.eval() — no Dropout, stable BN)
              ↓
        Stage 3: Compute Loss    (CrossEntropyLoss)
              ↓
        Stage 4: Predictions     (argmax over class logits)
              ↓
        Stage 5: Record          (loss, correct count, per-class counts)
              ↓
        Epoch averages: val_loss, val_accuracy

    Key guarantees:
        - model.eval()      disables Dropout; BatchNorm uses running stats
        - torch.no_grad()   disables the autograd engine entirely;
                            no computation graph is built, no gradients
                            are computed or stored → weights cannot change
        - optimizer.step()  is never called here

    Args:
        model:        nn.Module in eval mode (enforced inside).
        loader:       DataLoader wrapping the validation split.
        criterion:    Loss function (CrossEntropyLoss).
        device:       "cpu" or "cuda".
        epoch:        Current epoch number (for tqdm label only).
        total_epochs: Total epochs (for tqdm label only).

    Returns:
        avg_loss   : float  — mean CrossEntropyLoss over the val set
        accuracy   : float  — fraction of correctly classified images
        per_class  : dict   — {"genuine": acc_0, "fake": acc_1}
    """
    from detection.config import CLASS_NAMES

    # ── Guard: switch to eval mode ────────────────────────────────────────
    # model.eval() does two things:
    #   1. Dropout layers pass through inputs unchanged (no random zeroing)
    #   2. BatchNorm uses the moving-average statistics from training
    #      rather than batch statistics → deterministic, stable output
    model.eval()

    running_loss = 0.0
    correct      = 0
    total        = 0

    # Per-class tracking (index matches CLASS_NAMES)
    class_correct = [0] * len(CLASS_NAMES)
    class_total   = [0] * len(CLASS_NAMES)

    pbar = tqdm(
        loader,
        desc=f"  Epoch {epoch:>3}/{total_epochs} [Val  ]",
        unit="batch",
        leave=False,
        dynamic_ncols=True,
    )

    # ── torch.no_grad() block ─────────────────────────────────────────────
    # This is the hard guarantee that weights cannot change:
    #   - No computation graph is built (tensors have requires_grad=False)
    #   - loss.backward() would raise an error if called here
    #   - Memory usage drops because no activations need to be cached
    with torch.no_grad():
        for batch in pbar:

            # Stage 1: Load batch ─────────────────────────────────────────
            images, labels = _load_batch(batch, device)

            # Stage 2: Forward pass ───────────────────────────────────────
            logits = _forward_pass(model, images)

            # Stage 3: Compute loss ───────────────────────────────────────
            loss = _compute_loss(criterion, logits, labels)

            # Stage 4: Predictions ────────────────────────────────────────
            preds = logits.argmax(dim=1)   # index of highest logit per image

            # Stage 5: Record — global ────────────────────────────────────
            running_loss, correct, total = _record_batch(
                loss, logits, labels, running_loss, correct, total
            )

            # Stage 5: Record — per class ─────────────────────────────────
            for cls_idx in range(len(CLASS_NAMES)):
                mask               = labels == cls_idx
                class_total[cls_idx]   += mask.sum().item()
                class_correct[cls_idx] += (preds[mask] == cls_idx).sum().item()

            pbar.set_postfix(
                loss=f"{loss.item():.4f}",
                acc=f"{correct / max(total, 1):.3f}",
            )

    avg_loss = running_loss / max(total, 1)
    accuracy = correct / max(total, 1)

    # Per-class accuracy dict: {"genuine": 0.92, "fake": 0.88}
    per_class: Dict[str, float] = {
        CLASS_NAMES[i]: (
            class_correct[i] / class_total[i] if class_total[i] > 0 else 0.0
        )
        for i in range(len(CLASS_NAMES))
    }

    return avg_loss, accuracy, per_class


# ═══════════════════════════════════════════════════════════════════════════
# Checkpoint
# ═══════════════════════════════════════════════════════════════════════════

def _save_checkpoint(
    model:     nn.Module,
    optimizer: torch.optim.Optimizer,
    epoch:     int,
    val_loss:  float,
    val_acc:   float,
    path:      Path,
) -> None:
    """Save model + optimiser state for resumable training."""
    torch.save(
        {
            "epoch":                epoch,
            "model_state_dict":     model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "val_loss":             val_loss,
            "val_acc":              val_acc,
        },
        path,
    )


# ═══════════════════════════════════════════════════════════════════════════
# Epoch summary printer
# ═══════════════════════════════════════════════════════════════════════════

def _print_epoch_summary(
    epoch:         int,
    total:         int,
    train_loss:    float,
    train_acc:     float,
    val_loss:      float,
    val_acc:       float,
    val_per_class: Dict[str, float],
    lr:            float,
    elapsed:       float,
    is_best:       bool,
) -> None:
    """Print one line per epoch with train metrics, val metrics, per-class val acc."""
    from detection.config import CLASS_NAMES
    best_tag   = "  ← best" if is_best else ""
    cls_detail = "  ".join(
        f"{name}={val_per_class.get(name, 0.0):.3f}"
        for name in CLASS_NAMES
    )
    print(
        f"  Epoch {epoch:>3}/{total}"
        f"  |  train  loss {train_loss:.4f}  acc {train_acc:.4f}"
        f"  |  val  loss {val_loss:.4f}  acc {val_acc:.4f}"
        f"  ({cls_detail})"
        f"  |  lr {lr:.1e}"
        f"  |  {elapsed:.1f}s"
        f"{best_tag}"
    )


def print_training_history(history: Dict[str, List]) -> None:
    """
    Print a full per-epoch table of training and validation metrics.
    Call this after training completes to review all recorded values.
    """
    n = len(history["train_loss"])
    if n == 0:
        print("  No training history to display.")
        return

    print(f"\n{'═'*74}")
    print("  Training History")
    print(f"{'═'*74}")
    header = (
        f"  {'Epoch':>5}  {'Train Loss':>11}  {'Train Acc':>10}"
        f"  {'Val Loss':>9}  {'Val Acc':>8}"
    )
    print(header)
    print(f"  {'─'*68}")

    best_val_loss = min(history["val_loss"])
    for i in range(n):
        marker = " ←" if history["val_loss"][i] == best_val_loss else ""
        print(
            f"  {i+1:>5}  {history['train_loss'][i]:>11.6f}  {history['train_acc'][i]:>10.4f}"
            f"  {history['val_loss'][i]:>9.6f}  {history['val_acc'][i]:>8.4f}{marker}"
        )

    print(f"  {'─'*68}")
    print(
        f"  {'Final':>5}  {history['train_loss'][-1]:>11.6f}  {history['train_acc'][-1]:>10.4f}"
        f"  {history['val_loss'][-1]:>9.6f}  {history['val_acc'][-1]:>8.4f}"
    )
    print(f"  Best val loss: {best_val_loss:.6f}  at epoch {history['val_loss'].index(best_val_loss)+1}")
    print(f"{'═'*74}\n")


# ═══════════════════════════════════════════════════════════════════════════
# Main training function
# ═══════════════════════════════════════════════════════════════════════════

def train(
    epochs:        int   = EPOCHS,
    batch_size:    int   = BATCH_SIZE,
    learning_rate: float = LEARNING_RATE,
    device:        str   = DEVICE,
    dataset_dir          = None,   # Path | None — defaults to config.DATASET_DIR
) -> Dict[str, List]:
    """
    Full training pipeline.

    Each epoch runs:
        train_one_epoch() → validate_one_epoch() → checkpoint → early-stop

    Returns a history dict:
        {
          "train_loss": [...],   # one value per completed epoch
          "train_acc":  [...],
          "val_loss":   [...],
          "val_acc":    [...],
        }
    """
    # ── Reproducibility ──────────────────────────────────────────────────
    set_seed(RANDOM_SEED)

    # ── Header ───────────────────────────────────────────────────────────
    print(f"\n{'═'*60}")
    print("  Certificate Authenticity Detection — Training")
    print(f"{'═'*60}")
    print(f"  Device        : {device}")
    print(f"  Backbone      : {MODEL_NAME}")
    print(f"  Epochs        : {epochs}")
    print(f"  Batch size    : {batch_size}")
    print(f"  Learning rate : {learning_rate:.0e}")
    print(f"  Optimizer     : AdamW  (weight_decay={WEIGHT_DECAY:.0e})")
    print(f"  LR scheduler  : {LR_SCHEDULER}")
    print(f"  Early stop    : patience={EARLY_STOPPING_PATIENCE}")
    print(f"{'═'*60}")

    # ── Data ─────────────────────────────────────────────────────────────
    from detection.config import DATASET_DIR as _DEFAULT_DIR
    _data_dir = Path(dataset_dir) if dataset_dir is not None else _DEFAULT_DIR
    train_loader, val_loader, _ = get_dataloaders(
        dataset_dir=_data_dir, batch_size=batch_size
    )
    train_dataset = train_loader.dataset

    # ── Model ────────────────────────────────────────────────────────────
    model = build_model().to(device)
    print(f"\n  Trainable params : {count_parameters(model):,}")

    # ── Loss ─────────────────────────────────────────────────────────────
    criterion = build_criterion(train_dataset, device)

    # ── Optimizer ────────────────────────────────────────────────────────
    optimizer = AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=learning_rate,
        weight_decay=WEIGHT_DECAY,
    )

    # ── LR Scheduler ─────────────────────────────────────────────────────
    if LR_SCHEDULER == "cosine":
        scheduler = CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)
    elif LR_SCHEDULER == "step":
        scheduler = StepLR(optimizer, step_size=LR_STEP_SIZE, gamma=LR_GAMMA)
    else:
        scheduler = None

    # ── CSV logger ───────────────────────────────────────────────────────
    log_path   = LOGS_DIR / f"training_{int(time.time())}.csv"
    csv_file   = open(log_path, "w", newline="")
    csv_writer = csv.writer(csv_file)
    csv_writer.writerow([
        "epoch", "train_loss", "train_acc",
        "val_loss", "val_acc", "lr", "elapsed_s",
    ])
    print(f"  Log file         : {log_path.name}\n")

    # ── State ────────────────────────────────────────────────────────────
    history: Dict[str, List] = {
        "train_loss": [], "train_acc": [],
        "val_loss":   [], "val_acc":   [],
    }
    best_val_loss    = float("inf")
    patience_counter = 0
    last_epoch       = 1

    # ════════════════════════════════════════════════════════════════════
    # Epoch loop
    # ════════════════════════════════════════════════════════════════════
    for epoch in range(1, epochs + 1):
        last_epoch = epoch
        t0 = time.time()

        # ── Training pass ─────────────────────────────────────────────
        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer,
            device, epoch, epochs,
        )

        # ── Validation pass ───────────────────────────────────────────
        val_loss, val_acc, val_per_class = validate_one_epoch(
            model, val_loader, criterion,
            device, epoch, epochs,
        )

        # ── LR scheduler step ────────────────────────────────────────
        if scheduler is not None:
            scheduler.step()

        current_lr = optimizer.param_groups[0]["lr"]
        elapsed    = time.time() - t0

        # ── Record ───────────────────────────────────────────────────
        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        csv_writer.writerow([
            epoch,
            f"{train_loss:.6f}", f"{train_acc:.4f}",
            f"{val_loss:.6f}",   f"{val_acc:.4f}",
            f"{current_lr:.2e}", f"{elapsed:.1f}",
        ])
        csv_file.flush()

        # ── Best-model checkpoint ────────────────────────────────────
        is_best = val_loss < best_val_loss
        if is_best:
            best_val_loss    = val_loss
            patience_counter = 0
            # Save full training state (resumable)
            _save_checkpoint(
                model, optimizer, epoch, val_loss, val_acc, BEST_MODEL_PATH
            )
            # Save canonical best model used by evaluation and prediction
            # Path: models/certificate_detector_best.pth
            _save_checkpoint(
                model, optimizer, epoch, val_loss, val_acc,
                BEST_MODEL_CANONICAL_PATH
            )
            print(f"  ✓ Best model saved → {BEST_MODEL_CANONICAL_PATH.name}"
                  f"  (val_loss={val_loss:.4f}  val_acc={val_acc:.4f})")
        else:
            patience_counter += 1

        # ── Periodic checkpoint ──────────────────────────────────────
        if epoch % CHECKPOINT_EVERY_N_EPOCHS == 0:
            ckpt = BEST_MODEL_PATH.parent / f"checkpoint_epoch_{epoch:03d}.pth"
            _save_checkpoint(model, optimizer, epoch, val_loss, val_acc, ckpt)

        # ── Print epoch summary ──────────────────────────────────────
        _print_epoch_summary(
            epoch, epochs,
            train_loss, train_acc,
            val_loss,   val_acc,
            val_per_class,
            current_lr, elapsed,
            is_best,
        )

        # ── Early stopping ───────────────────────────────────────────
        if patience_counter >= EARLY_STOPPING_PATIENCE:
            print(
                f"\n  [EarlyStopping] Val loss hasn't improved for "
                f"{EARLY_STOPPING_PATIENCE} epochs. Stopping at epoch {epoch}."
            )
            break

    # ── Save last model ───────────────────────────────────────────────────
    _save_checkpoint(
        model, optimizer, last_epoch, val_loss, val_acc, LAST_MODEL_PATH
    )
    csv_file.close()

    # ── Final summary ────────────────────────────────────────────────────
    print_training_history(history)
    print(f"  Best model  : {BEST_MODEL_PATH}")
    print(f"  Last model  : {LAST_MODEL_PATH}")
    print(f"  Log file    : {log_path}\n")

    return history


# ─────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    train()
