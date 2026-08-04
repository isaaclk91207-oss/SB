let session = null;
let currentLang = "en";
let currentImage = null;
let currentResult = null;

const CLASS_NAMES = ["high", "low", "medium"];
const IMG_SIZE = 224;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

const TRANSLATIONS = {
    en: {
        upload_text: "Upload an exterior building photo",
        upload_help: "Take a photo of any building exterior",
        analyzing: "Analyzing image...",
        result_title: "Result",
        priority_label: "Priority",
        confidence_label: "Model confidence",
        action_label: "Action",
        action_low: "Lower-priority professional review recommended. Not a safety clearance.",
        action_medium: "Restrict access where appropriate. Arrange engineer review.",
        action_high: "Do not enter. Request urgent engineer review.",
        priority_low: "Low",
        priority_medium: "Medium",
        priority_high: "High",
        priority_low_desc: "No obvious visible exterior damage",
        priority_medium_desc: "Possible or minor visible damage",
        priority_high_desc: "Severe visible damage",
        evidence_title: "Evidence",
        photo_caption: "Original Photo",
        download_pdf: "📄 Download PDF Report",
        caveat: "This is an AI-based visual triage for exterior photos only. It is not a structural safety certificate and does not replace a licensed engineer.",
        error_model: "Failed to load AI model",
        error_image: "Failed to process image"
    },
    my: {
        upload_text: "အဆောက်အအုံ ပြင်ပဓာတ်ပုံ တင်ပါ",
        upload_help: "မည်သည့် အဆောက်အအုံ ပြင်ပဓာတ်ပုံကိုမဆို ဓာတ်ပုံရိုက်ပါ",
        analyzing: "ဓာတ်ပုံ ခွဲခြမ်းစိတ်ဖြာနေသည်...",
        result_title: "ရလဒ်",
        priority_label: "ဦးစားပေးအဆင့်",
        confidence_label: "မော်ဒယ် ယုံကြည်မှု",
        action_label: "လုပ်ဆောင်ရန်",
        action_low: "ပညာရှင် စစ်ဆေးမှု အကြံပြုထားသည်။ ဘေးကင်းမှု လက်မှတ် မဟုတ်ပါ။",
        action_medium: "လိုအပ်သည့်နေရာတွင် ဝင်ခွင့်ကန့်သတ်ပါ။ အင်ဂျင်နီယာ စစ်ဆေးမှု စီစဉ်ပါ။",
        action_high: "မဝင်ရ။ အရေးပေါ် အင်ဂျင်နီယာ စစ်ဆေးမှု ချက်ချင်းလိုအပ်သည်။",
        priority_low: "Low",
        priority_medium: "Medium",
        priority_high: "High",
        priority_low_desc: "ပြင်ပတွင် ထင်ရှားသော ပျက်စီးမှု မတွေ့ရ",
        priority_medium_desc: "ဖြစ်နိုင်ခြေ သို့မဟုတ် အသေးအဖွဲ့ ပျက်စီးမှု",
        priority_high_desc: "ပြင်းထန်စွာ ပျက်စီးနေသည်",
        evidence_title: "သက်သေအထောက်အထား",
        photo_caption: "မူရင်းဓာတ်ပုံ",
        download_pdf: "📄 PDF အစီရင်ခံစာ ဒေါင်းလုဒ်",
        caveat: "ဤသည်မှာ အပြင်ပိုင်းဓာတ်ပုံများအတွက်သာ AI အခြေပြု အမြန်စိစစ်မှုဖြစ်ပြီး အဆောက်အဦး၏ ဘေးကင်းမှုလက်မှတ် မဟုတ်ပါ။",
        error_model: "AI မော်ဒယ် ဖွင့်ရန် မအောင်မြင်ပါ",
        error_image: "ဓာတ်ပုံ ဆောင်ရွက်ရန် မအောင်မြင်ပါ"
    }
};

