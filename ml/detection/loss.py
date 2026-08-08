"""
loss.py
-------
Loss function configuration for certificate authenticity detection.

Why CrossEntropyLoss for binary classification?
────────────────────────────────────────────────────────────────────────
Given a certificate image, the model outputs two raw scores (logits):
    z = [z_genuine,  z_fake]

CrossEntropyLoss does three things in one step:
    1. Softmax  — converts logits to probabilities
                  P(genuine) = e^z0 / (e^z0 + e^z1)
                  P(fake)    = e^z1 / (e^z0 + e^z1)

    2. Log       — log(P(correct_class))
                  Perfect prediction → log(1.0) = 0   (zero loss)
                  Wrong prediction   → log(~0)  = -∞  (large loss)

    3. Negative  — loss = -log(P(correct_class))
                  Minimising loss = maximising probability of the true class

Formula for one sample:
    L = -log( e^z_y / Σ e^z_j )    where y = true label (0 or 1)

Batch loss = mean over all samples.

Class weighting (handles imbalance):
    If the dataset has more genuine than fake certificates the model
    learns to always predict "genuine" and still gets low loss.
    Inverse-frequency weighting fixes this:
        w_genuine = N_total / N_genuine
        w_fake    = N_total / N_fake
    Rarer class → higher weight → bigger gradient → model pays more attention.

Label smoothing (optional):
    Prevents the model from becoming overconfident.
    Instead of training against hard labels [0,1] it uses [ε/K, 1−ε+ε/K].
    Slightly improves generalisation on small datasets.

Usage:
    from detection.loss import build_criterion
    criterion = build_criterion(train_dataset)
    loss = criterion(logits, labels)   # logits: (B,2)  labels: (B,)
────────────────────────────────────────────────────────────────────────
"""

from typing import Optional

import torch
import torch.nn as nn
import torch.nn.functional as F

from detection.config import CLASS_NAMES, USE_CLASS_WEIGHTS, DEVICE
from detection.dataset import CertificateDataset


# ---------------------------------------------------------------------------
# Core builder
# ---------------------------------------------------------------------------
def build_criterion(
    train_dataset: Optional[CertificateDataset] = None,
    device: str = DEVICE,
    label_smoothing: float = 0.0,
) -> nn.CrossEntropyLoss:
    """
    Build and return a configured CrossEntropyLoss.

    Args:
        train_dataset:   CertificateDataset used for training.
                         Required when USE_CLASS_WEIGHTS=True in config.
                         Pass None to get unweighted loss.
        device:          Torch device string ("cpu" or "cuda").
        label_smoothing: Float in [0, 0.1]. 0 = hard labels (default).
                         Try 0.05–0.1 if the model is overconfident.

    Returns:
        nn.CrossEntropyLoss  ready to receive (logits, labels) pairs.

    Loss formula:
        L(x, y) = -log( exp(x[y]) / Σ exp(x[j]) )

    With class weights w:
        L(x, y) = -w[y] * log( exp(x[y]) / Σ exp(x[j]) )
    """
    class_weights: Optional[torch.Tensor] = None

    if USE_CLASS_WEIGHTS and train_dataset is not None:
        class_weights = _compute_class_weights(train_dataset, device)

    criterion = nn.CrossEntropyLoss(
        weight=class_weights,
        label_smoothing=label_smoothing,
    )

    _print_criterion_info(criterion, class_weights, label_smoothing)
    return criterion


# ---------------------------------------------------------------------------
# Weight computation
# ---------------------------------------------------------------------------
def _compute_class_weights(
    dataset: CertificateDataset,
    device: str,
) -> torch.Tensor:
    """
    Compute inverse-frequency class weights.

        w_c = N_total / (N_classes × N_c)

    Rarer class → larger weight → more influence on gradient.
    """
    counts = dataset.class_counts()          # {"genuine": n0, "fake": n1}
    n_total   = sum(counts.values())
    n_classes = len(CLASS_NAMES)

    weights = torch.tensor(
        [
            n_total / (n_classes * max(counts[c], 1))
            for c in CLASS_NAMES
        ],
        dtype=torch.float32,
        device=device,
    )
    return weights


# ---------------------------------------------------------------------------
# Diagnostic print
# ---------------------------------------------------------------------------
def _print_criterion_info(
    criterion: nn.CrossEntropyLoss,
    weights: Optional[torch.Tensor],
    label_smoothing: float,
) -> None:
    D = "─" * 56
    print(f"\n{D}")
    print("  Loss function : nn.CrossEntropyLoss")
    print(f"  Formula       : L = -log( exp(z_y) / Σ exp(z_j) )")
    print(f"  Label smoothing: {label_smoothing}")

    if weights is not None:
        w = weights.cpu().tolist()
        for name, wi in zip(CLASS_NAMES, w):
            print(f"  Class weight  : {name:>10}  →  {wi:.4f}")
        ratio = max(w) / min(w)
        print(f"  Weight ratio  : {ratio:.2f}x  "
              f"({'imbalanced — weighting active' if ratio > 1.05 else 'balanced'})")
    else:
        print("  Class weights : None  (equal weight for all classes)")

    print(f"{D}\n")


