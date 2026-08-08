"""
run_predictions.py
------------------
Step 3: Run predictions on every image in the test dataset.

Full pipeline for each certificate image:

    Certificate image (JPEG / PNG / BMP / ...)
          │
          ▼  Stage 1 — Preprocessing
          │     • Open with PIL, convert to RGB
          │     • Resize to 224×224
          │     • Convert to float32 tensor [0,1]
          │     • Normalise with ImageNet mean/std
          │       mean=[0.485, 0.456, 0.406]
          │       std =[0.229, 0.224, 0.225]
          │
          ▼  Stage 2 — EfficientNet-B0 forward pass
          │     • model.eval()  +  torch.no_grad()
          │     • features block → 1280-dim vector
          │     • ClassifierHead → 2 raw logits
          │
          ▼  Stage 3 — Prediction
                • Softmax(logits) → [P(genuine), P(fake)]
                • argmax          → predicted class index
                • threshold       → final verdict

Output per image:
    {
        "image":         filename,
        "true_label":    "genuine" | "fake"   (from folder name),
        "predicted":     "genuine" | "fake",
        "correct":       true | false,
        "p_genuine":     float,
        "p_fake":        float,
        "confidence":    float,               (prob of predicted class)
        "preprocessing": { resize, normalise steps applied }
    }

Usage:
    # Run on processed_dataset/test/ using the canonical best model
    python -m detection.run_predictions

    # Custom paths
    python -m detection.run_predictions --test-dir path/to/test --output results.json
"""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from tqdm import tqdm

from detection.config import (
    CLASS_NAMES,
    CONFIDENCE_THRESHOLD,
    DEVICE,
    IMAGE_SIZE,
    MEAN,
    STD,
    OUTPUTS_DIR,
    TEST_DIR,
    BATCH_SIZE,
    BEST_MODEL_CANONICAL_PATH,
)
from detection.dataset import get_transforms, CertificateDataset, _collect_images
from detection.load_model import load_best_model


# ═══════════════════════════════════════════════════════════════════════════
# Result dataclass — one instance per image
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class PredictionResult:
    """
    Holds the full prediction record for a single certificate image.

    Fields
    ──────
    image        : filename (e.g. "cert_001.png")
    path         : full absolute path
    true_label   : ground-truth class name  ("genuine" or "fake")
    true_index   : ground-truth class index (0 or 1)
    predicted    : predicted class name
    pred_index   : predicted class index
    correct      : True if predicted == true_label
    p_genuine    : P(genuine) — softmax probability
    p_fake       : P(fake)    — softmax probability
    confidence   : probability of the predicted class
    preprocessing: dict describing the transforms applied
    """
    image        : str
    path         : str
    true_label   : str
    true_index   : int
    predicted    : str
    pred_index   : int
    correct      : bool
    p_genuine    : float
    p_fake       : float
    confidence   : float
    preprocessing: Dict = field(default_factory=dict)

    def as_dict(self) -> Dict:
        return asdict(self)


# ═══════════════════════════════════════════════════════════════════════════
# Stage 1 — Preprocessing
# ═══════════════════════════════════════════════════════════════════════════

# The transform pipeline is the same as validation — no augmentation.
# Defined once here so the same object is reused for every image.
_PREPROCESS = get_transforms("val")

# Human-readable description of every step in the pipeline
PREPROCESSING_STEPS: Dict = {
    "step_1": f"Open image with PIL, convert to RGB",
    "step_2": f"Resize shortest edge to {IMAGE_SIZE}×{IMAGE_SIZE} px",
    "step_3": "Convert to float32 tensor, scale pixels to [0, 1]",
    "step_4": (
        f"Normalise with ImageNet statistics — "
        f"mean={MEAN}  std={STD}"
    ),
    "output": f"torch.Tensor  shape=(3, {IMAGE_SIZE}, {IMAGE_SIZE})  dtype=float32",
}


def preprocess_image(image_path: Path) -> torch.Tensor:
    """
    Stage 1 — Preprocessing.

    Applies the full preprocessing pipeline to a single image file:
        PIL open → RGB → Resize(224) → ToTensor → Normalize

    Args:
        image_path: Path to the certificate image.

    Returns:
        torch.Tensor of shape (1, 3, 224, 224) — batch dimension added,
        ready to feed directly into the model.
    """
    image  = Image.open(image_path).convert("RGB")   # Step 1
    tensor = _PREPROCESS(image)                        # Steps 2-4
    return tensor.unsqueeze(0)                         # add batch dim → (1,3,H,W)


