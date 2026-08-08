"""
predict.py
----------
Inference utilities for the certificate authenticity detection model.

Usage examples:

    # Single image (CLI)
    python -m detection.predict --image path/to/cert.png

    # Batch of images
    python -m detection.predict --folder path/to/folder --output results.json

    # Import and call programmatically
    from detection.predict import predict_image, predict_batch
    result  = predict_image("cert.png")
    results = predict_batch(["a.png", "b.jpg"])
"""

import argparse
import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Union

import torch
import torch.nn.functional as F
from PIL import Image

from detection.config import (
    DEVICE, CLASS_NAMES, CONFIDENCE_THRESHOLD,
    BEST_MODEL_PATH, OUTPUTS_DIR,
)
from detection.dataset import get_transforms
from detection.model import build_model, load_checkpoint


# ---------------------------------------------------------------------------
# Load model once and cache it (lazy singleton)
# ---------------------------------------------------------------------------
_model_cache: Optional[torch.nn.Module] = None

def _get_model(
    checkpoint_path: Union[str, Path] = BEST_MODEL_PATH,
    device: str = DEVICE,
) -> torch.nn.Module:
    """Return a cached, eval-mode model, loading it on first call."""
    global _model_cache
    if _model_cache is None:
        model = build_model()
        _model_cache = load_checkpoint(str(checkpoint_path), model=model, device=device)
    return _model_cache


# ---------------------------------------------------------------------------
# Single-image inference
# ---------------------------------------------------------------------------
def predict_image(
    image_path: Union[str, Path],
    checkpoint_path: Union[str, Path] = BEST_MODEL_PATH,
    device: str = DEVICE,
    threshold: float = CONFIDENCE_THRESHOLD,
) -> Dict:
    """
    Run inference on a single certificate image.

    Args:
        image_path:      Path to an image file (any PIL-readable format).
        checkpoint_path: Path to the .pth model checkpoint.
        device:          "cpu" or "cuda".
        threshold:       Probability above which the certificate is labelled fake.

    Returns:
        Dict with keys:
            file         – image filename
            label        – predicted class name ("genuine" or "fake")
            label_index  – integer class index
            confidence   – probability of the predicted class
            probabilities – {class_name: probability} for all classes
            is_fake      – bool convenience flag
    """
    image_path = Path(image_path)
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    model     = _get_model(checkpoint_path, device)
    transform = get_transforms("val")

    image  = Image.open(image_path).convert("RGB")
    tensor = transform(image).unsqueeze(0).to(device)   # (1, C, H, W)

    with torch.no_grad():
        logits = model(tensor)
        probs  = F.softmax(logits, dim=1).squeeze(0).cpu()  # (NUM_CLASSES,)

    fake_prob    = probs[1].item()
    label_index  = int(fake_prob >= threshold)
    label        = CLASS_NAMES[label_index]
    confidence   = probs[label_index].item()

    return {
        "file":          image_path.name,
        "label":         label,
        "label_index":   label_index,
        "confidence":    round(confidence, 6),
        "probabilities": {
            CLASS_NAMES[i]: round(probs[i].item(), 6)
            for i in range(len(CLASS_NAMES))
        },
        "is_fake":       label_index == 1,
    }


