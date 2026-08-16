import React, { useState } from "react";
import { colors } from "../design/tokens";

export interface DebateAgent {
  key: "progressive" | "conservative" | "omission";
  label: string;
  focus: string;
  icon: string; // Material Symbols icon name
  borderColor: string;
  iconColor: string;
}

interface DebateEngineProps {
  /** Optional override of the default three-voice setup. */
  agents?: DebateAgent[];
  /** The statement/article being analyzed. Shown in the panel header. */
  statement?: string;
  /** Width in px. Default 480. */
  width?: number;
  /** Height in px. Default 360. */
  height?: number;
}

const DEFAULT_AGENTS: DebateAgent[] = [
  {
    key: "progressive",
    label: "Progressive Node",
    focus: "Focus: Systemic Equality",
    icon: "eco",
    borderColor: colors.transparencyTeal,
    iconColor: colors.transparencyTeal,
  },
  {
    key: "conservative",
    label: "Conservative Node",
    focus: "Focus: Market Stability",
    icon: "account_balance",
    borderColor: "#444748",
    iconColor: "#444748",
  },
  {
    key: "omission",
    label: "Omission Analyst",
    focus: "Focus: Missing Data",
    icon: "visibility_off",
    borderColor: "#444748",
    iconColor: "#444748",
  },
];

/**
 * Multi-agent debate visualization — the core UI primitive that delivers
 * design brief position #2 (beat the single-AI-verdict problem).
 *
 * Layout: three circular nodes positioned in a triangle (top, bottom-left,
 * bottom-right) connected by SVG paths with stroke-dasharray pulse-line
 * animation. Hovering a node speeds up the moderator ring spin.
 *
 * The Material Symbols icons are loaded as a font, matching the new HTML
 * prototypes' icon usage.
 */
export default function DebateEngine({
  agents = DEFAULT_AGENTS,
  statement,
  width = 480,
  height = 360,
}: DebateEngineProps) {
  const [hovered, setHovered] = useState(false);

  // Triangle vertices in viewBox coordinates (100x80).
  // Top center: progressive. Bottom-left: conservative. Bottom-right: omission.
  const positions = [
    { x: 50, y: 14 },  // progressive — top
    { x: 18, y: 64 },  // conservative — bottom-left
    { x: 82, y: 64 },  // omission     — bottom-right
  ];

  // Pairwise connector paths (triangle edges).
  const edges: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 0],
  ];

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative border border-silver-grey bg-white"
        style={{ width, height }}
      >
        {/* Connector paths */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 80"
          preserveAspectRatio="none"
        >
          {edges.map(([a, b], i) => (
            <line
              key={i}
              className="pulse-line"
              x1={positions[a].x}
              y1={positions[a].y}
              x2={positions[b].x}
              y2={positions[b].y}
              stroke="#008080"
              strokeWidth="0.4"
            />
          ))}
          {/* Faint concentric rings around each node */}
          {positions.map((p, i) => (
            <circle
              key={`ring-${i}`}
              cx={p.x}
              cy={p.y}
              r={i === 0 ? 18 : 15}
              fill="none"
              stroke="#008080"
              strokeOpacity="0.12"
              strokeWidth="0.5"
            />
          ))}
        </svg>

        {/* Agent nodes */}
        {agents.map((agent, i) => (
          <div
            key={agent.key}
            className="absolute flex flex-col items-center"
            style={{
              left: `${positions[i].x}%`,
              top: `${positions[i].y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className="w-16 h-16 rounded-full border bg-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
              style={{
                borderColor: agent.borderColor,
                borderWidth: agent.key === "progressive" ? 2 : 1,
              }}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: agent.iconColor, fontSize: "24px" }}
              >
                {agent.icon}
              </span>
            </div>
            <div className="mt-3 text-center whitespace-nowrap">
              <span className="font-body text-[10px] font-bold uppercase tracking-widest text-deep-charcoal block">
                {agent.label}
              </span>
              <span className="font-body text-[9px] text-on-surface-variant block">
                {agent.focus}
              </span>
            </div>
          </div>
        ))}

        {/* Moderator center node — sits below the triangle midpoint */}
        <div
          className="absolute flex flex-col items-center"
          style={{
            left: "50%",
            top: "44%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className={`w-10 h-10 rounded-full bg-deep-charcoal flex items-center justify-center relative ${
              hovered ? "ring-spin-fast" : "ring-spin"
            }`}
            style={{ outline: "2px dashed #008080", outlineOffset: "2px" }}
          >
            <span className="material-symbols-outlined text-white" style={{ fontSize: "16px" }}>
              psychology
            </span>
          </div>
          <span className="mt-2 font-body text-[9px] font-bold uppercase tracking-widest text-deep-charcoal">
            Moderator
          </span>
        </div>
      </div>

      {statement && (
        <div className="mt-3 text-center font-body text-[11px] text-on-surface-variant italic">
          Active voices verifying "{statement.length > 60 ? statement.slice(0, 60) + "…" : statement}"
        </div>
      )}
    </div>
  );
}