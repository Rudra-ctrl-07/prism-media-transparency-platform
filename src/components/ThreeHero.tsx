import React, { useMemo } from "react";

interface ThreeHeroProps {
  /** Number of dots. Default 60. */
  nodeCount?: number;
  /** Opacity of the whole layer. Default 0.15. */
  opacity?: number;
}

/**
 * CSS-only ambient network — the no-dependency replacement for the
 * standalone three.js file in new_ui/three.js/code.html (which had a
 * duplicate `const container` declaration that prevented the scene from
 * building).
 *
 * Renders a deterministic layout of dots + hairline connector lines so
 * the visual is stable across re-renders. Used as the background layer
 * behind the landing-page hero copy. `pointer-events: none` so it never
 * interferes with foreground interaction.
 */
export default function ThreeHero({ nodeCount = 60, opacity = 0.15 }: ThreeHeroProps) {
  // Deterministic seeded RNG so the layout is stable.
  const rng = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  };

  const layout = useMemo(() => {
    const rand = rng(42);
    const nodes = Array.from({ length: nodeCount }).map(() => ({
      x: rand() * 100,
      y: rand() * 100,
      teal: rand() > 0.6,
      delay: rand() * 30,
    }));

    // Connect nearby nodes (distance threshold in viewBox %).
    const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < 14) {
          edges.push({
            x1: nodes[i].x,
            y1: nodes[i].y,
            x2: nodes[j].x,
            y2: nodes[j].y,
          });
        }
      }
    }

    return { nodes, edges };
  }, [nodeCount]);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ opacity, zIndex: 0 }}
      aria-hidden
    >
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {layout.edges.map((e, i) => (
          <line
            key={`edge-${i}`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="#008080"
            strokeWidth="0.05"
            strokeOpacity="0.5"
          />
        ))}
        {layout.nodes.map((n, i) => (
          <circle
            key={`node-${i}`}
            cx={n.x}
            cy={n.y}
            r="0.4"
            fill={n.teal ? "#008080" : "#444748"}
            fillOpacity="0.8"
          />
        ))}
      </svg>
    </div>
  );
}