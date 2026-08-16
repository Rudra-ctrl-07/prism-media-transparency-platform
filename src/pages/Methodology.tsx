import React from "react";
import Gauge from "../components/Gauge";

/**
 * "How It Works" page — neo-brutalist rebuild.
 *
 * Sections: hero + Three Voices cards, the centered Synthesis flow card
 * with a pulsing moderator, the two-column Moderator Logic block, and
 * the four-column Data Sources grid.
 */
export default function Methodology() {
  return (
    <section className="max-w-[1280px] mx-auto px-16 py-16">
      {/* Hero */}
      <header className="text-center max-w-3xl mx-auto py-16">
        <span className="inline-flex items-center gap-2 bg-arcade-ink text-white px-4 py-1.5 border-2 border-arcade-ink shadow-brutal-sm text-[12px] font-bold uppercase tracking-widest mb-6">
          ⚙️ Our Methodology
        </span>
        <h1 className="font-display text-[64px] leading-[1.05] tracking-brutal mb-8 text-arcade-ink">
          The Debate Engine
        </h1>
        <p className="font-body text-[20px] font-medium text-arcade-ink/70 leading-relaxed">
          Transparency isn't a score; it's a process. Discover how PRISM
          synthesizes truth by simulating the intellectual labor of a
          diverse editorial board.
        </p>
      </header>

      {/* 01. The Three Voices */}
      <section className="mb-32">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b-2 border-arcade-ink pb-8">
          <h2 className="font-display text-[40px] leading-none tracking-brutal text-arcade-ink">
            01. The Three Voices
          </h2>
          <p className="text-arcade-ink/60 max-w-md font-medium text-[16px] mt-4 md:mt-0">
            We employ three distinct AI personas, each rigorously trained on
            specific sociological and journalistic frameworks to analyze
            content from divergent angles.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "The Progressive Agent",
              icon: "diversity_3",
              color: "#22c55e",
              desc:
                "Analyzes power dynamics, systemic implications, and inclusivity. Focuses on social equity and historical context within the narrative.",
            },
            {
              title: "The Conservative Agent",
              icon: "account_balance",
              color: "#4fc3f7",
              desc:
                "Evaluates adherence to tradition, institutional stability, and individual responsibility. Prioritizes economic realism and foundational principles.",
            },
            {
              title: "The Omission-Focused Agent",
              icon: "visibility_off",
              color: "#ff4fd8",
              desc:
                "The Silent Auditor. Scans for missing context, unasked questions, and perspectives deliberately left out of the primary text.",
            },
          ].map((v, i) => (
            <div
              key={v.title}
              className={`bg-white border-2 border-arcade-ink shadow-brutal p-8 flex flex-col items-center text-center hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all ${
                i === 0 ? "bg-arcade-green" : i === 1 ? "bg-arcade-blue" : "bg-arcade-pink"
              }`}
              style={i === 0 ? { color: "#fff" } : i === 2 ? { color: "#fff" } : undefined}
            >
              <div className="w-16 h-16 bg-white border-2 border-arcade-ink shadow-brutal-sm flex items-center justify-center mb-6">
                <span
                  className="material-symbols-outlined"
                  style={{ color: v.color, fontSize: "24px" }}
                >
                  {v.icon}
                </span>
              </div>
              <h3 className="font-display text-[22px] tracking-brutal mb-4">
                {v.title}
              </h3>
              <p className={`text-[16px] leading-relaxed ${i === 1 ? "text-arcade-ink/80" : "text-white/90"}`}>
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Visualizing the Synthesis */}
      <section className="mb-32 relative">
        <div className="bg-white border-2 border-arcade-ink shadow-brutal-lg p-12 max-w-4xl mx-auto text-center relative">
          <h3 className="font-display text-[32px] tracking-brutal mb-6 text-arcade-ink">
            Visualizing the Synthesis
          </h3>
          <div className="flex justify-center items-center gap-8 mb-8 flex-wrap">
            <div className="w-24 h-24 bg-arcade-yellow border-2 border-arcade-ink shadow-brutal-sm flex items-center justify-center font-body text-[10px] font-bold tracking-widest text-arcade-ink">
              RAW DATA
            </div>
            <div className="flex flex-col gap-3">
              <div className="w-12 h-0.5 bg-arcade-pink" />
              <div className="w-12 h-0.5 bg-arcade-ink/40" />
              <div className="w-12 h-0.5 bg-arcade-pink" />
            </div>
            <div className="w-32 h-32 bg-arcade-ink border-2 border-arcade-ink flex items-center justify-center ring-spin relative shadow-brutal-sm">
              <span className="font-body text-[12px] font-bold tracking-widest text-arcade-yellow">
                MODERATOR
              </span>
            </div>
            <div className="w-12 h-0.5 bg-arcade-ink/40" />
            <div className="w-24 h-24 bg-arcade-green border-2 border-arcade-ink flex flex-col items-center justify-center text-white shadow-brutal-sm">
              <span className="text-[20px] font-bold">88</span>
              <span className="text-[10px] tracking-tighter uppercase">PRISM Score</span>
            </div>
          </div>
          <p className="text-arcade-ink/60 text-[16px] italic">
            "Truth is not the absence of bias, but the acknowledgment of it."
          </p>
        </div>
      </section>

      {/* 02. Moderator Logic */}
      <section className="mb-32 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <span className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-arcade-ink/60 block mb-4">
            Process
          </span>
          <h2 className="font-display text-[40px] leading-tight tracking-brutal mb-8 text-arcade-ink">
            02. The Moderator Logic
          </h2>
          <div className="space-y-6">
            <div className="bg-white border-2 border-arcade-ink shadow-brutal p-6">
              <h4 className="font-display text-[14px] tracking-widest uppercase mb-2 text-arcade-ink">
                🧠 Weighted Discourse
              </h4>
              <p className="text-arcade-ink/60 text-[16px] leading-relaxed">
                The moderator does not average the scores. Instead, it
                weights the strength of the evidence provided by each agent.
                If the Progressive agent identifies a structural omission
                that others missed, that finding is amplified.
              </p>
            </div>
            <div className="bg-white border-2 border-arcade-ink shadow-brutal p-6">
              <h4 className="font-display text-[14px] tracking-widest uppercase mb-2 text-arcade-ink">
                ⚔️ Conflict Resolution
              </h4>
              <p className="text-arcade-ink/60 text-[16px] leading-relaxed">
                Where agents disagree, the moderator triggers a secondary
                Debate Loop, forcing agents to cite specific phrases from
                the source text to defend their interpretation.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-arcade-yellow border-2 border-arcade-ink shadow-brutal p-12 flex items-center justify-center">
          <Gauge value={75} size={260} strokeWidth={10} label="Confidence" />
        </div>
      </section>

      {/* 03. Data Sources */}
      <section className="mb-32">
        <div className="text-center mb-16">
          <span className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-arcade-ink/60 block mb-4">
            The Pipeline
          </span>
          <h2 className="font-display text-[40px] tracking-brutal mb-4 text-arcade-ink">
            03. Our Data Sources
          </h2>
          <div className="w-16 h-1 bg-arcade-pink mx-auto border-2 border-arcade-ink" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { tag: "01 / Global Index", icon: "🌐", body: "Real-time feeds from 400+ international news agencies and independent outlets." },
            { tag: "02 / Historical Corpus", icon: "🗄️", body: "Archival data from 1950–Present to identify shifts in narrative framing over decades." },
            { tag: "03 / Factual Verity", icon: "✅", body: "Direct integration with non-partisan statistical databases (World Bank, IMF, etc.)." },
            { tag: "04 / Crowd Sentiment", icon: "💬", body: "Anonymized public reaction data to measure the emotional velocity of specific stories." },
          ].map((d, i) => (
            <div
              key={d.tag}
              className={`bg-white border-2 border-arcade-ink shadow-brutal p-6 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all ${
                i === 1 ? "bg-arcade-blue" : i === 2 ? "bg-arcade-green" : ""
              }`}
              style={i === 2 ? { color: "#fff" } : undefined}
            >
              <span className="text-[24px] block mb-3">{d.icon}</span>
              <span className="font-display text-[13px] tracking-widest mb-2 block text-arcade-ink">
                {d.tag}
              </span>
              <p className={`text-[16px] leading-relaxed ${i === 2 ? "text-white/90" : "text-arcade-ink/60"}`}>
                {d.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-y-2 border-arcade-ink text-center">
        <h2 className="font-display text-[48px] leading-tight tracking-brutal mb-8 text-arcade-ink">
          Experience Transparency Firsthand
        </h2>
        <div className="flex flex-col md:flex-row justify-center gap-4">
          <a
            href="#/"
            className="px-10 py-4 bg-arcade-ink text-arcade-yellow font-bold tracking-widest uppercase border-2 border-arcade-ink shadow-brutal hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all font-body text-[14px]"
          >
            Start Verification
          </a>
          <a
            href="#/methodology"
            className="px-10 py-4 bg-white border-2 border-arcade-ink text-arcade-ink font-bold tracking-widest uppercase shadow-brutal hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all font-body text-[14px]"
          >
            Download Whitepaper
          </a>
        </div>
      </section>
    </section>
  );
}