def preprocess_batch(
    image_paths: List[Path],
) -> Tuple[torch.Tensor, List[Path]]:
    """
    Stage 1 — Preprocessing for a list of images.

    Skips files that fail to load and logs a warning for each.

    Returns:
        (batch_tensor, valid_paths)
        batch_tensor : shape (N, 3, 224, 224)
        valid_paths  : paths corresponding to each row in batch_tensor
    """
    tensors     : List[torch.Tensor] = []
    valid_paths : List[Path]         = []

    for p in image_paths:
        try:
            image  = Image.open(p).convert("RGB")
            tensor = _PREPROCESS(image)
            tensors.append(tensor)
            valid_paths.append(p)
        except Exception as exc:
            print(f"  [Preprocess] Warning: skipping {p.name} — {exc}")

    if not tensors:
        return torch.empty(0), []

    return torch.stack(tensors), valid_paths   # (N, 3, 224, 224)


# ═══════════════════════════════════════════════════════════════════════════
# Stage 2+3 — EfficientNet forward pass + prediction
# ═══════════════════════════════════════════════════════════════════════════

def run_batch(
    model:      nn.Module,
    batch:      torch.Tensor,
    paths:      List[Path],
    true_labels: List[int],
    device:     str,
    threshold:  float,
) -> List[PredictionResult]:
    """
    Stages 2 and 3 for one mini-batch.

    Stage 2 — EfficientNet forward pass (inside torch.no_grad()):
        batch  →  features block  →  1280-dim vector
               →  ClassifierHead  →  logits (B, 2)

    Stage 3 — Prediction:
        logits  →  Softmax  →  [P(genuine), P(fake)]
                →  argmax   →  predicted class
                →  threshold check  →  final verdict

    Args:
        model:       EfficientNet-B0 in eval mode.
        batch:       Preprocessed tensor (B, 3, 224, 224).
        paths:       Image paths matching batch rows.
        true_labels: Ground-truth integer labels.
        device:      "cpu" or "cuda".
        threshold:   P(fake) threshold above which image is labelled fake.

    Returns:
        List of PredictionResult, one per image.
    """
    batch = batch.to(device, non_blocking=True)

    # Stage 2: forward pass — no gradients, weights never change
    with torch.no_grad():
        logits = model(batch)                   # (B, 2) raw logits
        probs  = F.softmax(logits, dim=1).cpu() # (B, 2) probabilities

    results: List[PredictionResult] = []

    for i, (path, true_idx) in enumerate(zip(paths, true_labels)):
        p_genuine = round(probs[i, 0].item(), 6)
        p_fake    = round(probs[i, 1].item(), 6)

        # Stage 3: threshold-based prediction
        pred_idx  = 1 if p_fake >= threshold else 0
        pred_name = CLASS_NAMES[pred_idx]
        true_name = CLASS_NAMES[true_idx]
        confidence = p_fake if pred_idx == 1 else p_genuine

        results.append(PredictionResult(
            image        = path.name,
            path         = str(path),
            true_label   = true_name,
            true_index   = true_idx,
            predicted    = pred_name,
            pred_index   = pred_idx,
            correct      = (pred_idx == true_idx),
            p_genuine    = p_genuine,
            p_fake       = p_fake,
            confidence   = round(confidence, 6),
            preprocessing = PREPROCESSING_STEPS,
        ))

    return results


# ═══════════════════════════════════════════════════════════════════════════
# Main prediction runner
# ═══════════════════════════════════════════════════════════════════════════

