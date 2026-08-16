# SafeBuild Myanmar — Competition Day Guide

## Pre-Competition Checklist (Night Before)

### Laptop Setup
- [ ] Python 3.11 installed
- [ ] All dependencies installed: `pip install -r requirements.txt`
- [ ] Model file exists: `models/safebuild_resnet18.pth`
- [ ] Myanmar font exists: `assets/NotoSansMyanmar-Regular.ttf`
- [ ] Test run works: `streamlit run app.py` opens at http://localhost:8501
- [ ] Git repo pushed to GitHub: `https://github.com/isaaclk91207-oss/hackathon-demo-`
- [ ] Netlify site deployed: `https://safeai-myanmar.netlify.app/`
- [ ] Laptop charged to 100%
- [ ] Backup charger/power bank ready

### Test Images Prepared
- [ ] 3 low-damage test images (no visible damage)
- [ ] 3 medium-damage test images (minor cracks/damage)
- [ ] 3 high-damage test images (severe/collapsed)
- [ ] All images are exterior building photos
- [ ] Images are saved in a known folder on desktop

### Backup Files
- [ ] Demo video recorded (in case live fails)
- [ ] PDF report sample downloaded
- [ ] Screenshots of all 3 result types saved

---

## Competition Day Timeline

### 1 Hour Before Demo

**Step 1: Start the app (2 minutes)**

```powershell
cd D:\demo-hackathon\safebuild-myanmar
.\.venv\Scripts\Activate.ps1
streamlit run app.py
```

Verify it opens at http://localhost:8501

**Step 2: Verify everything works (5 minutes)**

1. Open browser to http://localhost:8501
2. Upload one test image from each category (low/medium/high)
3. Confirm result shows: priority label + confidence + heatmap + action guidance
4. Switch language to Myanmar and verify text displays
5. Download a PDF report and verify it opens

**Step 3: Test offline mode (3 minutes)**

1. Turn OFF Wi-Fi
2. Refresh the browser page
3. Upload a test image
4. Confirm prediction works without internet
5. Turn Wi-Fi back ON

**Step 4: Prepare demo station (5 minutes)**

- Laptop plugged in and charging
- Browser open to http://localhost:8501
- Test images folder open on desktop
- PDF sample ready to show
- Phone with Netlify site ready to show

---

## Demo Script (3-5 Minutes)

### Opening (30 seconds)

> "Good [morning/afternoon]. We are SafeBuild Myanmar. After the March 2025 earthquake, 500,000 buildings need inspection but there are only 100 engineers. Our tool helps them prioritize which buildings to inspect first."

### Live Demo (2 minutes)

**Show the Netlify landing page first:**
- Open https://safeai-myanmar.netlify.app/ on phone or second tab
- "This is our project portal on Netlify — the hackathon sponsor platform"

**Switch to the Streamlit app:**
- "Now let me show you the actual AI tool running offline on this laptop"

**Demo Flow:**
1. "First, I select the language — English or Myanmar"
2. "Now I upload a building photo" → upload a HIGH damage image
3. "The AI analyzes it in seconds" → show the result
4. "It says HIGH PRIORITY — do not enter, request urgent engineer review"
5. "Here is the Grad-CAM heatmap showing what the AI focused on"
6. "I can download a PDF report" → download and open it
7. "Now watch — I'm turning off Wi-Fi" → turn off Wi-Fi
8. "I upload another photo" → upload a LOW damage image
9. "It still works completely offline — no internet needed"

### Key Points to Mention (1 minute)

- "This is visual triage ONLY — not a structural safety certificate"
- "We use a local ResNet18 model trained on Myanmar earthquake photos"
- "The AI runs entirely on the laptop — no data leaves the device"
- "Bilingual support for English and Myanmar"
- "Works in disaster zones with damaged networks"

### Closing (30 seconds)

> "SafeBuild Myanmar helps disaster responders inspect buildings faster and safer. With this tool, 10 engineers can prioritize 500,000 buildings in days instead of months. Thank you."

