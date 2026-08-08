"""
validation.py
-------------
Standalone validation loop for certificate authenticity detection.

Validation pipeline — runs AFTER every training epoch:

    Validation Dataset
          ↓
    Load Batch           (images, labels  — no shuffle)
          ↓
    Forward Pass         (model.eval() + torch.no_grad())
          ↓
    Predictions          argmax(logits)  →  0=genuine | 1=fake
          ↓
    Validation Loss      CrossEntropyLoss(logits, labels)
          ↓
    Validation Accuracy  correct / total  +  per-class breakdown

Critical guarantee — weights are NEVER modified:
    model.eval()       → deterministic inference (no Dropout, stable BN)
    torch.no_grad()    → autograd engine fully disabled; no gradients
                         are computed, stored, or available to any
                         optimizer.step() call
    No optimizer used  → zero weight changes possible by construction

Usage:
    # Standalone — evaluates best_model.pth on the val split
    python -m detection.validation

    # Programmatic
    from detection.validation import run_validation
    result = run_validation(model, val_loader, criterion)
    print(result)
"""

from __future__ import annotations

import copy
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from tqdm import tqdm

from detection.config import CLASS_NAMES, DEVICE, BEST_MODEL_PATH, BATCH_SIZE


# ═══════════════════════════════════════════════════════════════════════════
# Result container
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class ValidationResult:
    """
    All metrics produced by one validation pass.

    Fields:
        loss          Mean CrossEntropyLoss over the entire val set.
        accuracy      Overall fraction of correctly classified images.
        per_class_acc Per-class accuracy dict  {"genuine": 0.94, "fake": 0.88}
        n_samples     Total images evaluated.
        n_correct     Total correctly classified images.
        per_class_n   Per-class sample counts  {"genuine": 120, "fake": 80}
        predictions   All predicted labels (list of ints).
        ground_truth  All true labels      (list of ints).
        probabilities All softmax prob rows (list of [p_genuine, p_fake]).
    """
    loss:          float
    accuracy:      float
    per_class_acc: Dict[str, float]
    n_samples:     int
    n_correct:     int
    per_class_n:   Dict[str, int]      = field(default_factory=dict)
    predictions:   List[int]           = field(default_factory=list)
    ground_truth:  List[int]           = field(default_factory=list)
    probabilities: List[List[float]]   = field(default_factory=list)

    # ── pretty-print ──────────────────────────────────────────────────────
    def __str__(self) -> str:
        D = "─" * 54
        lines = [
            f"\n{'═'*54}",
            "  Validation Results",
            f"{'═'*54}",
            f"  Samples evaluated : {self.n_samples}",
            f"  Loss (CE)         : {self.loss:.6f}",
            f"  Overall accuracy  : {self.accuracy:.4f}  "
            f"({self.n_correct}/{self.n_samples} correct)",
            D,
            "  Per-class accuracy:",
        ]
        for cls_name in CLASS_NAMES:
            acc = self.per_class_acc.get(cls_name, 0.0)
            n   = self.per_class_n.get(cls_name, 0)
            bar = _ascii_bar(acc, width=20)
            lines.append(f"    {cls_name:<10}  {bar}  {acc:.4f}  ({n} samples)")
        lines.append(f"{'═'*54}\n")
        return "\n".join(lines)

    def summary_dict(self) -> Dict:
        """Return a plain dict suitable for JSON serialisation."""
        return {
            "loss":          round(self.loss, 6),
            "accuracy":      round(self.accuracy, 6),
            "per_class_acc": {k: round(v, 6) for k, v in self.per_class_acc.items()},
            "n_samples":     self.n_samples,
            "n_correct":     self.n_correct,
        }


def _ascii_bar(value: float, width: int = 20) -> str:
    """Render a simple ASCII progress bar for a value in [0, 1]."""
    filled = int(round(value * width))
    return "[" + "█" * filled + "░" * (width - filled) + "]"


# ═══════════════════════════════════════════════════════════════════════════
# Weight-snapshot utility
# ═══════════════════════════════════════════════════════════════════════════

