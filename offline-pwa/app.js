// The main logic of the Safe AI web app is defined below. 
// Inline comments are provided to help understand each part of the code.

let session = null; // Session for the ONNX model
let currentLang = "en"; // Stores currently selected language ("en" or "my")
let currentImage = null; // Currently loaded image
let currentResult = null; // Stores the latest prediction result

const CLASS_NAMES = ["high", "low", "medium"]; // List of class names for predictions
const IMG_SIZE = 224; // Expected input size for the model
const MEAN = [0.485, 0.456, 0.406]; // ImageNet mean normalization values
const STD = [0.229, 0.224, 0.225]; // ImageNet std normalization values

// Translation keys for English and Myanmar
const TRANSLATIONS = {
    en: { /* ...translations as before... */ },
    my: { /* ...translations as before... */ }
};

// Helper for translation: returns the translated string for a given key based on the current language
function t(key) {
    return TRANSLATIONS[currentLang][key] || TRANSLATIONS.en[key] || key;
}

// Sets the language and updates UI accordingly
function setLang(lang) {
    currentLang = lang;
    document.getElementById("btn-en").classList.toggle("active", lang === "en");
    document.getElementById("btn-my").classList.toggle("active", lang === "my");
    updateUI();
}

// Updates all translatable UI elements and results with the current language
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

// Loads the ONNX model (asynchronously), called before first prediction
async function loadModel() {
    try {
        // Configure ONNX WebAssembly backend (see ONNXRuntime docs)
        ort.env.wasm.wasmPaths = "/lib/";
        ort.env.wasm.numThreads = 1;

        // Download the ONNX file
        const response = await fetch("models/safebuild_resnet18.onnx");
        if (!response.ok) throw new Error("Failed to fetch model file");
        const buffer = await response.arrayBuffer();
        console.log("Model file loaded, size:", buffer.byteLength);

        // Create an inference session
        session = await ort.InferenceSession.create(buffer, {
            executionProviders: ["wasm"],
            graphOptimizationLevel: "all"
        });
        console.log("ONNX model loaded successfully. Input names:", session.inputNames);
    } catch (e) {
        // Show error and hide the loading spinner
        console.error("Failed to load model:", e);
        document.getElementById("loading").classList.add("hidden");
        alert(t("error_model") + ": " + e.message);
    }
}

// Preprocess an image into an ONNX tensor as expected by the model
function preprocessImage(image) {
    const canvas = document.createElement("canvas");
    canvas.width = IMG_SIZE;
    canvas.height = IMG_SIZE;
    const ctx = canvas.getContext("2d");
    // Draw image resized to expected input size
    ctx.drawImage(image, 0, 0, IMG_SIZE, IMG_SIZE);
    // Get raw RGBA pixel data
    const data = ctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE).data;
    // Prepare a Float32Array for tensor data
    const float32Data = new Float32Array(3 * IMG_SIZE * IMG_SIZE);
    for (let i = 0; i < IMG_SIZE * IMG_SIZE; i++) {
        // Normalize per channel and format as [3,224,224]
        const r = data[i * 4] / 255.0;
        const g = data[i * 4 + 1] / 255.0;
        const b = data[i * 4 + 2] / 255.0;
        float32Data[i] = (r - MEAN[0]) / STD[0];
        float32Data[IMG_SIZE * IMG_SIZE + i] = (g - MEAN[1]) / STD[1];
        float32Data[2 * IMG_SIZE * IMG_SIZE + i] = (b - MEAN[2]) / STD[2];
    }
    // Return as ONNX tensor
    return new ort.Tensor("float32", float32Data, [1, 3, IMG_SIZE, IMG_SIZE]);
}

// Standard softmax function for model output probabilities
function softmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b);
    return exps.map(x => x / sum);
}

// Predicts the priority class for a given image using the model
async function predict(image) {
    if (!session) await loadModel(); // Ensure the model is loaded
    const inputTensor = preprocessImage(image); // Get input tensor
    const output = await session.run({ input: inputTensor }); // ONNX inference
    const logits = output.output.data;
    const probs = softmax(Array.from(logits)); // Convert logits to probabilities
    const predIdx = probs.indexOf(Math.max(...probs));
    return {
        class: CLASS_NAMES[predIdx],
        confidence: probs[predIdx],
        probs: probs
    };
}

