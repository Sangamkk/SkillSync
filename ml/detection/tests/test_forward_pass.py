"""
test_forward_pass.py
--------------------
Verifies the full forward pass of the EfficientNet-B0 certificate
detection model BEFORE any training occurs.

What is checked
───────────────
1. Input tensor shape    : (16, 3, 224, 224)
   16 images, 3 colour channels, 224×224 pixels

2. Logit output shape    : (16, 2)
   Two raw scores per image — one for each class

3. Probability shape     : (16, 2)
   Softmax-normalised so each row sums to 1.0

4. Probability range     : every value in [0, 1]

5. Probability sum       : each image's two probs sum to 1.0

6. Both classes activated: neither class is always zero
   (ensures the head is connected and gradients can flow)

7. Gradient flow         : loss.backward() runs without error,
   and gradients exist on the classifier head parameters

8. Device consistency    : all tensors live on the same device

9. Batch-size invariance : shapes are correct for batch sizes 1, 4, 16

10. Per-image probability table printed for the batch-of-16

Run:
    python -m detection.tests.test_forward_pass
    # or, from project root:
    python detection/tests/test_forward_pass.py
"""

import sys
import math
from pathlib import Path

import torch
import torch.nn.functional as F

# ── path setup so the test runs from any working directory ────────────────
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from detection.model import build_model, count_parameters
from detection.loss import build_criterion
from detection.config import DEVICE, NUM_CLASSES, CLASS_NAMES

# ── constants ─────────────────────────────────────────────────────────────
BATCH_SIZE   = 16
CHANNELS     = 3
HEIGHT       = 224
WIDTH        = 224
EXPECTED_IN  = (BATCH_SIZE, CHANNELS, HEIGHT, WIDTH)
EXPECTED_OUT = (BATCH_SIZE, NUM_CLASSES)


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════

def _make_batch(batch_size: int = BATCH_SIZE, device: str = DEVICE) -> torch.Tensor:
    """Synthetic batch: uniform random pixels in [0, 1], then ImageNet-normalised."""
    raw = torch.rand(batch_size, CHANNELS, HEIGHT, WIDTH)
    mean = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
    std  = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)
    return ((raw - mean) / std).to(device)


def _section(title: str) -> None:
    print(f"\n{'─'*60}")
    print(f"  {title}")
    print(f"{'─'*60}")


def _pass(msg: str) -> None:
    print(f"  ✓  {msg}")


def _fail(msg: str) -> None:
    print(f"  ✗  FAIL — {msg}")
    raise AssertionError(msg)


# ═══════════════════════════════════════════════════════════════════════════
# Individual checks
# ═══════════════════════════════════════════════════════════════════════════

def check_input_shape(images: torch.Tensor) -> None:
    """1. Input tensor is exactly (16, 3, 224, 224)."""
    if tuple(images.shape) != EXPECTED_IN:
        _fail(f"Input shape {tuple(images.shape)} != {EXPECTED_IN}")
    _pass(f"Input shape  {list(images.shape)}  — 16 images × 3ch × 224×224")


def check_logit_shape(logits: torch.Tensor) -> None:
    """2. Raw logit output is (16, 2)."""
    if tuple(logits.shape) != EXPECTED_OUT:
        _fail(f"Logit shape {tuple(logits.shape)} != {EXPECTED_OUT}")
    _pass(f"Logit shape  {list(logits.shape)}  — 16 images × 2 classes")


def check_probability_shape(probs: torch.Tensor) -> None:
    """3. Probability tensor is (16, 2)."""
    if tuple(probs.shape) != EXPECTED_OUT:
        _fail(f"Probability shape {tuple(probs.shape)} != {EXPECTED_OUT}")
    _pass(f"Probability shape  {list(probs.shape)}")


def check_probability_range(probs: torch.Tensor) -> None:
    """4. Every probability is in [0, 1]."""
    if probs.min().item() < 0.0 or probs.max().item() > 1.0:
        _fail(f"Probabilities out of range: min={probs.min():.6f} max={probs.max():.6f}")
    _pass(f"Probability range  [{probs.min():.4f}, {probs.max():.4f}]  ⊂ [0, 1]")


