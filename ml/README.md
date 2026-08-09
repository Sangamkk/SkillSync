# Certificate AI

AI project for certificate authenticity detection, tampering analysis, and field extraction. This repository is separate from the backend API and holds datasets, models, notebooks, and training scripts.

---

## Dataset Source

The dataset is built for training and evaluating certificate verification models. It combines **genuine** certificates from major online learning platforms with **fake** samples that simulate common tampering patterns.

### Genuine certificates

Collected from publicly issued credentials on platforms such as:

| Platform | Folder |
|----------|--------|
| Coursera | `dataset/genuine/coursera/` |
| Udemy | `dataset/genuine/udemy/` |
| Google | `dataset/genuine/google/` |
| IBM | `dataset/genuine/ibm/` |
| Microsoft | `dataset/genuine/microsoft/` |
| AWS | `dataset/genuine/aws/` |
| Cisco | `dataset/genuine/cisco/` |
| LinkedIn Learning | `dataset/genuine/linkedin/` |
| NPTEL | `dataset/genuine/nptel/` |
| Other issuers | `dataset/genuine/others/` |

Sources include direct downloads from issuer portals, learner-provided copies (with consent), and publicly shareable credential files used for research purposes.

### Fake / tampered certificates

Fake samples are derived from genuine certificates or recreated layouts to represent common forgery types:

| Tamper type | Folder | Description |
|-------------|--------|-------------|
| Edited name | `dataset/fake/edited_name/` | Recipient name changed |
| Edited logo | `dataset/fake/edited_logo/` | Issuer logo replaced or altered |
| Edited date | `dataset/fake/edited_date/` | Issue or completion date modified |
| Removed QR | `dataset/fake/removed_qr/` | Verification QR code removed or obscured |
| Fake signature | `dataset/fake/fake_signature/` | Signature added, replaced, or forged |
| Other | `dataset/fake/others/` | Other tampering not covered above |

Each fake sample should record the original platform in `metadata.csv` when the tampered file is based on a known issuer template.

---

## Folder Structure

```
certificate-ai/
│
├── dataset/
│   ├── genuine/          # Real certificates by platform
│   ├── fake/             # Tampered certificates by forgery type
│   ├── metadata.csv      # Index of all samples
│   └── README.md         # Dataset-specific notes
│
├── analysis/             # Dataset and model analysis scripts
│   └── dataset_analysis.py
├── reports/              # Generated analysis reports
├── extraction/           # OCR and field extraction logic
├── detection/            # Authenticity / tamper detection models
├── models/               # Saved weights and configs
├── notebooks/            # Exploration and experiments
├── outputs/              # Predictions, metrics, exports
├── scripts/              # Utilities (e.g. batch rename)
│
├── requirements.txt
└── README.md
```

### Dataset layout

```
dataset/
├── genuine/
│   ├── coursera/
│   ├── udemy/
│   ├── google/
│   ├── ibm/
│   ├── microsoft/
│   ├── aws/
│   ├── cisco/
│   ├── linkedin/
│   ├── nptel/
│   └── others/
│
└── fake/
    ├── edited_name/
    ├── edited_logo/
    ├── edited_date/
    ├── removed_qr/
    ├── fake_signature/
    └── others/
```

---

## Naming Rules

All certificate files must follow a consistent naming pattern:

```
{folder_name}_{####}.{ext}
```

| Part | Rule | Example |
|------|------|---------|
| `folder_name` | Matches the parent subfolder name | `coursera`, `edited_logo` |
| `####` | Zero-padded 4-digit index starting at `0001` | `0001`, `0042` |
| `ext` | Lowercase file extension | `.pdf`, `.jpg`, `.png` |

### Valid examples

```
coursera_0001.pdf
coursera_0002.pdf
google_0001.png
ibm_0001.pdf
edited_name_0001.pdf
edited_logo_0001.png
```

### Avoid

Do not use ambiguous download names:

- `certificate (1).pdf`
- `final_final.pdf`
- `image123.jpg`
- `IMG_20240101.jpg`

### Renaming workflow

1. Place raw files in the correct subfolder.
2. Run the rename script:

```bash
python scripts/rename_dataset_files.py
```

Preview changes first:

```bash
python scripts/rename_dataset_files.py --dry-run
```

3. Add or update the corresponding row in `dataset/metadata.csv`.

### Metadata format

`dataset/metadata.csv` tracks every sample:

| Column | Description | Example |
|--------|-------------|---------|
| `filename` | File name only | `coursera_0001.pdf` |
| `platform` | Issuer or source platform | `Coursera` |
| `type` | `genuine` or `fake` | `genuine` |
| `format` | `pdf` or `image` | `pdf` |

Example:

```csv
filename,platform,type,format
coursera_0001.pdf,Coursera,genuine,pdf
google_0001.png,Google,genuine,image
edited_logo_0001.png,Google,fake,image
```

Additional columns (labels, extracted name, date, credential ID, etc.) can be added later without changing the base schema.

---

## Number of Samples

> Update this section as the dataset grows.

| Category | Subfolder | Count |
|----------|-----------|------:|
| **Genuine** | | **0** |
| | coursera | 0 |
| | udemy | 0 |
| | google | 0 |
| | ibm | 0 |
| | microsoft | 0 |
| | aws | 0 |
| | cisco | 0 |
| | linkedin | 0 |
| | nptel | 0 |
| | others | 0 |
| **Fake** | | **0** |
| | edited_name | 0 |
| | edited_logo | 0 |
| | edited_date | 0 |
| | removed_qr | 0 |
| | fake_signature | 0 |
| | others | 0 |
| **Total files** | | **0** |

- **Metadata rows:** 3 (template examples in `metadata.csv`; replace with real entries as files are added)
- **Formats:** PDF and image (PNG, JPG) supported

To refresh counts after adding files, list files per folder or extend a script to summarize `metadata.csv`.

---

## Known Limitations

1. **Early-stage dataset** — Sample counts are currently low. Model performance will improve as more genuine and fake certificates are collected.

2. **Platform imbalance** — Some issuers (e.g. Coursera, Google) may dominate early collections, while others (Cisco, NPTEL) may have few or no samples. Training should account for class imbalance.

3. **Manual fake generation** — Tampered samples are created by hand or with simple edits. They may not reflect sophisticated forgeries (deepfakes, high-quality template replication, or metadata-only PDF manipulation).

4. **Format inconsistency** — Certificates arrive as PDFs or raster images with varying resolution, compression, and scan quality, which affects OCR and visual detection.

5. **Layout diversity** — Each platform uses different templates, fonts, and layouts. Models trained on one issuer may not generalize well to unseen platforms without sufficient data.

6. **Metadata not yet enriched** — `metadata.csv` currently stores basic fields only. Ground-truth labels and extracted fields are not yet populated for all samples.

7. **Language and region** — Initial focus is on English-language credentials from major global MOOC providers. Regional or non-English certificates are underrepresented.

8. **Privacy and licensing** — Some genuine certificates may contain personal information. Only use data you are permitted to store for research, and redact sensitive details when sharing outputs or reports.

9. **No live verification** — This dataset supports offline model development. Online verification (issuer API checks, blockchain credentials) is out of scope for the dataset itself.

---

## Setup

```bash
pip install -r requirements.txt
```

## Related docs

- [dataset/README.md](dataset/README.md) — Naming convention and metadata details
- [scripts/rename_dataset_files.py](scripts/rename_dataset_files.py) — Batch rename utility
