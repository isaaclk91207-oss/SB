const CACHE_NAME = "safebuild-v6";
const ASSETS = [
    "/",
    "/index.html",
    "/styles.css",
    "/app.js",
    "/manifest.json",
    "/models/safebuild_resnet18.onnx",
    "/NotoSansMyanmar-Regular.ttf",
    "/lib/ort.min.js",
    "/lib/jspdf.umd.min.js",
    "/lib/html2canvas.min.js",
    "/lib/ort-wasm-simd-threaded.jsep.mjs",
    "/lib/ort-wasm-simd-threaded.jsep.wasm"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            for (const url of ASSETS) {
                try {
                    await cache.add(url);
                    console.log("Cached:", url);
                } catch (e) {
                    console.warn("Failed to cache:", url, e);
                }
            }
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});
