# Model Record — Safe AI (SafeBuild Myanmar)

## Checkpoint
- **File:** `models/safebuild_resnet18.pth`
- **Architecture:** ResNet18 (torchvision)
- **Version:** 1.0 (hackathon MVP)
- **Date:** 2026-08-02

## Training Data
- **Source:** Manually labeled sample images from 2025 Myanmar earthquake
- **Supplemented with:** Augmented variants (rotate, flip, brightness, contrast, blur, crop)
- **Total:** 150 images (50 per class)
- **License:** Original photos are team-owned; augmentation is synthetic

## Class Mapping
| Internal | UI Label (EN) | UI Label (MY) | Meaning |
|----------|---------------|---------------|---------|
| `low` | Low | နည်း | No obvious visible exterior damage |
| `medium` | Medium | အလယ်အလတ် | Possible or minor visible damage |
| `high` | High | မြင့် | Severe visible damage |

## Training Details
- **Optimizer:** Adam (lr=0.001)
- **Loss:** CrossEntropyLoss
- **Epochs:** 15
- **Split:** 80/20 stratified train/val
- **Frozen layers:** All except final FC layer
- **Device:** CPU

## Known Limitations
- Small training set (150 images) — model may overfit
- Only trained on Myanmar earthquake photos — generalization to other regions untested
- Low light, indoor, or obstructed views may produce unreliable results
- This is a triage aid, NOT a structural safety certification

## Verification
- All 6 sample images classified with >93% confidence
- Grad-CAM heatmaps generated successfully
- Bilingual PDF reports (EN/MY) generate correctly
- Offline operation confirmed (no internet required during inference)
