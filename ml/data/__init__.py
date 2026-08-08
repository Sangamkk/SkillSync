"""
certificate-ai · data
======================

Public surface of the data loading package.

    from data import CertificateDataset, build_dataloaders, get_loader

Data flow
---------

    Training images
          │
          ▼
    get_train_transforms()     ← rotation, colour jitter, sharpness, JPEG
          │
          ▼
    CertificateDataset(split="train")
          │
          ▼
    DataLoader(shuffle=True)
          │
          ▼
    EfficientNet


    Validation / Test images
          │
          ▼
    get_val_transforms()       ← resize + normalize ONLY (no randomness)
          │
          ▼
    CertificateDataset(split="val" | "test")
          │
          ▼
    DataLoader(shuffle=False)
          │
          ▼
    Model

Sub-modules
-----------
dataset     — CertificateDataset (PyTorch Dataset)
dataloader  — build_dataloaders(), get_loader() factories
"""

from data.dataset import CertificateDataset, LABEL_MAP
from data.dataloader import build_dataloaders, get_loader

__all__ = [
    "CertificateDataset",
    "LABEL_MAP",
    "build_dataloaders",
    "get_loader",
]
