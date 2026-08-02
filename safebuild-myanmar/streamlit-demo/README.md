---
title: Safe AI (SafeBuild Myanmar)
emoji: 🏗️
colorFrom: orange
colorTo: red
sdk: streamlit
sdk_version: 1.60.0
app_file: app.py
pinned: true
license: apache-2.0
---

# Safe AI (SafeBuild Myanmar)

Post-Earthquake Building Damage Triage

## What it does

Upload an exterior building photo → Get instant damage priority classification (Low/Medium/High) with Grad-CAM visual evidence.

## Features

- **Photo Upload**: Take a photo of any building exterior
- **AI Analysis**: ResNet18 classifies damage in seconds
- **Visual Evidence**: Grad-CAM heatmap shows what AI sees
- **PDF Report**: Download bilingual assessment report
- **Bilingual**: English and Myanmar language support
- **Offline**: No internet required during inference (local mode)

## Boundary Notice

This is an AI-based visual triage for exterior photos only. It is not a structural safety certificate and does not replace a licensed engineer.

## Technology

- Streamlit (Web UI)
- PyTorch + ResNet18 (Inference)
- Grad-CAM (Visual Evidence)
- ReportLab (PDF Generation)
- Pillow (Image Processing)

## Classes

| Class | Meaning |
|-------|---------|
| Low | No obvious visible exterior damage |
| Medium | Possible or minor visible damage |
| High | Severe visible damage |

## Known Limitations

- Small training set (150 images) — model may overfit
- Only trained on Myanmar earthquake photos
- Low light, indoor, or obstructed views may produce unreliable results
- This is a triage aid, NOT a structural safety certification
