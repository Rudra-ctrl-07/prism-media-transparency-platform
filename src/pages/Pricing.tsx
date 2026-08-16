import React from "react";

/**
 * Two-tier pricing — rebuilt from new_ui/prism_pricing/code.html.
 *
 * Fulfills design brief position #6 (no paywall frustration): the free
 * Community Access tier ships the full transparency experience
 * (credibility score, source links, basic reasoning); only depth and
 * volume are gated behind Analyst Pro.
 */
export default function Pricing() {
  return (
    <section className="pt-32 pb-32 px-16 max-w-[1280px] mx-auto">
      {/* Hero */}
      <header className="mb-20 text-center md:text-left max-w-4xl">
        <span className="font-body text-[12px] uppercase tracking-widest text-on-surface-variant mb-4 block">
          Institutional Grade Intelligence
        </span>
        <h1 className="font-display text-[64px] leading-[1.1] tracking-[-0.02em] font-medium mb-6">
          Transparent Pricing. Access the tools of the future, today.
        </h1>
        <p className="font-body text-[20px] text-on-surface-variant max-w-2xl">
          We believe transparency shouldn't be a luxury. Choose the tier that
          matches your commitment to objective truth.
        </p>
      </header>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-32">
        {/* Community Access */}
        <div className="border border-silver-grey p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="flex justify-between items-start mb-12">
              <div>
                <h2 className="font-display text-[40px] font-medium mb-2">
                  Community Access
                </h2>
                <p className="font-body text-[14px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  For the Curious Individual
                </p>
              </div>
              <div className="text-right">
                <span className="font-display text-[40px] font-medium">$0</span>
                <span className="block font-body text-[12px] text-on-surface-variant">
                  Forever free
                </span>
              </div>
            </div>
            <div className="space-y-6 mb-12">
              {[
                ["ML Transparency Score", "High-level credibility metrics for any article URL."],
                ["Original Source Links", "Direct access to the primary data supporting a claim."],
                ["Basic Reasoning", "A summary of the algorithmic logic behind the score."],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-transparency-teal">
                    check_circle
                  </span>
                  <div>
                    <p className="font-body text-[16px] font-medium">{title}</p>
                    <p className="font-body text-[12px] text-on-surface-variant">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <a
            href="#/"
            className="w-full border border-deep-charcoal py-4 font-body text-[14px] font-semibold uppercase tracking-widest text-center hover:bg-deep-charcoal hover:text-white transition-colors block"
          >
            Start Verifying
          </a>
        </div>

        {/* Analyst Pro */}
        <div className="relative border border-deep-charcoal p-10 flex flex-col justify-between bg-deep-charcoal text-white overflow-hidden">
          {/* Subtle background graphic */}
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "120px", fontVariationSettings: "'FILL' 0, 'wght' 100" }}
            >
              analytics
            </span>
          </div>

          {/* Recommended badge */}
          <div className="absolute -top-3 left-10 bg-arcade-pink text-white px-4 py-1 font-body text-[10px] uppercase tracking-widest font-bold border-2 border-arcade-ink shadow-brutal-sm">
            Recommended
          </div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-12">
              <div>
                <h2 className="font-display text-[40px] font-medium mb-2">
                  Analyst Pro
                </h2>
                <p className="font-body text-[14px] font-semibold uppercase tracking-widest text-silver-grey">
                  For Professional Truth-Seekers
                </p>
              </div>
              <div className="text-right">
                <span className="font-display text-[40px] font-medium">$19</span>
                <span className="block font-body text-[12px] text-silver-grey">
                  per month
                </span>
              </div>
            </div>
            <div className="space-y-6 mb-12">
              {[
                ["Unlimited Deep Verifications", "Exhaustive multi-agent analysis with no daily limits."],
                ["Priority Debate Engine Access", "Interactive visualization of conflicting expert models."],
                ["API Access", "Integrate PRISM intelligence into your own research workflow."],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-transparency-teal">
                    verified
                  </span>
                  <div>
                    <p className="font-body text-[16px] font-medium">{title}</p>
                    <p className="font-body text-[12px] text-silver-grey">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <a
            href="#/"
            className="relative z-10 w-full bg-arcade-ink text-arcade-yellow py-4 font-body text-[14px] font-bold uppercase tracking-widest text-center border-t-2 border-arcade-ink hover:bg-arcade-green hover:text-white transition-colors block"
          >
            Get Analyst Pro
          </a>
        </div>
      </div>

      {/* Comparison Table */}
      <section className="max-w-5xl mx-auto mb-32">
        <div className="text-center mb-12">
          <h3 className="font-display text-[28px] font-medium mb-2">
            Feature Comparison
          </h3>
          <p className="font-body text-[16px] text-on-surface-variant">
            Full transparency on what you get.
          </p>
        </div>
        <table className="w-full font-body">
          <thead>
            <tr>
              <th className="font-display text-[28px] font-medium text-left py-8 px-4 w-1/2 border-b-2 border-deep-charcoal">
                Capability
              </th>
              <th className="font-body text-[14px] font-semibold uppercase tracking-widest text-on-surface-variant text-left py-8 px-4 border-b-2 border-deep-charcoal">
                Community
              </th>
              <th className="font-body text-[14px] font-semibold uppercase tracking-widest text-deep-charcoal text-left py-8 px-4 border-b-2 border-deep-charcoal">
                Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Verification Speed", "Standard", "Instant (Priority)"],
              ["Bias Detection Intensity", "Surface Level", "Deep Archetypal"],
              ["Multi-Agent Debate Nodes", "3 Nodes", "Up to 12 Nodes"],
              ["Historical Audit Log", "7 Days", "Infinite"],
              ["Export Formats", "Plain Text", "PDF, JSON, CSV"],
              ["Custom Modeling", "—", "Beta Access"],
            ].map(([cap, free, pro]) => (
              <tr key={cap} className="hover:bg-soft-white transition-colors">
                <td className="font-medium py-6 px-4 border-b border-silver-grey">{cap}</td>
                <td className="text-on-surface-variant py-6 px-4 border-b border-silver-grey">{free}</td>
                <td className="font-semibold py-6 px-4 border-b border-silver-grey">{pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Integrity Clause */}
      <section className="mt-32 border-t border-silver-grey pt-12 flex flex-col md:flex-row gap-12 items-center">
        <div className="w-24 h-24 shrink-0 bg-gradient-to-br from-transparency-teal/30 to-deep-charcoal/30 flex items-center justify-center">
          <span className="material-symbols-outlined text-[64px] text-deep-charcoal" style={{ fontVariationSettings: "'FILL' 0, 'wght' 100" }}>
            diamond
          </span>
        </div>
        <div>
          <h4 className="font-display text-[28px] font-medium mb-2">
            The "No Paywall Frustration" Pledge
          </h4>
          <p className="font-body text-[16px] text-on-surface-variant leading-relaxed max-w-3xl">
            At PRISM, truth isn't behind a paywall. Our essential
            verification tools will always remain free. Our paid tiers fund
            the massive computational power required for deep multi-agent
            cross-referencing and architectural bias modeling. We don't
            sell your data; we sell the labor of discovery.
          </p>
        </div>
      </section>
    </section>
  );
}