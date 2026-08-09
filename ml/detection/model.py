"""
model.py
--------
EfficientNet-B0 (and alternatives) for certificate authenticity detection
using transfer learning from ImageNet pre-trained weights.

Transfer learning strategy — two phases:
─────────────────────────────────────────────────────────────────────────
Phase 1 — Head warm-up  (default: first ~5 epochs)
    Backbone frozen  →  only the new ClassifierHead is trained.
    Learns certificate-specific features without destroying ImageNet weights.

Phase 2 — Full fine-tune  (remaining epochs)
    All layers unfrozen with differential learning rates:
        backbone features  →  LR × 0.1   (small updates)
        classifier head    →  LR × 1.0   (full updates)
    Lets the backbone adapt gently to certificate domain.

EfficientNet-B0 architecture (what it already knows from ImageNet):
    Stem conv
    ├── MBConv blocks 1-7  (edges, textures, shapes, patterns)
    └── Head conv → AdaptiveAvgPool → Classifier (our custom head)

We replace only the Classifier. Everything else is pre-trained.
─────────────────────────────────────────────────────────────────────────

Supported backbones (MODEL_NAME in config.py):
    "efficientnet_b0"   ~5.3 M params  (default)
    "efficientnet_b2"   ~9.1 M params
    "resnet50"          ~25.6 M params
    "resnet18"          ~11.7 M params
"""

from typing import Dict, List, Optional, Tuple
import torch
import torch.nn as nn
from torchvision import models
from torchvision.models import (
    EfficientNet_B0_Weights,
    EfficientNet_B2_Weights,
    ResNet50_Weights,
    ResNet18_Weights,
)

from detection.config import (
    MODEL_NAME, NUM_CLASSES, PRETRAINED,
    FREEZE_BACKBONE, DROPOUT_RATE, DEVICE,
)