---

## Q&A Preparation

### Technical Questions

**Q: How accurate is the model?**
> "Our model achieves over 93% confidence on test images. However, this is a triage aid — it helps engineers prioritize, not replace their judgment."

**Q: What dataset did you use?**
> "We manually labeled 150 photos from the 2025 Myanmar earthquake, augmented to improve generalization. This is street-level photography, not satellite imagery."

**Q: How does it work offline?**
> "The ResNet18 model is saved locally as a .pth file. Streamlit runs a local web server on the laptop. No data ever leaves the device — no API calls, no cloud services."

**Q: What about false positives?**
> "That's why we frame this as triage, not certification. A 'Low' result means lower priority — it still gets reviewed. A 'High' result triggers immediate engineer dispatch."

**Q: Can this run on a phone?**
> "The current version runs on a laptop. A future version could use TFLite for on-device phone inference, but for this hackathon we focused on the core AI pipeline."

### Product Questions

**Q: Who is the target user?**
> "Disaster-response coordinators and field engineers — not building occupants making their own safety decisions."

**Q: How is this different from existing solutions?**
> "Most tools require satellite imagery or internet connectivity. SafeBuild works with a smartphone photo and runs offline — critical for disaster zones."

**Q: What's the business model?**
> "This is a humanitarian tool. We envision it being deployed by NGOs, government agencies, and disaster-response teams."

### Safety Questions

**Q: What if someone relies on a 'Low' result and enters an unsafe building?**
> "Every result includes the disclaimer: 'Visual triage only — not a structural safety certificate.' We explicitly position this as a prioritization tool, not a safety clearance."

---

## Troubleshooting

### App won't start

```powershell
# Check Python version
python --version

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Run with verbose output
streamlit run app.py --logger.level debug
```

### Model not found error

- Verify `models/safebuild_resnet18.pth` exists
- Check file size (should be ~44MB)
- If missing, retrain: `python train.py`

### Heatmap not generating

- Check if `grad-cam` is installed: `pip show grad-cam`
- If error, reinstall: `pip install grad-cam --force-reinstall`

### PDF not generating with Myanmar text

- Verify `assets/NotoSansMyanmar-Regular.ttf` exists
- Check file size (should be ~200KB)
- If missing, download from Google Fonts

### Offline mode not working

- Ensure model is loaded before turning off Wi-Fi
- Check that no cloud APIs are called in the code
- Restart Streamlit after turning off Wi-Fi

### Browser shows "Page not found"

- Verify Streamlit is running: check terminal for "You can now view your Streamlit app"
- Try http://127.0.0.1:8501 instead of http://localhost:8501
- Check if port 8501 is in use: `netstat -ano | findstr :8501`

---

## File Locations Quick Reference

| File | Path |
|------|------|
| Main app | `app.py` |
| Model | `models/safebuild_resnet18.pth` |
| Myanmar font | `assets/NotoSansMyanmar-Regular.ttf` |
| Requirements | `requirements.txt` |
| Training script | `train.py` |
| Model record | `model_record.md` |
| Predict utility | `utils/predict.py` |
| Heatmap utility | `utils/heatmap.py` |
| Report utility | `utils/report.py` |
| Translations | `utils/translations.py` |
| Netlify site | `streamlit-demo/netlify-site/index.html` |
| HF Spaces copy | `streamlit-demo/` |

---

## Commands Cheat Sheet

```powershell
# Navigate to project
cd D:\demo-hackathon\safebuild-myanmar

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install/reinstall dependencies
pip install -r requirements.txt

# Run the app
streamlit run app.py

# Retrain the model (if needed)
python train.py

# Check model file
dir models\safebuild_resnet18.pth

# Check font file
dir assets\NotoSansMyanmar-Regular.ttf
```

---

## One-Liner for Judges

> "SafeBuild Myanmar is an offline AI visual-triage web tool that helps disaster responders identify which earthquake-damaged buildings need an engineer first — using just a smartphone photo and no internet."
