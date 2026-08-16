import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { 
  Network, 
  Cpu, 
  Sparkles, 
  Activity, 
  HelpCircle, 
  Play, 
  Loader2, 
  FileText,
  AlertCircle,
  ThumbsUp,
  Fingerprint
} from "lucide-react";
import { Article } from "../types";
import { biasEngine, ClassificationResult, EmbeddingResult, WorkerStatus } from "../services/biasEngine";

interface BiasSimilarityCanvasProps {
  articles: Article[];
}

export default function BiasSimilarityCanvas({ articles }: BiasSimilarityCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // local state
  const [dimensions, setDimensions] = useState({ width: 600, height: 450 });
  const [engineStatus, setEngineStatus] = useState<WorkerStatus>("uninitialized");
  const [engineProgress, setEngineProgress] = useState(0);
  const [engineDevice, setEngineDevice] = useState("cpu");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  
  // ML pipeline outputs
  const [embeddingData, setEmbeddingData] = useState<EmbeddingResult | null>(null);
  const [isEmbedding, setIsEmbedding] = useState(false);
  
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [customText, setCustomText] = useState("");
  
  const taxonomyLabels = useMemo(() => [
    "Left-Leaning Bias",
    "Right-Leaning Bias",
    "Objective Reportage",
    "Sensationalist/Clickbait",
    "Editorial/Opinion"
  ], []);

  // Listen to the singleton Local AI engine
  useEffect(() => {
    const unsubscribe = biasEngine.subscribe((status, progress, device) => {
      setEngineStatus(status);
      setEngineProgress(progress);
      setEngineDevice(device);
    });
    return () => unsubscribe();
  }, []);

  // Auto-init the engine on component mount
  useEffect(() => {
    biasEngine.init();
  }, []);


  // Stable key: re-embed only when the set of article IDs actually changes
  const articleIds = useMemo(() => articles.map((a) => a.id).join(","), [articles]);

  // Extract embeddings and calculate similarities once models are ready or article set changes
  useEffect(() => {
    if (engineStatus !== "ready" || articles.length === 0) return;

    let active = true;
    const loadEmbeddings = async () => {
      setIsEmbedding(true);
      try {
        const result = await biasEngine.embed(articles);
        if (active) {
          setEmbeddingData(result);
          // Auto-select first article if none selected
          setSelectedArticleId((prev) => prev || articles[0].id);
        }
      } catch (err) {
        console.error("[BiasSimilarityCanvas] Embedding calculations failed:", err);
      } finally {
        if (active) setIsEmbedding(false);
      }
    };

    loadEmbeddings();
    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineStatus, articleIds]);

  // Handle ResizeObserver for responsive D3 canvas
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // Maintain reasonable dimensions
      setDimensions({
        width: Math.max(350, width),
        height: 450
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Selected article reference
  const selectedArticle = useMemo(() => {
    return articles.find((a) => a.id === selectedArticleId) || null;
  }, [articles, selectedArticleId]);

  // Run Zero-shot classification on custom input text
  const handleClassifyCustomText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim() || engineStatus !== "ready") return;

    setIsClassifying(true);
    setClassificationResult(null);
    try {
      const result = await biasEngine.classify(customText.trim(), taxonomyLabels);
      setClassificationResult(result);
    } catch (err) {
      console.error("[BiasSimilarityCanvas] Custom local Zero-shot failed:", err);
      alert("Local classification failed.");
    } finally {
      setIsClassifying(false);
    }
  };

  // Trigger classification when selected article changes
  useEffect(() => {
    setClassificationResult(null);
    if (!selectedArticle || engineStatus !== "ready") return;

    let active = true;
    setIsClassifying(true);
    const textToClassify = `${selectedArticle.title}. ${selectedArticle.excerpt}`;
    biasEngine.classify(textToClassify, taxonomyLabels)
      .then((result) => { if (active) setClassificationResult(result); })
      .catch((err) => console.error("[BiasSimilarityCanvas] Classification failed:", err))
      .finally(() => { if (active) setIsClassifying(false); });

    return () => { active = false; };
  }, [selectedArticleId, engineStatus, taxonomyLabels]);

  // Calculate similarity rankings for the selected node
  const similarityRankings = useMemo(() => {
    if (!selectedArticleId || !embeddingData?.matrix) return [];
    
    const scores = embeddingData.matrix[selectedArticleId] || {};
    return Object.entries(scores)
      .map(([id, similarity]) => {
        const art = articles.find((a) => a.id === id);
        return {
          id,
          similarity,
          title: art?.title || "Unknown Article",
          sourceName: art?.sourceName || "Unknown Outlet",
          biasRating: art?.biasRating || "Center"
        };
      })
      .filter((item) => item.id !== selectedArticleId)
      .sort((a, b) => b.similarity - a.similarity);
  }, [selectedArticleId, embeddingData, articles]);

  // D3 force simulation renderer
  useEffect(() => {
    if (!svgRef.current || !embeddingData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear SVG

    const width = dimensions.width;
    const height = dimensions.height;

    // Deep copy nodes and links for D3 state mutation
    const nodes = embeddingData.graphData.nodes.map((d) => ({ ...d }));
    const links = embeddingData.graphData.links.map((d) => ({
      source: d.source,
      target: d.target,
      value: d.value,
      distance: d.distance
    }));

    // Color mapper based on outlet bias rating
    const getBiasColor = (bias: string) => {
      switch (bias) {
        case "Left":
          return "#ef4444"; // Red
        case "Center-Left":
          return "#f87171"; // Coral
        case "Center":
          return "#64748b"; // Slate
        case "Center-Right":
          return "#60a5fa"; // Light Blue
        case "Right":
          return "#3b82f6"; // Blue
        default:
          return "#94a3b8";
      }
    };

    // Construct force layout
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance((d: any) => d.distance || 100))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(35));

    // Render connection paths
    const link = svg.append("g")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d: any) => Math.max(1, d.value * 4));

    // Render node groupings
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(drag(simulation) as any)
      .on("click", (event, d: any) => {
        setSelectedArticleId(d.id);
      });

    // Node circles with outline highlighting for selection
    node.append("circle")
      .attr("r", 15)
      .attr("fill", (d: any) => getBiasColor(d.biasRating))
      .attr("stroke", (d: any) => d.id === selectedArticleId ? "#0f172a" : "#ffffff")
      .attr("stroke-width", (d: any) => d.id === selectedArticleId ? 3.5 : 2.5)
      .attr("class", "transition-all duration-200")
      .style("filter", "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))");

    // Add source indicators in circles
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("fill", "#ffffff")
      .attr("font-size", "9px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .text((d: any) => d.sourceName.substring(0, 2).toUpperCase());

    // Outlet labels floating above nodes
    node.append("text")
      .attr("dx", 20)
      .attr("dy", 4)
      .attr("font-family", "sans-serif")
      .attr("font-size", "10px")
      .attr("font-weight", "600")
      .attr("fill", (d: any) => d.id === selectedArticleId ? "#0f172a" : "#475569")
      .text((d: any) => d.sourceName);

    // Dynamic simulator ticks
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag behavior helper
    function drag(sim: d3.Simulation<d3.SimulationNodeDatum, undefined>) {
      function dragstarted(event: any) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event: any) {
        if (!event.active) sim.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    return () => {
      simulation.stop();
    };
  }, [embeddingData, dimensions, selectedArticleId]);

  return (
    <div className="flex-1 overflow-y-auto h-screen bg-slate-50 p-4 md:p-8 space-y-6 md:space-y-8 font-sans scrollbar">
      
      {/* Platform Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <Network className="w-5 h-5 text-slate-700 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-display font-bold text-slate-900 tracking-tight leading-snug">
              Local AI Perspective Canvas
            </h1>
            <p className="text-[10px] md:text-xs text-slate-500 font-mono">
              Quantifying cross-perspective framing alignment locally on WebGPU
            </p>
          </div>
        </div>

        {/* MLOps Hardware Telemetry Panel */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs shadow-sm font-mono">
            <Cpu className="w-4 h-4 text-slate-500" />
            <span className="text-slate-500">Execution Hardware:</span>
            {engineStatus === "ready" ? (
              <span className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase ${
                engineDevice === "webgpu" 
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                  : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}>
                {engineDevice === "webgpu" ? "WebGPU Accelerated" : "WebAssembly Fallback"}
              </span>
            ) : engineStatus === "loading" ? (
              <span className="text-amber-600 animate-pulse flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Load models...
              </span>
            ) : engineStatus === "error" ? (
              <span className="text-rose-600 font-semibold uppercase">Engine Offline</span>
            ) : (
              <span className="text-slate-400">Deactivated</span>
            )}
          </div>

          <div className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5">
            <Fingerprint className="w-3.5 h-3.5 text-slate-400" /> Infrastructure Cost: $0.00
          </div>
        </div>
      </div>

      {/* Model Load / Download Bar */}
      {engineStatus === "loading" && (
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Downloading quantized local weights (Cached via CacheStorage)...
            </span>
            <span className="font-semibold text-slate-900">{engineProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div 
              className="bg-slate-900 h-2 rounded-full transition-all duration-300"
              style={{ width: `${engineProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Hand: D3 2D Clustering Canvas */}
        <div className="lg:col-span-7 space-y-4">
          <div className="prism-card p-6 border-slate-200 bg-white shadow-sm flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4 text-xs font-mono text-slate-400 flex items-center gap-1 select-none">
              <HelpCircle className="w-3.5 h-3.5" /> Drag nodes to recalibrate physics
            </div>
            
            <h3 className="text-sm font-semibold text-slate-800 font-mono mb-4 uppercase tracking-wider flex items-center gap-2">
              <Network className="w-4 h-4 text-slate-650" /> 2D Semantic Alignment Vector Space
            </h3>

            {isEmbedding ? (
              <div className="h-[450px] w-full bg-slate-55 flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
                <span>Generating local dense embeddings...</span>
              </div>
            ) : embeddingData ? (
              <div ref={containerRef} className="w-full bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden shadow-inner">
                <svg 
                  ref={svgRef} 
                  width={dimensions.width} 
                  height={dimensions.height}
                  className="mx-auto"
                />
              </div>
            ) : (
              <div className="h-[450px] w-full bg-slate-55 flex flex-col items-center justify-center text-slate-400 font-mono text-xs p-8 text-center leading-relaxed">
                <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                <span>Initialize local AI models to calculate semantic vectors and map similarity linkages.</span>
              </div>
            )}

            {/* Color Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 border-t border-slate-100 pt-5 mt-4 text-xs font-semibold">
              <span className="text-slate-500 font-mono uppercase tracking-wider text-[10px]">Bias Guide:</span>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /> <span>Left</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-300" /> <span>Center-Left</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-500" /> <span>Center</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-300" /> <span>Center-Right</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> <span>Right</span></div>
            </div>
          </div>
        </div>

        {/* Right Hand: Interactive Inspector & Classification details */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Article Info Detail Panel */}
          <div className="prism-card p-6 border-slate-200 bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
              Outlet Framing Inspector
            </h3>

            {selectedArticle ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-700 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {selectedArticle.category}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {selectedArticle.sourceName}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 leading-snug">
                    {selectedArticle.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans bg-slate-50/50 p-3 rounded-lg border border-slate-100 italic">
                    "{selectedArticle.excerpt}"
                  </p>
                </div>

                {/* Similarity score board */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Semantic Similarity to other outlets</span>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1 scrollbar">
                    {similarityRankings.length === 0 ? (
                      <p className="text-xs text-slate-400 font-mono italic">No similarities calculated yet.</p>
                    ) : (
                      similarityRankings.map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => setSelectedArticleId(item.id)}
                          className="flex items-center justify-between p-2 rounded-lg border border-slate-200/50 hover:bg-slate-50 cursor-pointer transition-all text-xs"
                        >
                          <div className="flex items-center gap-2 overflow-hidden w-2/3">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              item.biasRating.includes("Left") ? "bg-red-400" : item.biasRating.includes("Right") ? "bg-blue-400" : "bg-slate-400"
                            }`} />
                            <span className="font-semibold text-slate-800 truncate">{item.sourceName}</span>
                          </div>
                          <span className={`font-mono font-bold ${
                            item.similarity >= 0.75 ? "text-emerald-600" : item.similarity >= 0.60 ? "text-indigo-600" : "text-slate-500"
                          }`}>
                            {Math.round(item.similarity * 100)}% Match
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Local Zero Shot result */}
                <div className="border-t border-slate-100 pt-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 font-mono">
                      <Sparkles className="w-4 h-4 text-slate-650" /> Zero-Shot Classification
                    </span>
                    <button
                      onClick={() => {
                        if (!selectedArticle || engineStatus !== "ready" || isClassifying) return;
                        setIsClassifying(true);
                        setClassificationResult(null);
                        const text = `${selectedArticle.title}. ${selectedArticle.excerpt}`;
                        biasEngine.classify(text, taxonomyLabels)
                          .then((result) => setClassificationResult(result))
                          .catch((err) => console.error("[BiasSimilarityCanvas] Re-evaluate failed:", err))
                          .finally(() => setIsClassifying(false));
                      }}
                      disabled={isClassifying || engineStatus !== "ready"}
                      className="flex items-center gap-1 px-3 py-1 bg-slate-900 text-white rounded text-[10px] font-semibold hover:bg-slate-850 transition-all disabled:opacity-50"
                    >
                      {isClassifying ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" /> Classifying...
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" /> Re-Evaluate
                        </>
                      )}
                    </button>
                  </div>

                  {classificationResult && (
                    <div className="space-y-2.5 bg-slate-50 border border-slate-200/50 p-4 rounded-xl">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-500">Primary Tone Tag:</span>
                        <span className="font-bold text-slate-950 uppercase px-2 py-0.5 rounded bg-slate-200/60">{classificationResult.primaryTag}</span>
                      </div>
                      
                      {/* confidence intervals */}
                      <div className="space-y-1.5 pt-1">
                        {classificationResult.confidenceIntervals.map((interval) => (
                          <div key={interval.label} className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-medium text-slate-700">
                              <span>{interval.label}</span>
                              <span className="font-mono">{Math.round(interval.confidence * 100)}%</span>
                            </div>
                            <div className="w-full bg-slate-200/60 rounded-full h-1.5">
                              <div 
                                className="bg-slate-700 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${interval.confidence * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Select an article from the similarity canvas to examine details.</p>
            )}
          </div>

          {/* Sandbox Playground for Custom Text classification */}
          <div className="prism-card p-6 border-slate-200 bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Fingerprint className="w-4 h-4 text-slate-550" /> Local AI Sandbox Testing
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Paste custom editorial paragraphs or alternative outlet framing clips below to evaluate bias tags locally on your GPU or CPU without server leakage.
            </p>

            <form onSubmit={handleClassifyCustomText} className="space-y-3">
              <textarea
                placeholder="Paste news text or editorial clip here..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full h-24 p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 font-sans shadow-inner resize-none"
              />
              <button
                type="submit"
                disabled={isClassifying || !customText.trim() || engineStatus !== "ready"}
                className="w-full py-2 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white text-xs font-semibold rounded-lg shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isClassifying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluating locally...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-white" /> Classify Custom Text
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