def run_predictions(
    test_dir:   Optional[Path] = None,
    model:      Optional[nn.Module] = None,
    device:     str   = DEVICE,
    batch_size: int   = BATCH_SIZE,
    threshold:  float = CONFIDENCE_THRESHOLD,
    output_json: Optional[Path] = None,
    verbose:    bool  = True,
) -> List[PredictionResult]:
    """
    Run the full preprocessing → EfficientNet → prediction pipeline on
    every image in the test directory.

    Args:
        test_dir:    Root of the test set (default: processed_dataset/test/).
                     Must contain genuine/ and fake/ sub-folders.
        model:       Pre-loaded nn.Module.  If None, loads the canonical
                     best model from models/certificate_detector_best.pth.
        device:      "cpu" or "cuda".
        batch_size:  Images processed per forward pass.
        threshold:   P(fake) ≥ threshold → predicted "fake".
        output_json: If given, saves all results to this JSON file.
        verbose:     Print per-image table and summary.

    Returns:
        List of PredictionResult — one per image, in deterministic order.
    """
    root = Path(test_dir) if test_dir else TEST_DIR

    # ── Load model ────────────────────────────────────────────────────────
    if model is None:
        model = load_best_model(device=device, verbose=verbose)
    model.eval()

    # ── Collect test images ───────────────────────────────────────────────
    # Gather from genuine/ and fake/ sub-folders, label by folder name
    all_paths  : List[Path] = []
    all_labels : List[int]  = []

    for cls_name, label in [("genuine", 0), ("fake", 1)]:
        cls_dir = root / cls_name
        if not cls_dir.exists():
            print(f"  [Predictions] Warning: {cls_dir} not found — skipping")
            continue
        images = _collect_images(cls_dir)
        all_paths.extend(images)
        all_labels.extend([label] * len(images))

    if not all_paths:
        raise RuntimeError(
            f"No test images found under {root}.\n"
            f"Expected: {root}/genuine/  and  {root}/fake/"
        )

    n_total = len(all_paths)

    # ── Header ────────────────────────────────────────────────────────────
    if verbose:
        D = "─" * 62
        print(f"\n{'═'*62}")
        print("  Step 3 — Run Predictions on Test Dataset")
        print(f"{'═'*62}")
        print(f"  Test directory : {root}")
        print(f"  Total images   : {n_total}")
        print(f"  Batch size     : {batch_size}")
        print(f"  Threshold      : P(fake) ≥ {threshold} → 'fake'")
        print(f"  Device         : {device}")
        print(D)
        print("  Preprocessing pipeline applied to every image:")
        for k, v in PREPROCESSING_STEPS.items():
            print(f"    {k:<8}  {v}")
        print(f"{'═'*62}\n")

    # ── Run pipeline in mini-batches ──────────────────────────────────────
    all_results : List[PredictionResult] = []
    t0 = time.time()

    # Build chunks: [ (paths_chunk, labels_chunk), ... ]
    chunks = [
        (all_paths[i : i + batch_size], all_labels[i : i + batch_size])
        for i in range(0, n_total, batch_size)
    ]

    pbar = tqdm(
        chunks,
        desc="  Predicting",
        unit="batch",
        total=len(chunks),
        dynamic_ncols=True,
    )

    for path_chunk, label_chunk in pbar:

        # Stage 1: Preprocessing
        batch_tensor, valid_paths = preprocess_batch(path_chunk)
        if batch_tensor.shape[0] == 0:
            continue

        # Align labels to valid paths only
        path_to_label = {p: l for p, l in zip(path_chunk, label_chunk)}
        valid_labels  = [path_to_label[p] for p in valid_paths]

        # Stages 2+3: Forward pass + prediction
        batch_results = run_batch(
            model, batch_tensor, valid_paths,
            valid_labels, device, threshold,
        )
        all_results.extend(batch_results)

        correct_in_batch = sum(r.correct for r in batch_results)
        pbar.set_postfix(acc=f"{correct_in_batch}/{len(batch_results)}")

    elapsed = time.time() - t0

    # ── Summary ───────────────────────────────────────────────────────────
    if verbose:
        _print_prediction_summary(all_results, elapsed)

    # ── Save JSON ─────────────────────────────────────────────────────────
    if output_json:
        out_path = Path(output_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            json.dumps([r.as_dict() for r in all_results], indent=2)
        )
        print(f"  Results saved → {out_path}\n")

    return all_results


# ═══════════════════════════════════════════════════════════════════════════
# Output formatters
# ═══════════════════════════════════════════════════════════════════════════

def _ascii_bar(value: float, width: int = 20) -> str:
    filled = int(round(value * width))
    return "[" + "█" * filled + "░" * (width - filled) + "]"


