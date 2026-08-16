# SafeBuild Myanmar — Safe AI

**AI-powered post-earthquake building damage triage tool**

> Offline visual triage for earthquake-damaged buildings. Not a structural safety certificate.

---

## Author

**Ei Thazin Htay**  
Undergraduate · Completed [ITPEC](https://www.ipa.go.jp/english/riss/itpec/) (Information Technology Passport Examination Council) program

---

## Problem

The March 28, 2025 Myanmar earthquake (7.7 magnitude) damaged 500,000+ buildings across Mandalay, Sagaing, and Yangon. Manual inspection takes 30–60 minutes per building — far too slow when hundreds of thousands need assessment.

**SafeBuild Myanmar** helps disaster responders prioritize which buildings need an engineer first, using a single exterior photo.

---

## Features

- **Photo-based triage** — Upload one exterior building photo for a damage priority estimate
- **Three priority levels** — Low, Medium, and High
- **Grad-CAM heatmap** — Visual evidence showing where the model focuses
- **Bilingual UI** — English and Myanmar (Burmese)
- **PDF reports** — Downloadable bilingual result cards
- **Offline-first** — Runs locally with no internet required during inference

---

## How It Works

```
Upload exterior building photo
        ↓
Local ResNet18 model (no internet required)
        ↓
Damage priority: Low / Medium / High
        ↓
Grad-CAM heatmap shows AI attention areas
        ↓
Bilingual result card (English / Myanmar)
        ↓
Optional PDF report download
```

---

## Project Structure

```
demo-hackathon/
├── app.py                    # Main Streamlit app
├── train.py                  # Model training script
├── model_record.md           # Model versioning and training details
├── requirements.txt          # Python dependencies
├── server.js                 # Local static server for the offline PWA
│
├── models/
│   ├── safebuild_resnet18.pth    # PyTorch checkpoint
│   └── safebuild_resnet18.onnx   # ONNX model (browser inference)
│
├── utils/
│   ├── predict.py            # Model loading and inference
│   ├── heatmap.py            # Grad-CAM heatmap generation
│   ├── report.py             # PDF report generation
│   └── translations.py       # English/Myanmar text dictionary
│
├── assets/
│   └── NotoSansMyanmar-Regular.ttf   # Myanmar font for PDF reports
│
├── offline-pwa/              # Browser-based offline PWA (ONNX Runtime Web)
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── sw.js                 # Service worker for offline caching
│   └── models/
│       └── safebuild_resnet18.onnx
│
└── safebuild-myanmar/        # Extended project copy (Streamlit demo, Netlify, HF Spaces)
    ├── app.py
    ├── streamlit-demo/     # Hugging Face Spaces deployment
    └── README.md             # Detailed project documentation
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Web UI | **Streamlit** | Upload, results, PDF download |
| Offline PWA | **ONNX Runtime Web** | Browser-based inference without Python |
| Language | **Python 3.11** | Training and Streamlit app |
| AI Model | **PyTorch + ResNet18** | Local damage classification |
| Transfer Learning | **ImageNet pretrained** | Fine-tuned final FC layer only |
| Heatmap | **pytorch-grad-cam** | Grad-CAM visual evidence overlay |
| PDF Report | **ReportLab** | Bilingual PDF generation |
| Myanmar Font | **Noto Sans Myanmar** | Proper Burmese text in PDFs |

---

## Getting Started

### Streamlit App (Python)

```powershell
pip install -r requirements.txt
streamlit run app.py
```

Open `http://localhost:8501`. Turn off Wi-Fi to confirm offline inference works.

### Offline PWA (Browser)

Serve the PWA locally with Node.js:

```powershell
node server.js
```

Open `http://localhost:8080`. The app caches assets via a service worker and runs inference in the browser using ONNX Runtime Web.

### Retrain the Model

```powershell
# Organize images into data/high/, data/medium/, data/low/
python train.py
```

Training details are recorded in `model_record.md`.

---

## AI Model

| Property | Value |
|----------|-------|
| Architecture | ResNet18 (torchvision) |
| Pretrained | ImageNet-1K |
| Classes | 3: `low`, `medium`, `high` |
| Input size | 224 × 224 RGB |
| Training images | 150 (50 per class) |
| Checkpoint | `models/safebuild_resnet18.pth` |

| Priority | Meaning |
|----------|---------|
| **Low** | No obvious visible exterior damage |
| **Medium** | Possible or minor visible damage |
| **High** | Severe visible damage |

---

## Safety Boundary

This tool provides **visual triage only** — it is NOT a structural safety certificate.

| Priority | Action |
|----------|--------|
| Low | Lower-priority professional review. Not a safety clearance. |
| Medium | Restrict access where appropriate. Arrange engineer review. |
| High | Do not enter. Request urgent engineer review. |

Always displayed to the user:

> *"This is an AI-based visual triage for exterior photos only. It is not a structural safety certificate and does not replace a licensed engineer."*

---

## Known Limitations

- Small training set (150 images) — model may overfit to seen patterns
- Only trained on Myanmar earthquake photos — generalization untested
- Low light, indoor, or obstructed views may produce unreliable results
- Exterior photos only — not designed for internal structural assessment

---

## License

Hackathon MVP — team-owned project.

For extended documentation, deployment guides, and verification checklists, see [`safebuild-myanmar/README.md`](safebuild-myanmar/README.md).