# ---------------------------------------------------------------------------
# Manual loss demo  (shows the maths step by step)
# ---------------------------------------------------------------------------
def demonstrate_loss() -> None:
    """
    Walk through CrossEntropyLoss computation manually for three
    certificate examples so the numbers are fully transparent.
    """
    D = "─" * 60
    print(f"\n{D}")
    print("  CrossEntropyLoss — step-by-step demo")
    print(D)

    # Three synthetic predictions: confident correct, uncertain, confident wrong
    logits = torch.tensor([
        [ 2.5, -1.0],   # sample 0: strongly predicts genuine (correct)
        [ 0.1,  0.2],   # sample 1: nearly 50/50 (uncertain)
        [-1.0,  2.5],   # sample 2: strongly predicts fake    (correct)
    ])
    labels = torch.tensor([0, 0, 1])   # genuine, genuine, fake

    label_names = {0: "genuine", 1: "fake"}

    print(f"\n  {'Sample':<8} {'True label':<12} {'Logits':^24} {'P(genuine)':>12} {'P(fake)':>10} {'Loss':>8}")
    print(f"  {'─'*76}")

    criterion_demo = nn.CrossEntropyLoss(reduction="none")
    per_sample_loss = criterion_demo(logits, labels)
    probs = F.softmax(logits, dim=1)

    for i in range(len(logits)):
        lbl  = label_names[labels[i].item()]
        lg   = logits[i].tolist()
        p_g  = probs[i, 0].item()
        p_f  = probs[i, 1].item()
        loss = per_sample_loss[i].item()
        print(f"  {i:<8} {lbl:<12} [{lg[0]:+.2f}, {lg[1]:+.2f}]        {p_g:>10.4f}  {p_f:>10.4f}  {loss:>8.4f}")

    mean_loss = per_sample_loss.mean().item()
    print(f"  {'─'*76}")
    print(f"  {'Batch mean loss':>44}  {mean_loss:>8.4f}")

    # Manual verification for sample 0
    print(f"\n  Manual verification — sample 0:")
    z0, z1 = logits[0].tolist()
    import math
    softmax_0 = math.exp(z0) / (math.exp(z0) + math.exp(z1))
    manual_loss = -math.log(softmax_0)
    print(f"    z = [{z0}, {z1}]")
    print(f"    P(genuine) = exp({z0}) / (exp({z0}) + exp({z1})) = {softmax_0:.6f}")
    print(f"    loss       = -log({softmax_0:.6f}) = {manual_loss:.6f}")
    print(f"    PyTorch    = {per_sample_loss[0].item():.6f}  ✓" if abs(manual_loss - per_sample_loss[0].item()) < 1e-4
          else f"    Mismatch!")

    # Effect of class weighting
    print(f"\n  Effect of class weighting (genuine:fake = 3:1 imbalance):")
    fake_weight = 3.0   # 3× more weight on fake since it's 3× rarer
    weights     = torch.tensor([1.0, fake_weight])
    criterion_w = nn.CrossEntropyLoss(weight=weights, reduction="none")
    weighted_loss = criterion_w(logits, labels)
    print(f"  {'Sample':<8} {'True label':<12} {'Unweighted loss':>16} {'Weighted loss':>14}")
    print(f"  {'─'*54}")
    for i in range(len(logits)):
        lbl = label_names[labels[i].item()]
        print(f"  {i:<8} {lbl:<12} {per_sample_loss[i].item():>16.4f} {weighted_loss[i].item():>14.4f}")
    print(f"\n  Fake sample (index 2) loss increased {weighted_loss[2]/per_sample_loss[2]:.1f}x — "
          f"model penalised more for missing it.")
    print(f"{D}\n")


# ---------------------------------------------------------------------------
# Entry point  (python -m detection.loss)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    demonstrate_loss()

    # Build a real criterion with a mock balanced dataset
    print("Building criterion with a mock balanced dataset (50 genuine, 50 fake):")

    class _MockDataset:
        def class_counts(self):
            return {"genuine": 50, "fake": 50}

    criterion = build_criterion(_MockDataset(), device="cpu")       # type: ignore
    print(f"Criterion type : {type(criterion).__name__}")
    print(f"Weight         : {criterion.weight}")

    print("\nBuilding criterion with imbalanced dataset (80 genuine, 20 fake):")

    class _MockImbalanced:
        def class_counts(self):
            return {"genuine": 80, "fake": 20}

    criterion_imb = build_criterion(_MockImbalanced(), device="cpu")  # type: ignore
    print(f"Criterion type : {type(criterion_imb).__name__}")
    print(f"Weight         : {criterion_imb.weight}")