# ---------------------------------------------------------------------------
# Batch inference
# ---------------------------------------------------------------------------
def predict_batch(
    image_paths: List[Union[str, Path]],
    checkpoint_path: Union[str, Path] = BEST_MODEL_PATH,
    device: str = DEVICE,
    threshold: float = CONFIDENCE_THRESHOLD,
    batch_size: int = 16,
) -> List[Dict]:
    """
    Run inference on a list of image paths.

    Processes images in mini-batches for efficiency.

    Returns:
        List of result dicts (same structure as predict_image).
    """
    model     = _get_model(checkpoint_path, device)
    transform = get_transforms("val")
    results   = []

    # Split into batches
    chunks = [
        image_paths[i : i + batch_size]
        for i in range(0, len(image_paths), batch_size)
    ]

    for chunk in chunks:
        tensors = []
        valid_paths = []

        for p in chunk:
            p = Path(p)
            if not p.exists():
                print(f"[Predict] Warning: skipping missing file {p}")
                continue
            try:
                img = Image.open(p).convert("RGB")
                tensors.append(transform(img))
                valid_paths.append(p)
            except Exception as exc:
                print(f"[Predict] Warning: could not load {p} — {exc}")

        if not tensors:
            continue

        batch = torch.stack(tensors).to(device)    # (B, C, H, W)
        with torch.no_grad():
            logits = model(batch)
            probs  = F.softmax(logits, dim=1).cpu()  # (B, NUM_CLASSES)

        for path, prob_row in zip(valid_paths, probs):
            fake_prob   = prob_row[1].item()
            label_index = int(fake_prob >= threshold)
            label       = CLASS_NAMES[label_index]
            confidence  = prob_row[label_index].item()

            results.append({
                "file":          path.name,
                "path":          str(path),
                "label":         label,
                "label_index":   label_index,
                "confidence":    round(confidence, 6),
                "probabilities": {
                    CLASS_NAMES[i]: round(prob_row[i].item(), 6)
                    for i in range(len(CLASS_NAMES))
                },
                "is_fake":       label_index == 1,
            })

    return results


# ---------------------------------------------------------------------------
# Folder prediction helper
# ---------------------------------------------------------------------------
def predict_folder(
    folder_path: Union[str, Path],
    checkpoint_path: Union[str, Path] = BEST_MODEL_PATH,
    device: str = DEVICE,
    threshold: float = CONFIDENCE_THRESHOLD,
    output_json: Optional[Union[str, Path]] = None,
) -> List[Dict]:
    """
    Predict on all images found recursively under *folder_path*.

    Optionally saves results to a JSON file.
    """
    from detection.dataset import _collect_images   # reuse the same scanner
    folder_path = Path(folder_path)
    image_paths = _collect_images(folder_path)

    if not image_paths:
        print(f"[Predict] No images found under {folder_path}")
        return []

    print(f"[Predict] Found {len(image_paths)} images under {folder_path}")
    t0 = time.time()

    results = predict_batch(
        image_paths,
        checkpoint_path=checkpoint_path,
        device=device,
        threshold=threshold,
    )

    elapsed = time.time() - t0
    genuine = sum(1 for r in results if not r["is_fake"])
    fake    = sum(1 for r in results if r["is_fake"])
    print(
        f"[Predict] Done in {elapsed:.1f}s — "
        f"Genuine: {genuine} | Fake: {fake} | Total: {len(results)}"
    )

    if output_json:
        output_json = Path(output_json)
        output_json.parent.mkdir(parents=True, exist_ok=True)
        output_json.write_text(json.dumps(results, indent=2))
        print(f"[Predict] Results saved to {output_json}")

    return results


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------
def _parse_args():
    parser = argparse.ArgumentParser(
        description="Certificate Authenticity Detection — Inference"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--image",  type=str, help="Path to a single image file.")
    group.add_argument("--folder", type=str, help="Path to a folder of images.")

    parser.add_argument(
        "--checkpoint", type=str, default=str(BEST_MODEL_PATH),
        help=f"Path to model checkpoint (default: {BEST_MODEL_PATH}).",
    )
    parser.add_argument(
        "--threshold", type=float, default=CONFIDENCE_THRESHOLD,
        help=f"Fake-probability threshold (default: {CONFIDENCE_THRESHOLD}).",
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="Path to save JSON results (folder mode only).",
    )
    parser.add_argument(
        "--device", type=str, default=DEVICE,
        help=f"Device to run on (default: {DEVICE}).",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()

    if args.image:
        result = predict_image(
            args.image,
            checkpoint_path=args.checkpoint,
            device=args.device,
            threshold=args.threshold,
        )
        print(json.dumps(result, indent=2))

    elif args.folder:
        output_path = (
            Path(args.output) if args.output
            else OUTPUTS_DIR / "predictions.json"
        )
        predict_folder(
            args.folder,
            checkpoint_path=args.checkpoint,
            device=args.device,
            threshold=args.threshold,
            output_json=output_path,
        )