def _snapshot_weights(model: nn.Module) -> Dict[str, torch.Tensor]:
    """
    Return a deep copy of all parameter tensors keyed by name.
    Used to prove weights are unchanged after validation.
    """
    return {
        name: param.detach().clone()
        for name, param in model.named_parameters()
    }


def assert_weights_unchanged(
    before: Dict[str, torch.Tensor],
    after:  Dict[str, torch.Tensor],
) -> None:
    """
    Raise AssertionError if any parameter differs between two snapshots.
    Call with snapshots taken before and after validate_one_epoch / run_validation.
    """
    for name in before:
        if not torch.equal(before[name], after[name]):
            max_diff = (before[name] - after[name]).abs().max().item()
            raise AssertionError(
                f"Weight '{name}' changed during validation! "
                f"max |delta| = {max_diff:.2e}"
            )


# ═══════════════════════════════════════════════════════════════════════════
# Core validation function
# ═══════════════════════════════════════════════════════════════════════════

def run_validation(
    model:     nn.Module,
    loader:    DataLoader,
    criterion: nn.Module,
    device:    str = DEVICE,
    epoch:     int = 0,
    total_epochs: int = 0,
    verify_no_weight_change: bool = False,
) -> ValidationResult:
    """
    Run one full validation pass and return a ValidationResult.

    Validation pipeline:
        Validation Dataset
              ↓
        Load Batch  →  Forward Pass  →  Loss  →  Predictions  →  Record
              ↑_______________________no weight update____________________↑

    Args:
        model:                    nn.Module (will be set to eval mode).
        loader:                   DataLoader for the validation split.
        criterion:                Loss function (CrossEntropyLoss).
        device:                   "cpu" or "cuda".
        epoch / total_epochs:     Used for tqdm label only (pass 0 to suppress).
        verify_no_weight_change:  If True, snapshot weights before/after and
                                  assert they are identical — proof of no update.

    Returns:
        ValidationResult with loss, accuracy, per-class stats, and all
        raw predictions/probabilities.
    """
    # ── Step 1: enforce eval mode ─────────────────────────────────────────
    # eval() does NOT freeze weights by itself.
    # It only switches Dropout off and tells BatchNorm to use
    # the running mean/variance instead of batch statistics.
    model.eval()

    # ── Optional: snapshot weights before validation ──────────────────────
    weights_before = _snapshot_weights(model) if verify_no_weight_change else {}

    # ── Accumulators ─────────────────────────────────────────────────────
    running_loss   = 0.0
    correct        = 0
    total          = 0
    class_correct  = {name: 0 for name in CLASS_NAMES}
    class_total    = {name: 0 for name in CLASS_NAMES}
    all_preds:  List[int]        = []
    all_labels: List[int]        = []
    all_probs:  List[List[float]] = []

    # ── Build tqdm label ──────────────────────────────────────────────────
    desc = (
        f"  Epoch {epoch:>3}/{total_epochs} [Val  ]"
        if total_epochs > 0
        else "  Validation"
    )

    pbar = tqdm(loader, desc=desc, unit="batch", leave=False, dynamic_ncols=True)

    # ══════════════════════════════════════════════════════════════════════
    # torch.no_grad() — the hard guarantee
    #
    # Inside this block:
    #   • No computation graph is built (requires_grad is ignored)
    #   • No gradients are stored anywhere in memory
    #   • loss.backward() cannot be called (would raise RuntimeError)
    #   • optimizer.step() has nothing to act on
    #
    # This means it is physically impossible for weights to change
    # inside this block, regardless of what code runs.
    # ══════════════════════════════════════════════════════════════════════
    with torch.no_grad():
        for images, labels in pbar:

            # ── Load batch ────────────────────────────────────────────────
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)

            # ── Forward pass ──────────────────────────────────────────────
            # model.eval() → Dropout passes inputs through unchanged
            #              → BatchNorm uses stored running statistics
            logits = model(images)                      # shape: (B, 2)

            # ── Compute loss ──────────────────────────────────────────────
            loss = criterion(logits, labels)            # scalar tensor

            # ── Predictions ───────────────────────────────────────────────
            probs = F.softmax(logits, dim=1)            # shape: (B, 2)
            preds = probs.argmax(dim=1)                 # shape: (B,)

            # ── Record — global ───────────────────────────────────────────
            batch_size    = labels.size(0)
            running_loss += loss.item() * batch_size
            correct      += (preds == labels).sum().item()
            total        += batch_size

            # ── Record — per class ────────────────────────────────────────
            for idx, cls_name in enumerate(CLASS_NAMES):
                mask = labels == idx
                class_total[cls_name]   += mask.sum().item()
                class_correct[cls_name] += (preds[mask] == idx).sum().item()

            # ── Collect raw outputs for diagnostics ───────────────────────
            all_preds.extend(preds.cpu().tolist())
            all_labels.extend(labels.cpu().tolist())
            all_probs.extend(probs.cpu().tolist())

            pbar.set_postfix(
                loss=f"{loss.item():.4f}",
                acc=f"{correct / max(total, 1):.3f}",
            )

    # ── Compute epoch-level metrics ───────────────────────────────────────
    avg_loss = running_loss / max(total, 1)
    accuracy = correct / max(total, 1)
    per_class_acc = {
        name: class_correct[name] / max(class_total[name], 1)
        for name in CLASS_NAMES
    }

    # ── Prove weights unchanged ───────────────────────────────────────────
    if verify_no_weight_change:
        weights_after = _snapshot_weights(model)
        assert_weights_unchanged(weights_before, weights_after)

    return ValidationResult(
        loss          = avg_loss,
        accuracy      = accuracy,
        per_class_acc = per_class_acc,
        n_samples     = total,
        n_correct     = correct,
        per_class_n   = dict(class_total),
        predictions   = all_preds,
        ground_truth  = all_labels,
        probabilities = all_probs,
    )