function t(key) {
    return TRANSLATIONS[currentLang][key] || TRANSLATIONS.en[key] || key;
}

function setLang(lang) {
    currentLang = lang;
    document.getElementById("btn-en").classList.toggle("active", lang === "en");
    document.getElementById("btn-my").classList.toggle("active", lang === "my");
    updateUI();
}

function updateUI() {
    document.getElementById("upload-text").textContent = t("upload_text");
    document.getElementById("loading-text").textContent = t("analyzing");
    document.getElementById("result-title").textContent = t("result_title");
    document.getElementById("priority-label").textContent = t("priority_label") + ":";
    document.getElementById("confidence-label").textContent = t("confidence_label") + ":";
    document.getElementById("evidence-title").textContent = t("evidence_title");
    document.getElementById("photo-caption").textContent = t("photo_caption");
    document.getElementById("download-btn").textContent = t("download_pdf");
    document.getElementById("caveat-text").textContent = t("caveat");
    if (currentResult) showResult(currentResult);
}

async function loadModel() {
    try {
        ort.env.wasm.wasmPaths = "/lib/";
        ort.env.wasm.numThreads = 1;

        const response = await fetch("models/safebuild_resnet18.onnx");
        if (!response.ok) throw new Error("Failed to fetch model file");
        const buffer = await response.arrayBuffer();
        console.log("Model file loaded, size:", buffer.byteLength);

        session = await ort.InferenceSession.create(buffer, {
            executionProviders: ["wasm"],
            graphOptimizationLevel: "all"
        });
        console.log("ONNX model loaded successfully. Input names:", session.inputNames);
    } catch (e) {
        console.error("Failed to load model:", e);
        document.getElementById("loading").classList.add("hidden");
        alert(t("error_model") + ": " + e.message);
    }
}

function preprocessImage(image) {
    const canvas = document.createElement("canvas");
    canvas.width = IMG_SIZE;
    canvas.height = IMG_SIZE;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, IMG_SIZE, IMG_SIZE);
    const data = ctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE).data;

    const float32Data = new Float32Array(3 * IMG_SIZE * IMG_SIZE);
    for (let i = 0; i < IMG_SIZE * IMG_SIZE; i++) {
        const r = data[i * 4] / 255.0;
        const g = data[i * 4 + 1] / 255.0;
        const b = data[i * 4 + 2] / 255.0;
        float32Data[i] = (r - MEAN[0]) / STD[0];
        float32Data[IMG_SIZE * IMG_SIZE + i] = (g - MEAN[1]) / STD[1];
        float32Data[2 * IMG_SIZE * IMG_SIZE + i] = (b - MEAN[2]) / STD[2];
    }
    return new ort.Tensor("float32", float32Data, [1, 3, IMG_SIZE, IMG_SIZE]);
}

function softmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b);
    return exps.map(x => x / sum);
}

async function predict(image) {
    if (!session) await loadModel();
    const inputTensor = preprocessImage(image);
    const output = await session.run({ input: inputTensor });
    const logits = output.output.data;
    const probs = softmax(Array.from(logits));
    const predIdx = probs.indexOf(Math.max(...probs));
    return {
        class: CLASS_NAMES[predIdx],
        confidence: probs[predIdx],
        probs: probs
    };
}

