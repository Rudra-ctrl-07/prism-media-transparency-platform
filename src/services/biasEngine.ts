import BiasWorker from "../workers/bias.worker?worker";

export interface ClassificationResult {
  text: string;
  labels: string[];
  scores: number[];
  primaryTag: string;
  confidenceIntervals: Array<{ label: string; confidence: number }>;
}

export interface EmbeddingResult {
  embeddings: Record<string, number[]>;
  matrix: Record<string, Record<string, number>>;
  graphData: {
    nodes: Array<{
      id: string;
      title: string;
      sourceName: string;
      biasRating: string;
      category: string;
    }>;
    links: Array<{
      source: string;
      target: string;
      value: number;
      distance: number;
    }>;
  };
}

export type WorkerStatus = "uninitialized" | "loading" | "ready" | "error";

export class BiasEngineService {
  private static instance: BiasEngineService | null = null;
  private worker: Worker | null = null;
  private status: WorkerStatus = "uninitialized";
  private device = "cpu";
  private progress = 0;
  
  private statusListeners: Set<(status: WorkerStatus, progress: number, device: string) => void> = new Set();
  
  // Handlers for async model requests
  private pendingClassification: { resolve: (res: ClassificationResult) => void; reject: (err: any) => void } | null = null;
  private pendingEmbedding: { resolve: (res: EmbeddingResult) => void; reject: (err: any) => void } | null = null;

  private constructor() {
    // Singleton pattern
  }

  public static getInstance(): BiasEngineService {
    if (!this.instance) {
      this.instance = new BiasEngineService();
    }
    return this.instance;
  }

  public getStatus(): WorkerStatus {
    return this.status;
  }

  public getDevice(): string {
    return this.device;
  }

  public getProgress(): number {
    return this.progress;
  }

  public subscribe(listener: (status: WorkerStatus, progress: number, device: string) => void): () => void {
    this.statusListeners.add(listener);
    // Call immediately with current state
    listener(this.status, this.progress, this.device);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.statusListeners.forEach((listener) => listener(this.status, this.progress, this.device));
  }

  public init() {
    if (this.worker) return;

    this.status = "loading";
    this.progress = 0;
    this.notifyListeners();

    try {
      // Spawn Web Worker using Vite worker query syntax
      this.worker = new BiasWorker();
      
      this.worker.addEventListener("message", (event: MessageEvent) => {
        const { type, progress, device, payload, message } = event.data;

        switch (type) {
          case "progress":
            this.progress = progress;
            this.notifyListeners();
            break;

          case "ready":
            this.status = "ready";
            this.device = device;
            this.progress = 100;
            this.notifyListeners();
            break;

          case "error":
            this.status = "error";
            this.notifyListeners();
            if (this.pendingClassification) {
              this.pendingClassification.reject(new Error(message));
              this.pendingClassification = null;
            }
            if (this.pendingEmbedding) {
              this.pendingEmbedding.reject(new Error(message));
              this.pendingEmbedding = null;
            }
            break;

          case "classificationResult":
            if (this.pendingClassification) {
              this.pendingClassification.resolve(payload);
              this.pendingClassification = null;
            }
            break;

          case "embeddingResult":
            if (this.pendingEmbedding) {
              this.pendingEmbedding.resolve(payload);
              this.pendingEmbedding = null;
            }
            break;
        }
      });

      this.worker.postMessage({ type: "init" });
    } catch (err) {
      console.error("[PRISM BiasEngine] Failed to construct web worker:", err);
      this.status = "error";
      this.notifyListeners();
    }
  }

  public classify(text: string, labels: string[]): Promise<ClassificationResult> {
    this.init(); // Auto-init if not done
    
    return new Promise<ClassificationResult>((resolve, reject) => {
      if (this.status === "error") {
        return reject(new Error("Local ML Engine is in error state"));
      }

      // Overwrite any stale pending classifications (only one can run at a time)
      if (this.pendingClassification) {
        this.pendingClassification.reject(new Error("Superseded by a new classification request"));
      }

      this.pendingClassification = { resolve, reject };
      
      if (this.worker) {
        this.worker.postMessage({
          type: "classify",
          payload: { text, labels }
        });
      } else {
        reject(new Error("Worker not initialized"));
      }
    });
  }

  public embed(articles: any[]): Promise<EmbeddingResult> {
    this.init(); // Auto-init if not done

    return new Promise<EmbeddingResult>((resolve, reject) => {
      if (this.status === "error") {
        return reject(new Error("Local ML Engine is in error state"));
      }

      if (this.pendingEmbedding) {
        this.pendingEmbedding.reject(new Error("Superseded by a new embedding request"));
      }

      this.pendingEmbedding = { resolve, reject };

      if (this.worker) {
        this.worker.postMessage({
          type: "embed",
          payload: { articles }
        });
      } else {
        reject(new Error("Worker not initialized"));
      }
    });
  }
}

export const biasEngine = BiasEngineService.getInstance();