// Generates a simple heatmap "GradCAM-style" overlay (dummy version---see description for explanation)
function generateGradCAM(image) {
    // This version fakes a GradCAM by just applying a radial heatmap overlay for illustration.
    return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = IMG_SIZE;
        canvas.height = IMG_SIZE;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, IMG_SIZE, IMG_SIZE);

        const gradCanvas = document.createElement("canvas");
        gradCanvas.width = IMG_SIZE;
        gradCanvas.height = IMG_SIZE;
        const gradCtx = gradCanvas.getContext("2d");
        const hot = gradCtx.createImageData(IMG_SIZE, IMG_SIZE);

        // For each pixel, set a color based on distance from center (hot in the middle)
        for (let y = 0; y < IMG_SIZE; y++) {
            for (let x = 0; x < IMG_SIZE; x++) {
                const idx = (y * IMG_SIZE + x) * 4;
                const cx = x / IMG_SIZE - 0.5;
                const cy = y / IMG_SIZE - 0.5;
                const dist = Math.sqrt(cx * cx + cy * cy);
                let val = Math.max(0, 1 - dist * 2.5);
                val = val * val;
                val = Math.min(1, val * 1.5);

                // Use "hot" color (red to yellow) for overlay
                const r = Math.floor(val * 255);
                const g = Math.floor(Math.max(0, val - 0.3) * 255 / 0.7);
                const b = Math.floor(Math.max(0, val - 0.6) * 255 / 0.4);

                hot.data[idx] = r;
                hot.data[idx + 1] = g;
                hot.data[idx + 2] = b;
                hot.data[idx + 3] = Math.floor(val * 180); // alpha for blending
            }
        }
        gradCtx.putImageData(hot, 0, 0);

        // Blend the heatmap on top of the source image
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

// Shows the prediction result in the UI
function showResult(result) {
    currentResult = result;
    const resultDiv = document.getElementById("result");
    resultDiv.classList.remove("hidden");

    // Show priority label and color
    const priorityEl = document.getElementById("priority-value");
    priorityEl.textContent = t("priority_" + result.class);
    priorityEl.className = "priority-value priority-" + result.class;

    // Show priority description and confidence value
    document.getElementById("priority-desc").textContent = t("priority_" + result.class + "_desc");
    document.getElementById("confidence-value").textContent = (result.confidence * 100).toFixed(1) + "%";

    // Show action recommendation
    const actionBox = document.getElementById("action-box");
    actionBox.textContent = t("action_" + result.class);
    actionBox.className = "action-box action-" + result.class;
}

// Draws the original image into the evidence section
function drawOriginal(image) {
    const canvas = document.getElementById("original-canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
}

// Draws the GradCAM-style heatmap overlay in the evidence section
async function drawHeatmap(image) {
    const heatmapCanvas = await generateGradCAM(image);
    const displayCanvas = document.getElementById("heatmap-canvas");
    displayCanvas.width = IMG_SIZE;
    displayCanvas.height = IMG_SIZE;
    const ctx = displayCanvas.getContext("2d");
    ctx.drawImage(heatmapCanvas, 0, 0);
}

// Handles a file input or drag+drop: loads image, runs prediction, updates UI
async function handleImage(file) {
    const loading = document.getElementById("loading");
    const result = document.getElementById("result");
    const upload = document.getElementById("upload-area");

    loading.classList.remove("hidden"); // Show spinner
    result.classList.add("hidden"); // Hide last result

    try {
        // Load image file and store as currentImage
        const image = await loadImage(file);
        currentImage = image;
        // Predict and show result
        const pred = await predict(image);
        showResult(pred);
        drawOriginal(image);
        await drawHeatmap(image);
    } catch (e) {
        console.error(e);
        alert(t("error_image") + ": " + e.message);
    } finally {
        loading.classList.add("hidden"); // Hide spinner
    }
}

// Loads an image from a File and returns an Image object (async)
function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file); // Convert File to object URL
    });
}

// Generates a PDF report asynchronously and triggers download
async function downloadPDF() {
    if (!currentImage || !currentResult) return;

    const { jsPDF } = window.jspdf;

    // Create a temporary div used as a "template" for html2canvas screenshot
    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = "position:absolute;left:-9999px;top:0;width:794px;padding:30px;background:#0f172a;font-family:'Segoe UI',Tahoma,sans-serif;color:#e2e8f0;border-radius:16px;";

    const priorityColors = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };
    const pc = priorityColors[currentResult.class];

    // Insert the report HTML—uses translation and result values
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

    // Copy the original photo and heatmap into the PDF preview
    const photoImg = tempDiv.querySelector("#pdf-photo");
    const heatmapImg = tempDiv.querySelector("#pdf-heatmap");

    await new Promise((resolve) => {
        photoImg.onload = resolve;
        photoImg.src = currentImage.src;
        if (!photoImg.complete) photoImg.src = currentImage.src;
    });

    // Copy the GradCAM canvas to an image for PDF
    const heatmapCanvas = document.getElementById("heatmap-canvas");
    if (heatmapCanvas.width > 0) {
        heatmapImg.src = heatmapCanvas.toDataURL("image/png");
    }

    // Wait for images to render
    await new Promise((r) => setTimeout(r, 500));

    // Take a screenshot of the tempDiv for PDF generation
    const canvas = await html2canvas(tempDiv, {
        backgroundColor: "#0f172a",
        scale: 2,
        useCORS: true,
        logging: false
    });

    document.body.removeChild(tempDiv);

    // Save the captured image to PDF
    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 210; // mm width of A4
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save("safebuild_report.pdf");
}

// Setup drag+drop and file select handlers
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

// Register service worker for offline support
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
}

// Load the ONNX model at startup
loadModel();