def check_probability_sum(probs: torch.Tensor, tol: float = 1e-5) -> None:
    """5. Each image's two probabilities sum to 1.0."""
    row_sums = probs.sum(dim=1)
    max_dev  = (row_sums - 1.0).abs().max().item()
    if max_dev > tol:
        _fail(f"Prob rows don't sum to 1 — max deviation {max_dev:.2e}")
    _pass(f"Probability sums   all rows = 1.0  (max deviation {max_dev:.2e})")


def check_both_classes_active(probs: torch.Tensor, tol: float = 1e-4) -> None:
    """6. Neither column is all-zero (head is connected)."""
    for idx, name in enumerate(CLASS_NAMES):
        col_max = probs[:, idx].max().item()
        if col_max < tol:
            _fail(f"Class '{name}' (index {idx}) has zero activation — head may be disconnected")
    _pass(f"Both classes active — genuine max={probs[:,0].max():.4f}  fake max={probs[:,1].max():.4f}")


def check_gradient_flow(
    model: torch.nn.Module,
    images: torch.Tensor,
    labels: torch.Tensor,
) -> None:
    """7. Backward pass runs and classifier head receives gradients."""
    model.train()
    criterion = torch.nn.CrossEntropyLoss()
    logits    = model(images)
    loss      = criterion(logits, labels)
    loss.backward()

    # Check head parameters have gradients
    head       = model.classifier
    grad_norms = [
        p.grad.norm().item()
        for p in head.parameters()
        if p.grad is not None
    ]
    if not grad_norms:
        _fail("No gradients found on classifier head after backward()")
    _pass(
        f"Gradient flow OK — head grad norms: "
        f"[{', '.join(f'{g:.4f}' for g in grad_norms)}]"
    )
    model.eval()


def check_device_consistency(
    images: torch.Tensor,
    logits: torch.Tensor,
    probs:  torch.Tensor,
    model:  torch.nn.Module,
) -> None:
    """8. All tensors are on the same device."""
    model_device  = next(model.parameters()).device
    images_device = images.device
    logits_device = logits.device
    probs_device  = probs.device

    if not (images_device == logits_device == probs_device):
        _fail(f"Device mismatch: images={images_device} logits={logits_device} probs={probs_device}")
    _pass(f"Device consistency — all on '{model_device}'")


def check_batch_size_invariance(model: torch.nn.Module) -> None:
    """9. Correct output shape for batch sizes 1, 4, 16."""
    model.eval()
    for bs in [1, 4, 16]:
        x   = _make_batch(batch_size=bs)
        with torch.no_grad():
            out = model(x)
        expected = (bs, NUM_CLASSES)
        if tuple(out.shape) != expected:
            _fail(f"Batch size {bs}: output {tuple(out.shape)} != {expected}")
    _pass("Batch-size invariance — shapes correct for bs=1, 4, 16")


# ═══════════════════════════════════════════════════════════════════════════
# Per-image probability table
# ═══════════════════════════════════════════════════════════════════════════

def print_probability_table(
    logits: torch.Tensor,
    probs:  torch.Tensor,
    labels: torch.Tensor,
) -> None:
    """Print a formatted per-image breakdown for all 16 images."""
    _section("Per-image probability table  (batch of 16)")

    header = (
        f"  {'Img':>3}  {'True label':>12}  "
        f"{'Logit[0]':>10}  {'Logit[1]':>10}  "
        f"{'P(genuine)':>12}  {'P(fake)':>10}  "
        f"{'Prediction':>12}  {'Correct?':>8}"
    )
    print(header)
    print("  " + "─" * (len(header) - 2))

    correct = 0
    for i in range(probs.shape[0]):
        true_lbl  = labels[i].item()
        l0, l1    = logits[i, 0].item(), logits[i, 1].item()
        p_genuine = probs[i, 0].item()
        p_fake    = probs[i, 1].item()
        pred_idx  = 1 if p_fake >= 0.5 else 0
        pred_name = CLASS_NAMES[pred_idx]
        true_name = CLASS_NAMES[true_lbl]
        is_correct = pred_idx == true_lbl
        if is_correct:
            correct += 1
        tick = "✓" if is_correct else "✗"

        print(
            f"  {i:>3}  {true_name:>12}  "
            f"{l0:>+10.4f}  {l1:>+10.4f}  "
            f"{p_genuine:>12.6f}  {p_fake:>10.6f}  "
            f"{pred_name:>12}  {tick:>8}"
        )

    acc = correct / probs.shape[0]
    print(f"\n  Untrained accuracy: {correct}/{probs.shape[0]} = {acc:.1%}")
    print(f"  (Random chance baseline = 50.0%  — expect values close to this)")


