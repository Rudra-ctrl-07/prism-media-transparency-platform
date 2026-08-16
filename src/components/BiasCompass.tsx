import React from "react";
import { biasAxes, colors, type BiasAxes } from "../design/tokens";

interface BiasCompassProps {
  axes: BiasAxes;
  size?: number;
  animated?: boolean;
}

/**
 * Standardized 3-axis radial bias compass.
 *
 * Per design brief position #4: avoid flattening every story into one
 * American political axis. Use a radial, multi-axis indicator that can
 * represent bias dimensions beyond one political spectrum.
 *
 * Three named, non-political axes (Emotion / Omission / Framing) — applied
 * uniformly across every page where bias is visualized. Replaces the
 * divergent label sets seen across the new HTML prototypes.
 *
 * Geometry: viewBox is 100x100 with center at (50,50). Reference rings at
 * r=15/30/45 (the inner three rings of the radar). Three axis lines at
 * 90°/30°/150° from center place the axes as: top = Emotion,
 * bottom-right = Framing, bottom-left = Omission.
 */
export default function BiasCompass({ axes, size = 220, animated = true }: BiasCompassProps) {
  const cx = 50;
  const cy = 50;

  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  // Convert 0-100 axis value to a point on its axis line.
  // r=45 is the outermost reference ring.
  const pointOnAxis = (axisIndex: number, value: number) => {
    // 0: top (Emotion, angle 270° in SVG terms = -90°)
    // 1: bottom-right (Framing, angle 30°)
    // 2: bottom-left (Omission, angle 150°)
    const angles = [-90, 30, 150];
    const angleDeg = angles[axisIndex];
    const angleRad = (angleDeg * Math.PI) / 180;
    const r = 45 * (clamp(value) / 100);
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    };
  };

  const points = biasAxes.map((_, i) => pointOnAxis(i, axes[biasAxes[i]]));
  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Label positions — outside the outermost ring.
  const labelPositions = [
    { x: 50, y: 4,  text: "Emotion",  anchor: "middle" as const }, // top
    { x: 95, y: 80, text: "Framing",  anchor: "end" as const    }, // bottom-right
    { x: 5,  y: 80, text: "Omission", anchor: "start" as const  }, // bottom-left
  ];

  return (
    <div className="inline-flex flex-col items-center">
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label="Bias Compass"
        className="overflow-visible"
      >
        {/* Reference rings */}
        {[15, 30, 45].map((r) => (
          <circle
            key={r}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#E0E0E0"
            strokeWidth="0.5"
          />
        ))}

        {/* Axis lines */}
        {[0, 1, 2].map((i) => {
          const angleRad = ([-90, 30, 150][i] * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + 45 * Math.cos(angleRad)}
              y2={cy + 45 * Math.sin(angleRad)}
              stroke="#E0E0E0"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={polygonPoints}
          fill={colors.transparencyTeal}
          fillOpacity={animated ? 0.4 : 0.5}
          stroke={colors.transparencyTeal}
          strokeWidth="1.5"
          style={{
            transition: "all 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="1.5"
            fill={colors.transparencyTeal}
          />
        ))}

        {/* Axis labels */}
        {labelPositions.map((lp, i) => (
          <text
            key={i}
            x={lp.x}
            y={lp.y}
            textAnchor={lp.anchor}
            fontSize="6"
            fontWeight="700"
            letterSpacing="0.05em"
            fill="#1a1c1c"
            style={{ textTransform: "uppercase" }}
          >
            {lp.text}
          </text>
        ))}
      </svg>
    </div>
  );
}