# ═══════════════════════════════════════════════════════════════════════════
# Per-image prediction table
# ═══════════════════════════════════════════════════════════════════════════

def print_prediction_table(
    result: ValidationResult,
    max_rows: int = 20,
) -> None:
    """
    Print a per-image table showing true label, predicted label,
    and both class probabilities.

    Args:
        result:   ValidationResult from run_validation().
        max_rows: Maximum rows to print (default 20).
    """
    n = min(len(result.predictions), max_rows)
    print(f"\n  Per-image predictions (first {n} of {len(result.predictions)}):")
    print(f"  {'─'*70}")
    header = (
        f"  {'Img':>4}  {'True':>10}  {'Pred':>10}"
        f"  {'P(genuine)':>12}  {'P(fake)':>10}  {'✓/✗':>4}"
    )
    print(header)
    print(f"  {'─'*70}")

    for i in range(n):
        true_idx  = result.ground_truth[i]
        pred_idx  = result.predictions[i]
        probs     = result.probabilities[i]
        true_name = CLASS_NAMES[true_idx]
        pred_name = CLASS_NAMES[pred_idx]
        tick      = "✓" if true_idx == pred_idx else "✗"
        print(
            f"  {i:>4}  {true_name:>10}  {pred_name:>10}"
            f"  {probs[0]:>12.6f}  {probs[1]:>10.6f}  {tick:>4}"
        )

    if len(result.predictions) > max_rows:
        print(f"  ... ({len(result.predictions) - max_rows} more rows not shown)")
    print(f"  {'─'*70}\n")


# ═══════════════════════════════════════════════════════════════════════════
# Entry point  (python -m detection.validation)
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from detection.dataset import get_dataloaders
    from detection.model import build_model, load_checkpoint
    from detection.loss import build_criterion

    if not BEST_MODEL_PATH.exists():
        raise FileNotFoundError(
            f"No checkpoint at {BEST_MODEL_PATH}.\n"
            "Run 'python -m detection.train' first."
        )

    print(f"[Validation] Loading model from {BEST_MODEL_PATH}")
    model = build_model()
    model = load_checkpoint(str(BEST_MODEL_PATH), model=model, device=DEVICE)

    _, val_loader, _ = get_dataloaders(batch_size=BATCH_SIZE)
    criterion = build_criterion(val_loader.dataset, device=DEVICE)

    result = run_validation(
        model, val_loader, criterion,
        device=DEVICE,
        verify_no_weight_change=True,
    )

    print(result)
    print_prediction_table(result, max_rows=20)
    print("[Validation] Weight-unchanged assertion: PASSED")