# ---------------------------------------------------------------------------
# Custom classifier head
# ---------------------------------------------------------------------------
class ClassifierHead(nn.Module):
    """
    Certificate-specific MLP head replacing EfficientNet's default classifier.

    Pipeline:
        in_features
            → BatchNorm1d          (stabilise feature scale)
            → Dropout(p)           (regularise)
            → Linear(in → 256)
            → ReLU
            → Dropout(p/2)
            → Linear(256 → num_classes)

    No Softmax here — CrossEntropyLoss in train.py expects raw logits.
    """

    def __init__(self, in_features: int, num_classes: int, dropout: float = 0.3):
        super().__init__()
        self.in_features  = in_features
        self.num_classes  = num_classes
        self.head = nn.Sequential(
            nn.BatchNorm1d(in_features),
            nn.Dropout(p=dropout),
            nn.Linear(in_features, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout / 2),
            nn.Linear(256, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.head(x)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _get_head_attr(model_name: str) -> str:
    """Return the attribute name of the classifier head for a given backbone."""
    return "classifier" if "efficientnet" in model_name else "fc"


def _freeze_backbone(model: nn.Module, model_name: str) -> None:
    """
    Freeze every parameter that belongs to the backbone feature extractor.
    The ClassifierHead parameters stay trainable.
    """
    head     = getattr(model, _get_head_attr(model_name))
    head_ids = {id(p) for p in head.parameters()}

    frozen = 0
    for p in model.parameters():
        if id(p) not in head_ids:
            p.requires_grad = False
            frozen += 1

    print(f"[Model] Phase 1 — backbone frozen ({frozen} param tensors). "
          f"Only ClassifierHead is trainable.")


def _unfreeze_backbone(model: nn.Module, model_name: str) -> None:
    """
    Unfreeze all backbone parameters for Phase 2 fine-tuning.
    Call this after the warm-up epochs complete.
    """
    for p in model.parameters():
        p.requires_grad = True

    total = sum(1 for p in model.parameters())
    print(f"[Model] Phase 2 — all {total} param tensors unfrozen for fine-tuning.")


# ---------------------------------------------------------------------------
# Model factory
# ---------------------------------------------------------------------------
def build_model(
    model_name:      str   = MODEL_NAME,
    num_classes:     int   = NUM_CLASSES,
    pretrained:      bool  = PRETRAINED,
    freeze_backbone: bool  = FREEZE_BACKBONE,
    dropout_rate:    float = DROPOUT_RATE,
) -> nn.Module:
    """
    Build and return a transfer-learning model ready for certificate detection.

    Steps performed:
        1. Load backbone with ImageNet weights (pretrained=True)
        2. Replace the final classifier with a custom ClassifierHead
        3. Optionally freeze the backbone (Phase 1 warm-up mode)

    Args:
        model_name:       Backbone identifier (see module docstring).
        num_classes:      Output classes (2 for genuine/fake).
        pretrained:       Load ImageNet weights — always True for transfer learning.
        freeze_backbone:  True  → Phase 1 (head-only training)
                          False → Phase 2 / full fine-tune from the start
        dropout_rate:     Dropout for the ClassifierHead.

    Returns:
        nn.Module with custom head, NOT yet moved to device.
        Call model.to(device) after this function.
    """
    model_name = model_name.lower()

    # ---- EfficientNet-B0 ------------------------------------------------
    if model_name == "efficientnet_b0":
        weights     = EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
        backbone    = models.efficientnet_b0(weights=weights)
        in_features = backbone.classifier[1].in_features   # 1280
        backbone.classifier = ClassifierHead(in_features, num_classes, dropout_rate)

    # ---- EfficientNet-B2 ------------------------------------------------
    elif model_name == "efficientnet_b2":
        weights     = EfficientNet_B2_Weights.IMAGENET1K_V1 if pretrained else None
        backbone    = models.efficientnet_b2(weights=weights)
        in_features = backbone.classifier[1].in_features   # 1408
        backbone.classifier = ClassifierHead(in_features, num_classes, dropout_rate)

    # ---- ResNet-50 -------------------------------------------------------
    elif model_name == "resnet50":
        weights     = ResNet50_Weights.IMAGENET1K_V1 if pretrained else None
        backbone    = models.resnet50(weights=weights)
        in_features = backbone.fc.in_features              # 2048
        backbone.fc = ClassifierHead(in_features, num_classes, dropout_rate)

    # ---- ResNet-18 -------------------------------------------------------
    elif model_name == "resnet18":
        weights     = ResNet18_Weights.IMAGENET1K_V1 if pretrained else None
        backbone    = models.resnet18(weights=weights)
        in_features = backbone.fc.in_features              # 512
        backbone.fc = ClassifierHead(in_features, num_classes, dropout_rate)

    else:
        raise ValueError(
            f"Unknown model_name '{model_name}'. "
            "Choose from: efficientnet_b0, efficientnet_b2, resnet50, resnet18."
        )

    if freeze_backbone:
        _freeze_backbone(backbone, model_name)

    return backbone


# ---------------------------------------------------------------------------
# Two-phase fine-tuning helpers (called from train.py)
# ---------------------------------------------------------------------------
def get_optimizer_params(
    model:      nn.Module,
    model_name: str,
    base_lr:    float,
    phase:      int = 2,
    backbone_lr_multiplier: float = 0.1,
) -> List[Dict]:
    """
    Return parameter groups for AdamW with differential learning rates.

    Phase 1 (warm-up): only the head is included (backbone is frozen).
    Phase 2 (fine-tune): backbone gets base_lr × backbone_lr_multiplier,
                          head gets base_lr.

    This prevents the pre-trained backbone from being overwritten too fast
    while still letting it adapt to certificate-domain features.

    Args:
        model:                   The nn.Module.
        model_name:              Backbone name string.
        base_lr:                 Base learning rate (applied to the head).
        phase:                   1 = warm-up (head only), 2 = full fine-tune.
        backbone_lr_multiplier:  LR scale for backbone in Phase 2 (default 0.1).

    Returns:
        List of dicts suitable for torch.optim.AdamW(params).
    """
    head      = getattr(model, _get_head_attr(model_name))
    head_ids  = {id(p) for p in head.parameters()}

    head_params     = [p for p in model.parameters() if id(p) in head_ids     and p.requires_grad]
    backbone_params = [p for p in model.parameters() if id(p) not in head_ids and p.requires_grad]

    if phase == 1:
        # Warm-up: only optimise the head
        return [{"params": head_params, "lr": base_lr, "name": "head"}]

    # Phase 2: differential LRs
    param_groups = []
    if backbone_params:
        param_groups.append({
            "params": backbone_params,
            "lr":     base_lr * backbone_lr_multiplier,
            "name":   "backbone",
        })
    param_groups.append({
        "params": head_params,
        "lr":     base_lr,
        "name":   "head",
    })
    return param_groups


def switch_to_phase2(
    model:      nn.Module,
    model_name: str,
    optimizer:  torch.optim.Optimizer,
    base_lr:    float,
    backbone_lr_multiplier: float = 0.1,
) -> None:
    """
    Transition the model from Phase 1 (frozen backbone) to Phase 2 (full fine-tune).

    Call this from train.py after the warm-up epochs finish.
    Updates both model parameters and optimizer parameter groups in-place.

    Args:
        model:                  The nn.Module (will be unfrozen).
        model_name:             Backbone name string.
        optimizer:              The AdamW optimizer (param groups will be replaced).
        base_lr:                Base learning rate for the head.
        backbone_lr_multiplier: LR fraction for the backbone (default 0.1).
    """
    _unfreeze_backbone(model, model_name)

    new_groups = get_optimizer_params(
        model, model_name, base_lr, phase=2,
        backbone_lr_multiplier=backbone_lr_multiplier,
    )
    optimizer.param_groups.clear()
    for group in new_groups:
        optimizer.add_param_group(group)

    print(f"[Model] Optimizer updated — backbone LR: {base_lr * backbone_lr_multiplier:.2e}  "
          f"head LR: {base_lr:.2e}")


# ---------------------------------------------------------------------------
# Inspection utilities
# ---------------------------------------------------------------------------
def count_parameters(model: nn.Module) -> int:
    """Count trainable parameters."""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


def count_all_parameters(model: nn.Module) -> int:
    """Count all parameters (trainable + frozen)."""
    return sum(p.numel() for p in model.parameters())


def print_model_summary(model: nn.Module, model_name: str = MODEL_NAME) -> None:
    """
    Print a human-readable summary showing each top-level block,
    its parameter count, and whether it is frozen or trainable.
    """
    trainable_total = count_parameters(model)
    all_total       = count_all_parameters(model)
    frozen_total    = all_total - trainable_total

    print("\n" + "=" * 62)
    print(f"  Model: {model_name.upper()}")
    print(f"  Total params    : {all_total:>12,}")
    print(f"  Trainable params: {trainable_total:>12,}  ({100*trainable_total/all_total:.1f}%)")
    print(f"  Frozen params   : {frozen_total:>12,}  ({100*frozen_total/all_total:.1f}%)")
    print("=" * 62)
    print(f"  {'Layer':<30} {'Params':>10}  {'Status'}")
    print("  " + "-" * 58)

    for name, module in model.named_children():
        params    = sum(p.numel() for p in module.parameters())
        trainable = sum(p.numel() for p in module.parameters() if p.requires_grad)
        status    = (
            "trainable" if trainable == params
            else "frozen"   if trainable == 0
            else "partial"
        )
        print(f"  {name:<30} {params:>10,}  {status}")

    print("=" * 62 + "\n")


def inspect_head_replacement(model_name: str = "efficientnet_b0") -> None:
    """
    Show exactly what the final-layer surgery does:

        BEFORE  →  EfficientNet original classifier  (1280 → 1000)
        AFTER   →  Our ClassifierHead                (1280 → 256 → 2)

    Prints the layer structure, weight shapes, and a live forward pass
    through just the head to confirm output size = NUM_CLASSES (2).

    This function is purely diagnostic — it does not modify any model.
    """
    DIVIDER = "─" * 64

    # ── BEFORE: stock EfficientNet-B0 classifier ──────────────────────────
    stock = models.efficientnet_b0(weights=None)   # no download needed
    original_head  = stock.classifier
    original_shape = list(stock.classifier.parameters())[-1].shape  # last Linear weight

    print(f"\n{DIVIDER}")
    print("  STEP 5: Final-layer replacement — EfficientNet-B0")
    print(DIVIDER)

    print("\n  BEFORE  (ImageNet — 1000 classes)")
    print(f"  {DIVIDER[:52]}")
    print(f"  {original_head}")
    for name, param in stock.classifier.named_parameters():
        print(f"    {name:<30}  shape: {list(param.shape)}")
    out_classes_before = original_shape[0]
    print(f"\n  Output classes : {out_classes_before}  (ImageNet categories)")

    # ── AFTER: our ClassifierHead ──────────────────────────────────────────
    in_features  = stock.classifier[1].in_features   # 1280 for B0
    custom_head  = ClassifierHead(in_features, NUM_CLASSES, DROPOUT_RATE)

    print(f"\n  AFTER   (Certificates — {NUM_CLASSES} classes)")
    print(f"  {DIVIDER[:52]}")
    print(f"  {custom_head}")
    for name, param in custom_head.named_parameters():
        print(f"    {name:<30}  shape: {list(param.shape)}")

    # Verify output shape with a dummy forward pass
    dummy          = torch.randn(4, in_features)   # 4 samples, 1280 features
    custom_head.eval()
    with torch.no_grad():
        out = custom_head(dummy)
    print(f"\n  Head input  shape : {list(dummy.shape)}")
    print(f"  Head output shape : {list(out.shape)}")
    print(f"\n  Output classes : {out.shape[1]}")
    print(f"    index 0  →  genuine  ({'✓' if out.shape[1] == 2 else '✗'})")
    print(f"    index 1  →  fake     ({'✓' if out.shape[1] == 2 else '✗'})")

    # ── Data flow diagram ──────────────────────────────────────────────────
    print(f"\n  Data flow after replacement:")
    print(f"  {'─'*52}")
    print(f"  Certificate image  (3 × 224 × 224)")
    print(f"       ↓")
    print(f"  EfficientNet features  (MBConv blocks 1-7)")
    print(f"       ↓")
    print(f"  AdaptiveAvgPool  →  1 × 1 × 1280")
    print(f"       ↓  flatten")
    print(f"  1280-dim feature vector")
    print(f"       ↓  BatchNorm1d(1280)")
    print(f"       ↓  Dropout(0.30)")
    print(f"       ↓  Linear(1280 → 256)")
    print(f"       ↓  ReLU")
    print(f"       ↓  Dropout(0.15)")
    print(f"       ↓  Linear(256 → 2)        ← was Linear(1280 → 1000)")
    print(f"  [logit_genuine,  logit_fake]")
    print(f"       ↓  Softmax (at inference)")
    print(f"  [P(genuine),     P(fake)]")
    print(f"  {'─'*52}")
    print(f"  Class 0 = genuine  |  Class 1 = fake")
    print(f"{DIVIDER}\n")


# ---------------------------------------------------------------------------
# Checkpoint helpers
# ---------------------------------------------------------------------------
def load_checkpoint(
    checkpoint_path: str,
    model:  Optional[nn.Module] = None,
    device: str = DEVICE,
) -> nn.Module:
    """
    Load model weights from a .pth checkpoint.

    Handles two formats:
        - Raw state_dict  (saved with torch.save(model.state_dict(), path))
        - Wrapped dict    (saved by train.py with "model_state_dict" key)

    If *model* is None, a fresh model is built from config defaults.
    """
    if model is None:
        model = build_model()

    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=True)

    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        model.load_state_dict(checkpoint["model_state_dict"])
        epoch    = checkpoint.get("epoch", "?")
        val_loss = checkpoint.get("val_loss", "?")
        print(f"[Model] Loaded checkpoint — epoch {epoch}, val_loss {val_loss}")
    else:
        model.load_state_dict(checkpoint)

    model.to(device)
    model.eval()
    print(f"[Model] Weights loaded from '{checkpoint_path}' → device: {device}")
    return model


# ---------------------------------------------------------------------------
# Entry point  (python -m detection.model)
# ---------------------------------------------------------------------------
if __name__ == "__main__":

    # ── Step 5: show the head surgery ────────────────────────────────────
    inspect_head_replacement()

    # ── Full model summary in both phases ────────────────────────────────
    print("── Phase 1: backbone frozen (warm-up) ──")
    model_p1 = build_model(freeze_backbone=True)
    model_p1.to(DEVICE)
    print_model_summary(model_p1)

    print("── Phase 2: full fine-tune ──")
    model_p2 = build_model(freeze_backbone=False)
    model_p2.to(DEVICE)
    print_model_summary(model_p2)

    # ── End-to-end forward pass ──────────────────────────────────────────
    dummy  = torch.randn(4, 3, 224, 224).to(DEVICE)
    logits = model_p2(dummy)
    probs  = torch.softmax(logits, dim=1)
    print(f"Input  : {tuple(dummy.shape)}")
    print(f"Logits : {tuple(logits.shape)}  (raw, no softmax)")
    print(f"Probs  : genuine={probs[:,0].mean():.4f}  fake={probs[:,1].mean():.4f}  (batch mean)")
    print(f"\nClass 0 = genuine  |  Class 1 = fake")