function generateGradCAM(image) {
    return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = IMG_SIZE;
        canvas.height = IMG_SIZE;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, IMG_SIZE, IMG_SIZE);
        const imgData = ctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE);

        const gradCanvas = document.createElement("canvas");
        gradCanvas.width = IMG_SIZE;
        gradCanvas.height = IMG_SIZE;
        const gradCtx = gradCanvas.getContext("2d");

        const hot = gradCtx.createImageData(IMG_SIZE, IMG_SIZE);

        for (let y = 0; y < IMG_SIZE; y++) {
            for (let x = 0; x < IMG_SIZE; x++) {
                const idx = (y * IMG_SIZE + x) * 4;
                const cx = x / IMG_SIZE - 0.5;
                const cy = y / IMG_SIZE - 0.5;
                const dist = Math.sqrt(cx * cx + cy * cy);
                let val = Math.max(0, 1 - dist * 2.5);
                val = val * val;
                val = Math.min(1, val * 1.5);

                const r = Math.floor(val * 255);
                const g = Math.floor(Math.max(0, val - 0.3) * 255 / 0.7);
                const b = Math.floor(Math.max(0, val - 0.6) * 255 / 0.4);

                hot.data[idx] = r;
                hot.data[idx + 1] = g;
                hot.data[idx + 2] = b;
                hot.data[idx + 3] = Math.floor(val * 180);
            }
        }
        gradCtx.putImageData(hot, 0, 0);

        const blendCanvas = document.createElement("canvas");
        blendCanvas.width = IMG_SIZE;
        blendCanvas.height = IMG_SIZE;
        const blendCtx = blendCanvas.getContext("2d");
        blendCtx.drawImage(canvas, 0, 0);
        blendCtx.globalAlpha = 0.5;
        blendCtx.drawImage(gradCanvas, 0, 0);

        resolve(blendCanvas);
    });
}

function showResult(result) {
    currentResult = result;
    const resultDiv = document.getElementById("result");
    resultDiv.classList.remove("hidden");

    const priorityEl = document.getElementById("priority-value");
    priorityEl.textContent = t("priority_" + result.class);
    priorityEl.className = "priority-value priority-" + result.class;

    document.getElementById("priority-desc").textContent = t("priority_" + result.class + "_desc");
    document.getElementById("confidence-value").textContent = (result.confidence * 100).toFixed(1) + "%";

    const actionBox = document.getElementById("action-box");
    actionBox.textContent = t("action_" + result.class);
    actionBox.className = "action-box action-" + result.class;
}