def _print_prediction_summary(
    results: List[PredictionResult],
    elapsed: float,
) -> None:
    """Print a concise summary after all predictions are complete."""
    n = len(results)
    if n == 0:
        print("  No predictions to summarise.")
        return

    correct   = sum(r.correct    for r in results)
    n_genuine = sum(r.true_index == 0 for r in results)
    n_fake    = sum(r.true_index == 1 for r in results)
    tp_gen    = sum(r.correct and r.true_index == 0 for r in results)
    tp_fake   = sum(r.correct and r.true_index == 1 for r in results)
    acc       = correct / max(n, 1)

    D = "─" * 62
    print(f"\n{'═'*62}")
    print("  Prediction Summary")
    print(f"{'═'*62}")
    print(f"  Total images    : {n}")
    print(f"  Correct         : {correct}  ({acc:.1%})")
    print(f"  Wrong           : {n - correct}")
    print(f"  Time elapsed    : {elapsed:.1f}s"
          f"  ({elapsed/max(n,1)*1000:.1f} ms/image)")
    print(D)
    print(f"  Per-class accuracy:")

    for cls_name, n_cls, tp in [("genuine", n_genuine, tp_gen),
                                  ("fake",    n_fake,    tp_fake)]:
        cls_acc = tp / max(n_cls, 1)
        bar     = _ascii_bar(cls_acc)
        print(f"    {cls_name:<10}  {bar}  {cls_acc:.4f}"
              f"  ({tp}/{n_cls} correct)")

    print(D)
    print(f"  Threshold used  : P(fake) ≥ {CONFIDENCE_THRESHOLD} → 'fake'")
    print(f"{'═'*62}\n")


def print_per_image_table(
    results:  List[PredictionResult],
    max_rows: int = 30,
) -> None:
    """
    Print a per-image table with true label, prediction, probabilities,
    and a ✓/✗ column.
    """
    n = min(len(results), max_rows)
    print(f"\n  Per-image predictions  (showing {n} of {len(results)}):")
    D = "─" * 78
    print(f"  {D}")
    print(
        f"  {'#':>4}  {'Image':<22}  {'True':>10}  {'Pred':>10}"
        f"  {'P(genuine)':>10}  {'P(fake)':>8}  {'Conf':>6}  {'':>3}"
    )
    print(f"  {D}")

    for i, r in enumerate(results[:n]):
        tick = "✓" if r.correct else "✗"
        img  = r.image[:22] if len(r.image) <= 22 else r.image[:19] + "..."
        print(
            f"  {i:>4}  {img:<22}  {r.true_label:>10}  {r.predicted:>10}"
            f"  {r.p_genuine:>10.4f}  {r.p_fake:>8.4f}  {r.confidence:>6.4f}  {tick:>3}"
        )

    if len(results) > max_rows:
        print(f"  ... ({len(results) - max_rows} more rows not shown)")
    print(f"  {D}\n")


# ═══════════════════════════════════════════════════════════════════════════
# CLI entry point
# ═══════════════════════════════════════════════════════════════════════════

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Step 3: Run predictions on the test dataset."
    )
    p.add_argument(
        "--test-dir", type=str, default=None,
        help=f"Test directory (default: {TEST_DIR})",
    )
    p.add_argument(
        "--output", type=str,
        default=str(OUTPUTS_DIR / "test_predictions.json"),
        help="Path to save JSON results.",
    )
    p.add_argument(
        "--batch-size", type=int, default=BATCH_SIZE,
        help=f"Images per forward pass (default: {BATCH_SIZE})",
    )
    p.add_argument(
        "--threshold", type=float, default=CONFIDENCE_THRESHOLD,
        help=f"Fake-probability threshold (default: {CONFIDENCE_THRESHOLD})",
    )
    p.add_argument(
        "--device", type=str, default=DEVICE,
        help=f"Device (default: {DEVICE})",
    )
    p.add_argument(
        "--table", action="store_true",
        help="Print per-image prediction table.",
    )
    return p.parse_args()


if __name__ == "__main__":
    args = _parse_args()

    results = run_predictions(
        test_dir    = Path(args.test_dir) if args.test_dir else None,
        device      = args.device,
        batch_size  = args.batch_size,
        threshold   = args.threshold,
        output_json = Path(args.output),
        verbose     = True,
    )

    if args.table:
        print_per_image_table(results, max_rows=30)
