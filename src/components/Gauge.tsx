import React, { useEffect, useRef, useState } from "react";
import { GAUGE_CIRCUMFERENCE } from "../design/tokens";

interface GaugeProps {
  value: number; // 0-100
  size?: number; // px; default 128
  strokeWidth?: number; // default 8
  label?: string;
  animate?: boolean; // default true
  unit?: string; // "%" default
}

/**
 * Radial gauge — the "no dead badge" primitive.
 *
 * Per design brief position #1: every credibility score must be an animated,
 * filling arc, not a static pill. The arc uses stroke-dasharray + dashoffset
 * animation with IntersectionObserver so the fill only triggers when the
 * component is actually on screen. The numeric value is centered in EB
 * Garamond, reinforcing the "this is editorial" tone.
 */
export default function Gauge({
  value,
  size = 128,
  strokeWidth = 8,
  label = "PRISM SCORE",
  animate = true,
  unit = "%",
}: GaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const targetOffset = GAUGE_CIRCUMFERENCE * (1 - clamped / 100);
  const ref = useRef<SVGSVGElement | null>(null);
  const [inView, setInView] = useState(!animate);

  useEffect(() => {
    if (!animate || !ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animate]);

  return (
    <div
      className="relative inline-flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        ref={ref}
        className="radial-gauge"
        style={{
          width: size,
          height: size,
          transform: "rotate(-90deg)",
          strokeDashoffset: inView ? targetOffset : GAUGE_CIRCUMFERENCE,
        }}
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          fill="none"
          r="40"
          stroke="#0a0a0a"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="50"
          cy="50"
          fill="none"
          r="40"
          stroke="#22c55e"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-display text-[28px] leading-none font-medium text-deep-charcoal">
          {Math.round(clamped)}
          <span className="text-[18px] text-on-surface-variant">{unit}</span>
        </span>
        <span className="mt-1 font-body text-[10px] uppercase tracking-wider font-medium text-on-surface-variant">
          {label}
        </span>
      </div>
    </div>
  );
}