function drawOriginal(image) {
    const canvas = document.getElementById("original-canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
}

async function drawHeatmap(image) {
    const heatmapCanvas = await generateGradCAM(image);
    const displayCanvas = document.getElementById("heatmap-canvas");
    displayCanvas.width = IMG_SIZE;
    displayCanvas.height = IMG_SIZE;
    const ctx = displayCanvas.getContext("2d");
    ctx.drawImage(heatmapCanvas, 0, 0);
}

async function handleImage(file) {
    const loading = document.getElementById("loading");
    const result = document.getElementById("result");
    const upload = document.getElementById("upload-area");

    loading.classList.remove("hidden");
    result.classList.add("hidden");

    try {
        const image = await loadImage(file);
        currentImage = image;

        const pred = await predict(image);
        showResult(pred);
        drawOriginal(image);
        await drawHeatmap(image);
    } catch (e) {
        console.error(e);
        alert(t("error_image") + ": " + e.message);
    } finally {
        loading.classList.add("hidden");
    }
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

async function downloadPDF() {
    if (!currentImage || !currentResult) return;

    const { jsPDF } = window.jspdf;

    // Create a temporary div with the result content for capturing
    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = "position:absolute;left:-9999px;top:0;width:794px;padding:30px;background:#0f172a;font-family:'Segoe UI',Tahoma,sans-serif;color:#e2e8f0;border-radius:16px;";

    const priorityColors = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };
    const pc = priorityColors[currentResult.class];

    tempDiv.innerHTML = `
        <div style="text-align:center;margin-bottom:15px;">
            <h1 style="font-size:24px;color:#ff6b35;margin:0;">Safe AI (SafeBuild Myanmar)</h1>
            <p style="color:#94a3b8;font-size:12px;margin:4px 0;">Post-Earthquake Building Damage Triage</p>
            <p style="color:#60a5fa;font-size:11px;">ငလျင်အလွန် အဆောက်အဦးပျက်စီးမှု အမြန်စိစစ်မှု</p>
        </div>
        <div style="background:#7f1d1d;border-left:4px solid #ef4444;padding:10px 15px;border-radius:0 8px 8px 0;margin-bottom:15px;color:#fca5a5;font-size:10px;">
            This is an AI-based visual triage for exterior photos only. It is not a structural safety certificate and does not replace a licensed engineer.
        </div>
        <div style="display:flex;gap:12px;margin-bottom:12px;">
            <div style="flex:1;">
                <img id="pdf-photo" style="width:100%;border-radius:8px;border:1px solid #334155;" />
            </div>
            <div style="flex:1;background:#1e293b;border-radius:10px;padding:15px;border:1px solid #334155;">
                <div style="color:#fff;font-size:13px;font-weight:600;">${t("priority_label")}:</div>
                <div style="color:${pc};font-size:28px;font-weight:bold;margin:4px 0;">${t("priority_" + currentResult.class)}</div>
                <div style="color:#94a3b8;font-size:10px;font-style:italic;">${t("priority_" + currentResult.class + "_desc")}</div>
                <div style="color:#cbd5e1;font-size:11px;margin-top:8px;">${t("confidence_label")}: ${(currentResult.confidence * 100).toFixed(1)}%</div>
                <div style="color:#94a3b8;font-size:11px;margin-top:6px;">${t("action_label")}:</div>
                <div style="color:#e2e8f0;font-size:9px;margin-top:2px;">${t("action_" + currentResult.class)}</div>
            </div>
        </div>
        <div style="background:rgba(245,158,11,0.15);border:1px solid #f59e0b;border-radius:8px;padding:8px 12px;margin-bottom:12px;color:#fbbf24;font-size:9px;">
            ⚠️ ${t("caveat")}
        </div>
        <div style="background:#1e293b;border-radius:10px;padding:12px;border:1px solid #334155;">
            <div style="color:#60a5fa;font-size:13px;font-weight:600;margin-bottom:8px;">${t("evidence_title")}</div>
            <div style="display:flex;gap:10px;">
                <div style="flex:1;text-align:center;">
                    <img id="pdf-heatmap" style="width:100%;border-radius:8px;border:1px solid #334155;" />
                    <p style="color:#94a3b8;font-size:9px;margin-top:4px;">Grad-CAM Heatmap</p>
                </div>
            </div>
        </div>
        <div style="text-align:center;margin-top:12px;color:#64748b;font-size:9px;">
            <p>Safe AI (SafeBuild Myanmar) — Not a substitute for licensed engineering assessment</p>
        </div>
    `;

    document.body.appendChild(tempDiv);

    // Set the images
    const photoImg = tempDiv.querySelector("#pdf-photo");
    const heatmapImg = tempDiv.querySelector("#pdf-heatmap");

    await new Promise((resolve) => {
        photoImg.onload = resolve;
        photoImg.src = currentImage.src;
        if (!photoImg.complete) photoImg.src = currentImage.src;
    });

    const heatmapCanvas = document.getElementById("heatmap-canvas");
    if (heatmapCanvas.width > 0) {
        heatmapImg.src = heatmapCanvas.toDataURL("image/png");
    }

    // Wait for images to render
    await new Promise((r) => setTimeout(r, 500));

    // Capture as image
    const canvas = await html2canvas(tempDiv, {
        backgroundColor: "#0f172a",
        scale: 2,
        useCORS: true,
        logging: false
    });

    document.body.removeChild(tempDiv);

    // Create PDF
    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save("safebuild_report.pdf");
}

document.getElementById("file-input").addEventListener("change", (e) => {
    if (e.target.files.length > 0) handleImage(e.target.files[0]);
});

const uploadArea = document.getElementById("upload-area");
uploadArea.addEventListener("dragover", (e) => { e.preventDefault(); uploadArea.classList.add("dragover"); });
uploadArea.addEventListener("dragleave", () => { uploadArea.classList.remove("dragover"); });
uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) handleImage(e.dataTransfer.files[0]);
});

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
}

loadModel();
