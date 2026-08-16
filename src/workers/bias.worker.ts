import { pipeline, env } from "@huggingface/transformers";

// Disable local model loading to enforce remote HTTPS downloads that cache in Browser CacheStorage
env.allowLocalModels = false;

let classifier: any = null;
let extractor: any = null;
let currentDevice = "cpu";

// Helper to determine the best execution device
async function getBestDevice() {
  if (typeof navigator !== "undefined" && "gpu" in navigator) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        return "webgpu";
      }
    } catch (e) {
      console.warn("WebGPU adapter request failed in worker, falling back to WASM/CPU:", e);
    }
  }
  return "wasm";
}

// Progress listener tracker
const progressItems: Record<string, number> = {};

function handleProgress(data: any) {
  if (data.status === "progress") {
    progressItems[data.file] = data.progress;
    
    // Calculate aggregate average progress across all active model file downloads
    const fileKeys = Object.keys(progressItems);
    const sum = fileKeys.reduce((acc, key) => acc + progressItems[key], 0);
    const avg = sum / Math.max(fileKeys.length, 1);
    
    self.postMessage({
      type: "progress",
      progress: Math.round(avg),
      file: data.file,
      loaded: data.loaded,
      total: data.total
    });
  }
}

// Initialize Pipelines
async function initPipelines() {
  if (classifier && extractor) {
    self.postMessage({ type: "ready", device: currentDevice });
    return;
  }

  try {
    const device = await getBestDevice();
    currentDevice = device;
    console.log(`[PRISM ML Worker] Initializing pipelines on target device: ${device}`);

    // Load feature extractor (~23MB quantized all-MiniLM-L6-v2 ONNX)
    extractor = await pipeline("feature-extraction", "onnx-community/all-MiniLM-L6-v2", {
      device: device as any,
      progress_callback: handleProgress
    });

    // Load zero-shot classifier (~28MB quantized MobileBERT-uncased-MNLI ONNX)
    classifier = await pipeline("zero-shot-classification", "onnx-community/MobileBERT-uncased-MNLI", {
      device: device as any,
      progress_callback: handleProgress
    });

    self.postMessage({ type: "ready", device: currentDevice });
  } catch (err: any) {
    console.error("[PRISM ML Worker] WebGPU initialization failed, attempting WASM fallback:", err);
    try {
      currentDevice = "wasm";
      
      // Fallback to WebAssembly execution
      extractor = await pipeline("feature-extraction", "onnx-community/all-MiniLM-L6-v2", {
        device: "wasm",
        progress_callback: handleProgress
      });
      
      classifier = await pipeline("zero-shot-classification", "onnx-community/MobileBERT-uncased-MNLI", {
        device: "wasm",
        progress_callback: handleProgress
      });

      self.postMessage({ type: "ready", device: currentDevice });
    } catch (fallbackErr: any) {
      console.error("[PRISM ML Worker] Critical initialization failure:", fallbackErr);
      self.postMessage({ type: "error", message: fallbackErr.message || "Failed to load models" });
    }
  }
}

// Native Cosine Similarity calculation utility
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// In-worker Message router
self.addEventListener("message", async (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type === "init") {
    await initPipelines();
  } else if (type === "classify") {
    if (!classifier) {
      self.postMessage({ type: "error", message: "Classifier not initialized yet" });
      return;
    }
    const { text, labels } = payload;
    try {
      const result = await classifier(text, labels);
      
      // Map zero-shot scores back into clean confidences
      self.postMessage({
        type: "classificationResult",
        payload: {
          text,
          labels: result.labels,
          scores: result.scores,
          primaryTag: result.labels[0],
          confidenceIntervals: result.labels.map((label: string, index: number) => ({
            label,
            confidence: result.scores[index]
          }))
        }
      });
    } catch (err: any) {
      self.postMessage({ type: "error", message: `Zero-shot classification failed: ${err.message}` });
    }
  } else if (type === "embed") {
    if (!extractor) {
      self.postMessage({ type: "error", message: "Embedding extractor not initialized yet" });
      return;
    }
    const { articles } = payload;
    try {
      const embeddings: Record<string, number[]> = {};

      // Sequential evaluation ensures memory spikes are tightly bound in worker scope
      for (const article of articles) {
        const textToEmbed = `${article.title}. ${article.excerpt}`;
        const output = await extractor(textToEmbed, { pooling: "mean", normalize: true });
        embeddings[article.id] = Array.from(output.data);
      }

      // Compute pairwise similarity matrix
      const matrix: Record<string, Record<string, number>> = {};
      const links: any[] = [];
      const threshold = 0.55; // Cosine similarity threshold for rendering links

      for (let i = 0; i < articles.length; i++) {
        const idA = articles[i].id;
        matrix[idA] = {};
        for (let j = 0; j < articles.length; j++) {
          const idB = articles[j].id;
          const sim = cosineSimilarity(embeddings[idA], embeddings[idB]);
          matrix[idA][idB] = sim;

          // Store unique similarity links (avoid self-loops and reciprocal duplicate pairs)
          if (i < j && sim >= threshold) {
            links.push({
              source: idA,
              target: idB,
              value: sim,
              distance: Math.max(120 - (sim * 100), 30) // Tighter distance for highly similar documents
            });
          }
        }
      }

      self.postMessage({
        type: "embeddingResult",
        payload: {
          embeddings,
          matrix,
          graphData: {
            nodes: articles.map((a: any) => ({
              id: a.id,
              title: a.title,
              sourceName: a.sourceName,
              biasRating: a.biasRating,
              category: a.category
            })),
            links
          }
        }
      });
    } catch (err: any) {
      self.postMessage({ type: "error", message: `Embedding feature extraction failed: ${err.message}` });
    }
  }
});