# ═══════════════════════════════════════════════════════════════════════════
# Main test runner
# ═══════════════════════════════════════════════════════════════════════════

def run_forward_pass_test() -> None:
    print("\n" + "═" * 60)
    print("  Step 8 — Forward Pass Test")
    print("  EfficientNet-B0  |  Input→[16,3,224,224]  Output→[16,2]")
    print("═" * 60)

    # ── Setup ─────────────────────────────────────────────────────────────
    _section("Setup")
    model = build_model(freeze_backbone=False).to(DEVICE)
    model.eval()
    trainable = count_parameters(model)
    print(f"  Device           : {DEVICE}")
    print(f"  Backbone         : EfficientNet-B0 (ImageNet pre-trained)")
    print(f"  Trainable params : {trainable:,}")
    print(f"  Output classes   : {NUM_CLASSES}  ({' | '.join(f'{i}={n}' for i,n in enumerate(CLASS_NAMES))})")

    # ── Build inputs ──────────────────────────────────────────────────────
    _section("Building input batch")
    images = _make_batch(BATCH_SIZE, DEVICE)
    # Alternating genuine/fake labels for a balanced test batch
    labels = torch.tensor(
        [i % 2 for i in range(BATCH_SIZE)],
        dtype=torch.long,
        device=DEVICE,
    )
    print(f"  images shape : {list(images.shape)}")
    print(f"  images dtype : {images.dtype}")
    print(f"  images range : [{images.min():.3f}, {images.max():.3f}]  (ImageNet-normalised)")
    print(f"  labels       : {labels.tolist()}")
    print(f"  label key    : 0=genuine  1=fake")

    # ── Forward pass ──────────────────────────────────────────────────────
    _section("Forward pass  images → EfficientNet-B0 → logits")
    with torch.no_grad():
        logits = model(images)
    probs = F.softmax(logits, dim=1)

    print(f"  logits shape : {list(logits.shape)}")
    print(f"  logits range : [{logits.min():.4f}, {logits.max():.4f}]  (raw, no softmax)")
    print(f"  probs  shape : {list(probs.shape)}")

    # ── Assertions ────────────────────────────────────────────────────────
    _section("Assertions")
    check_input_shape(images)
    check_logit_shape(logits)
    check_probability_shape(probs)
    check_probability_range(probs)
    check_probability_sum(probs)
    check_both_classes_active(probs)
    check_device_consistency(images, logits, probs, model)
    check_batch_size_invariance(model)

    # Re-enable grad for gradient check
    images_grad = _make_batch(BATCH_SIZE, DEVICE)
    labels_grad = torch.tensor([i % 2 for i in range(BATCH_SIZE)], dtype=torch.long, device=DEVICE)
    check_gradient_flow(model, images_grad, labels_grad)

    # ── Per-image table ───────────────────────────────────────────────────
    print_probability_table(logits, probs, labels)

    # ── Loss baseline ────────────────────────────────────────────────────
    _section("Loss baseline (untrained model)")
    criterion   = torch.nn.CrossEntropyLoss()
    with torch.no_grad():
        loss_val = criterion(logits, labels).item()
    baseline = math.log(NUM_CLASSES)   # ln(2) ≈ 0.6931
    deviation = abs(loss_val - baseline)
    print(f"  CrossEntropyLoss : {loss_val:.6f}")
    print(f"  Random baseline  : {baseline:.6f}  (ln {NUM_CLASSES})")
    print(f"  Deviation        : {deviation:.6f}  {'✓ good init' if deviation < 0.3 else '⚠ unexpected'}")

    # ── Summary ───────────────────────────────────────────────────────────
    print("\n" + "═" * 60)
    print("  All checks PASSED")
    print()
    print("  Data flow confirmed:")
    print(f"  [16, 3, 224, 224]  →  EfficientNet-B0  →  [16, 2]")
    print()
    print(f"  Each row = one certificate image")
    print(f"  Column 0 = P(genuine)   Column 1 = P(fake)")
    print(f"  Both columns sum to 1.0 per image")
    print(f"  Model is ready for training.")
    print("═" * 60 + "\n")


# ─────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    run_forward_pass_test()
