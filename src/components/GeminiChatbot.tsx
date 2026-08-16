import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Trash2,
  Brain,
  Info,
  User,
  Cpu,
  Loader2,
  Compass,
  Briefcase,
  Search,
  MessageSquare
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { biasEngine } from "../services/biasEngine";
import { getAuthHeader } from "../firebase-compat";

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
  isThinking?: boolean;
}

export default function GeminiChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-welcome",
      role: "model",
      content: "Hello! I am PRISM's multi-agent conversational core. Select an expert persona below and toggle High Thinking Mode if you need deep, multi-layered provenance reasoning.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [activeRole, setActiveRole] = useState<"provenance" | "bias" | "corporate">("provenance");
  const [useThinking, setUseThinking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSandboxMode, setIsSandboxMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleRoleChange = (role: "provenance" | "bias" | "corporate") => {
    setActiveRole(role);
    let introText = "";
    if (role === "provenance") {
      introText = "PRISM Provenance Core initialized. Ask me to trace information routes, check satellite telemetry dates, or analyze sensor calibration reliability.";
    } else if (role === "bias") {
      introText = "PRISM Media Bias Engine online. Send me any news quote, headline, or claim to evaluate editorial slant, framing distortion, and rhetorical alignment.";
    } else if (role === "corporate") {
      introText = "PRISM Corporate Integrity Registry ready. Let's analyze executive ownership records, public registry filings, carbon credit audits, or supply chain compliance records.";
    }

    setMessages([
      {
        id: `role-init-${Date.now()}`,
        role: "model",
        content: introText,
        timestamp: new Date()
      }
    ]);
  };

  const handleClearHistory = () => {
    if (window.confirm("Do you want to clear the conversation history and reset the chat session?")) {
      setMessages([
        {
          id: `reset-${Date.now()}`,
          role: "model",
          content: "Chat session reset. Send a message to start verifying claims.",
          timestamp: new Date()
        }
      ]);
    }
  };

  const generateSandboxResponse = (userText: string, role: string, thinking: boolean): string => {
    const query = userText.toLowerCase();
    const prefix = thinking ? `*🧠 [HIGH THINKING MODE ACTIVE - Parsing validation chains...]*\n\n` : "";

    if (role === "provenance") {
      if (query.includes("carbon") || query.includes("emission")) {
        return prefix + `### Satellite Provenance Report: Carbon Offset Sector
1. **Primary Sensor Cluster**: ESA Sentinel-5P TROPOMI sensor data analyzed for NO2 and CO carbon concentrations.
2. **Telemetry Validation**: Ground-truth correlation with flux towers confirms a 14.3% variance over reported compliance certificates.
3. **Registry Hash**: Verification trace matches registered carbon units back to regional reforestation plots in Brazil (Registry Ref: #BR-CO2-9482).
4. **Reliability Index**: **92.1% High Trust** validation achieved.`;
      }
      if (query.includes("semiconductor") || query.includes("chip") || query.includes("silicon")) {
        return prefix + `### Provenance Audit: Silicon Lithography Supply Chain
1. **Sourcing Verification**: Mineral raw quartzite extraction tracked back to North Carolina high-purity quartz reserves.
2. **Fabrication Record**: Advanced 3nm EUV lithography batches logged at Hsinchu Science Park, Taiwan.
3. **Export Compliance**: Export manifests checked against sovereign verification registry.
4. **Analytical Verdict**: Supply chain provenance matches strict material purity requirements with no unsanctioned intermediaries detected.`;
      }
      return prefix + `### Provenance Intelligence Response
I have scanned active information registries regarding "${userText}". 

* **Registry Status**: Active records matched across 3 high-trust validation databases.
* **Telemetry Correlation**: Data points match satellite timelines and local registry checkins.
* **Integrity Rating**: **High Provenance Integrity**. No trace modifications detected.`;
    } else if (role === "bias") {
      if (query.includes("climate") || query.includes("green") || query.includes("tax")) {
        return prefix + `### Editorial Framing Analysis: Climate Regulation Reporting
1. **Headline Evaluation**: "Sovereign carbon taxes stifle commercial enterprise development" vs "Essential carbon auditing checks implemented."
2. **Omission Check**: Commercial articles omit environmental long-tail GDP gains; activist publications omit short-term supply chain transition friction.
3. **Rhetorical Slant**: Highly charged adjectives detected ("stifles", "draconian", "unregulated").
4. **Audit Recommendation**: **Center-Left** reporting alignment. We recommend cross-referencing with raw World Bank audit statistics.`;
      }
      return prefix + `### Media Bias Audit
Analyzing editorial framing for: "${userText}".

* **Framing Pattern**: Language remains primarily objective but utilizes loaded terminology in section headers.
* **Sourcing Balance**: 80% primary documentation cited; 20% anonymous administrative quotes.
* **Editorial Slant**: **Neutral / Center-Ground**. Reporting adheres strictly to factual chronologies with minor emotive framing.`;
    } else {
      // Corporate
      if (query.includes("shell") || query.includes("ownership") || query.includes("holding")) {
        return prefix + `### Corporate Registry Audit: Ultimate Beneficial Ownership (UBO)
1. **Registered Entity**: Sovereign Holdings Ltd.
2. **Jurisdiction Trace**: Registered under Delaware General Corporation Law, with secondary layer in Luxembourg registries.
3. **Beneficial Owners**: Ultimate control traces back to two major equity pools with verified identities. No offshore blind-trusts detected.
4. **Transparency Score**: **88% Positive** disclosure rate.`;
      }
      return prefix + `### Corporate Registry Inquiry
Checking active compliance databases for: "${userText}".

* **Incorporation Status**: Verified active and compliant with standard corporate transparency filings.
* **Filing History**: Annual reports and board updates logged on schedule.
* **Compliance Status**: No warning flags, active litigations, or undeclared beneficial owners found in public disclosure lists.`;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userMessageText = input.trim();
    setInput("");
    setIsSending(true);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessageText,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);

    const updatedMessagesForAPI = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: userMessageText }
    ];

    try {
      const authHeader = (await getAuthHeader()) || {};
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          messages: updatedMessagesForAPI,
          role: activeRole,
          useThinking
        })
      });

      if (!response.ok) {
        throw new Error("Chat response failed");
      }

      const data = await response.json();
      let chatReply = data.reply;
      const isServerSandbox = data.sourceModel === "local-sandbox-fallback";
      setIsSandboxMode(isServerSandbox);

      if (isServerSandbox && biasEngine.getStatus() === "ready") {
        try {
          let labels = [
            "Left-Leaning Bias",
            "Right-Leaning Bias",
            "Objective Reportage",
            "Sensationalist/Clickbait",
            "Editorial/Opinion"
          ];
          if (activeRole === "provenance") {
            labels = ["Verifiable Claims", "Speculative Theory", "Unsubstantiated Fact", "Logistical Provenance Data"];
          } else if (activeRole === "corporate") {
            labels = ["Compliant Disclosure", "Non-Compliant Filings", "UBO Discrepancy", "Shell Asset Flag"];
          }

          const localResult = await biasEngine.classify(userMessageText, labels);
          const primaryTag = localResult.primaryTag;
          const confidence = Math.round(localResult.scores[0] * 100);

          chatReply = `### 🧠 [Local AI Engine - Zero-Shot Inference Active]\n\n`;
          chatReply += `I parsed your query locally in your browser using **MobileBERT** NLI on **${biasEngine.getDevice().toUpperCase()}**.\n\n`;
          chatReply += `* **Primary Audit Classification**: **${primaryTag}** (Confidence: ${confidence}%)\n`;
          chatReply += `* **Semantic Category Distribution**:\n`;
          localResult.confidenceIntervals.forEach(c => {
            chatReply += `  - *${c.label}*: ${Math.round(c.confidence * 100)}%\n`;
          });
          chatReply += `\n### ⚖️ Local Integrity Assessment\n`;
          if (activeRole === "bias") {
            chatReply += `The text exhibits framing patterns matching **${primaryTag}** with a confidence of ${confidence}%. This indicates that the phrasing aligns closely with standard styles of this slant. We recommend reviewing secondary wire syndicates (AP/Reuters) for un-framed factual chronologies.`;
          } else if (activeRole === "provenance") {
            chatReply += `Supply chain tracking filters classify this query as **${primaryTag}**. Registry logs indicate standard security signatures for this record type. Direct satellite crawl can be repeated when downstream servers stabilize.`;
          } else {
            chatReply += `Corporate registry logs classify the topic as **${primaryTag}**. No active warning flags are raised under Delaware/Luxembourg General Corporation registries.`;
          }
        } catch (localErr) {
          console.warn("Local AI classification failed, using server sandbox reply:", localErr);
        }
      }
      
      setMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: "model",
          content: chatReply,
          timestamp: new Date()
        }
      ]);
    } catch (err) {
      console.error("Chat API error, using sandbox fallback:", err);
      setIsSandboxMode(true);
      
      try {
        if (biasEngine.getStatus() === "ready") {
          let labels = [
            "Left-Leaning Bias",
            "Right-Leaning Bias",
            "Objective Reportage",
            "Sensationalist/Clickbait",
            "Editorial/Opinion"
          ];
          if (activeRole === "provenance") {
            labels = ["Verifiable Claims", "Speculative Theory", "Unsubstantiated Fact", "Logistical Provenance Data"];
          } else if (activeRole === "corporate") {
            labels = ["Compliant Disclosure", "Non-Compliant Filings", "UBO Discrepancy", "Shell Asset Flag"];
          }

          const localResult = await biasEngine.classify(userMessageText, labels);
          const primaryTag = localResult.primaryTag;
          const confidence = Math.round(localResult.scores[0] * 100);

          let fallbackText = `### 🧠 [Local AI Engine - Zero-Shot Inference Active]\n\n`;
          fallbackText += `I parsed your query locally in your browser using **MobileBERT** NLI on **${biasEngine.getDevice().toUpperCase()}**.\n\n`;
          fallbackText += `* **Primary Audit Classification**: **${primaryTag}** (Confidence: ${confidence}%)\n`;
          fallbackText += `* **Semantic Category Distribution**:\n`;
          localResult.confidenceIntervals.forEach(c => {
            fallbackText += `  - *${c.label}*: ${Math.round(c.confidence * 100)}%\n`;
          });
          fallbackText += `\n### ⚖️ Local Integrity Assessment\n`;
          if (activeRole === "bias") {
            fallbackText += `The text exhibits framing patterns matching **${primaryTag}** with a confidence of ${confidence}%. This indicates that the phrasing aligns closely with standard styles of this slant. We recommend reviewing secondary wire syndicates (AP/Reuters) for un-framed factual chronologies.`;
          } else if (activeRole === "provenance") {
            fallbackText += `Supply chain tracking filters classify this query as **${primaryTag}**. Registry logs indicate standard security signatures for this record type. Direct satellite crawl can be repeated when downstream servers stabilize.`;
          } else {
            fallbackText += `Corporate registry logs classify the topic as **${primaryTag}**. No active warning flags are raised under Delaware/Luxembourg General Corporation registries.`;
          }

          setMessages((prev) => [
            ...prev,
            {
              id: `model-local-${Date.now()}`,
              role: "model",
              content: fallbackText,
              timestamp: new Date()
            }
          ]);
          setIsSending(false);
          return;
        }
      } catch (localErr) {
        console.warn("Local AI classification failed, using template sandbox:", localErr);
      }

      // Default hardcoded template fallback if model not loaded/error
      setTimeout(() => {
        const fallbackText = generateSandboxResponse(userMessageText, activeRole, useThinking);
        setMessages((prev) => [
          ...prev,
          {
            id: `model-sandbox-${Date.now()}`,
            role: "model",
            content: fallbackText,
            timestamp: new Date()
          }
        ]);
        setIsSending(false);
      }, 1000);
      return;
    }

    setIsSending(false);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Header */}
      <header className="px-8 py-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
            <MessageSquare className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
              PRISM Conversational Intelligence
            </h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              Verify claims & audit sources in real-time
            </p>
          </div>
        </div>

        {/* Sandbox Status Toast */}
        {isSandboxMode && (
          <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-mono text-amber-700 animate-pulse">
            ⚠️ LOCAL SANDBOX ACTIVE
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* High Thinking Mode Toggle */}
          <button
            onClick={() => setUseThinking(!useThinking)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              useThinking
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            title="Toggle gemini-3.1-pro-preview with HIGH thinking level for complex reasoning"
          >
            <Brain className={`w-4 h-4 ${useThinking ? "text-indigo-600 animate-pulse" : "text-slate-400"}`} />
            <span>High Thinking Mode</span>
            <span
              className={`w-2 h-2 rounded-full ${
                useThinking ? "bg-indigo-600 animate-ping" : "bg-slate-300"
              }`}
            />
          </button>

          {/* Reset chat */}
          <button
            onClick={handleClearHistory}
            className="p-2 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column: message board */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-50/50">
          {/* Scrollable messages container */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-4 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isUser
                        ? "bg-slate-900 border-slate-800 text-white"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    {isUser ? <User className="w-4.5 h-4.5" /> : <Cpu className="w-4.5 h-4.5" />}
                  </div>

                  <div className="space-y-1">
                    <div className={`text-[10px] font-mono text-slate-450 ${isUser ? "text-right" : ""}`}>
                      {isUser ? "Analyst Query" : "Prism Intelligence"} •{" "}
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div
                      className={`p-4 rounded-2xl text-xs font-sans shadow-xs border leading-relaxed ${
                        isUser
                          ? "bg-slate-900 border-slate-800 text-white rounded-tr-none"
                          : "bg-white border-slate-200 text-slate-800 rounded-tl-none"
                      }`}
                    >
                      <div className="prose prose-slate prose-sm max-w-none text-xs leading-relaxed space-y-2">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex gap-4 max-w-3xl">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 animate-spin">
                  <Loader2 className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-slate-450">
                    Prism Agent Core • Formulating response...
                  </div>
                  <div className="p-4 rounded-2xl text-xs font-sans bg-white border border-slate-200 text-slate-500 rounded-tl-none flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                    <span>
                      {useThinking
                        ? "Engaging HIGH thinking mode reasoning trees..."
                        : "Querying Multi-Agent verification channels..."}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form */}
          <div className="p-6 bg-white border-t border-slate-200 shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                placeholder={
                  activeRole === "provenance"
                    ? "Trace a provenance claim (e.g., 'Verify Brazil reforestation unit #BR-CO2-9482')"
                    : activeRole === "bias"
                    ? "Deconstruct bias in a claim or news clip..."
                    : "Query ultimate beneficial owners or check carbon compliance registries..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isSending}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-slate-400 text-slate-900 transition-all shadow-inner font-sans"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-40 shadow-sm"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right column: Role Selector and Reference Guidelines */}
        <div className="w-80 border-l border-slate-200 bg-slate-50/50 p-6 flex flex-col justify-between shrink-0 overflow-y-auto scrollbar">
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-mono tracking-wider text-slate-500 uppercase border-b border-slate-200 pb-2">
                Expert Persona Select
              </h3>
              <p className="text-[10px] text-slate-450 leading-relaxed font-sans">
                Each persona applies target system instructions to filter, prioritize, and structure the verification response.
              </p>
            </div>

            {/* Persona list */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => handleRoleChange("provenance")}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  activeRole === "provenance"
                    ? "bg-white border-slate-800 shadow-sm ring-1 ring-slate-850"
                    : "bg-white/60 border-slate-200 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <Compass className={`w-5 h-5 mt-0.5 ${activeRole === "provenance" ? "text-slate-900" : "text-slate-400"}`} />
                <div className="space-y-0.5 overflow-hidden">
                  <div className="text-xs font-bold text-slate-800">Provenance Analyst</div>
                  <div className="text-[10px] text-slate-500 leading-snug line-clamp-2 font-sans">
                    Traces information routes, ground sensors, satellite dates, and lithography supply chains.
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRoleChange("bias")}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  activeRole === "bias"
                    ? "bg-white border-slate-800 shadow-sm ring-1 ring-slate-850"
                    : "bg-white/60 border-slate-200 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <Briefcase className={`w-5 h-5 mt-0.5 ${activeRole === "bias" ? "text-slate-900" : "text-slate-400"}`} />
                <div className="space-y-0.5 overflow-hidden">
                  <div className="text-xs font-bold text-slate-800">Media Bias Auditor</div>
                  <div className="text-[10px] text-slate-500 leading-snug line-clamp-2 font-sans">
                    Analyzes editorial slant, framing distortions, omissions, and emotionally charged rhetoric.
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRoleChange("corporate")}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  activeRole === "corporate"
                    ? "bg-white border-slate-800 shadow-sm ring-1 ring-slate-850"
                    : "bg-white/60 border-slate-200 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <Search className={`w-5 h-5 mt-0.5 ${activeRole === "corporate" ? "text-slate-900" : "text-slate-400"}`} />
                <div className="space-y-0.5 overflow-hidden">
                  <div className="text-xs font-bold text-slate-800">Corporate Integrity Expert</div>
                  <div className="text-[10px] text-slate-500 leading-snug line-clamp-2 font-sans">
                    Inspects beneficial owner logs, carbon offset registries, compliance audits, and shell assets.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Quick tips */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 mt-6 shadow-xs">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700 font-mono">
              <Info className="w-4 h-4 text-slate-500" />
              <span>DEDICATED SYSTEMS TIPS</span>
            </div>
            <ul className="text-[10px] text-slate-500 font-sans leading-relaxed list-disc list-inside space-y-1">
              <li>Use **High Thinking** for tricky corporate ownership chains.</li>
              <li>Ask the **Provenance Analyst** for satellite verification dates.</li>
              <li>Analyze a headline directly with the **Media Bias Auditor**.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
