// PRISM design tokens — extracted from new_ui/*/code.html and
// new_ui/prism_premium_editorial/DESIGN.md. Single source of truth for every
// component to keep the editorial look consistent across pages.

export const colors = {
  transparencyTeal: "#008080",
  deepCharcoal: "#121212",
  softWhite: "#F9F9F9",
  silverGrey: "#E0E0E0",
  error: "#ba1a1a",
  onSurface: "#1a1c1c",
  onSurfaceVariant: "#444748",
} as const;

export const spacing = {
  sectionGap: "8rem",
  gutter: "2rem",
  marginPage: "4rem",
  marginMobile: "1.5rem",
  elementGap: "1rem",
} as const;

// Typography — serif for story (EB Garamond), sans for system (Hanken Grotesk).
export const fontFamilies = {
  ebGaramond: '"EB Garamond", serif',
  hankenGrotesk: '"Hanken Grotesk", system-ui, sans-serif',
} as const;

export const typography = {
  headlineDisplay: {
    family: fontFamilies.ebGaramond,
    size: "64px",
    lineHeight: "1.1",
    letterSpacing: "-0.02em",
    weight: 500,
  },
  headlineLg: {
    family: fontFamilies.ebGaramond,
    size: "40px",
    lineHeight: "1.2",
    weight: 500,
  },
  headlineLgMobile: {
    family: fontFamilies.ebGaramond,
    size: "32px",
    lineHeight: "1.2",
    weight: 500,
  },
  headlineMd: {
    family: fontFamilies.ebGaramond,
    size: "28px",
    lineHeight: "1.3",
    weight: 500,
  },
  bodyLg: {
    family: fontFamilies.hankenGrotesk,
    size: "20px",
    lineHeight: "1.6",
    weight: 400,
  },
  bodyMd: {
    family: fontFamilies.hankenGrotesk,
    size: "16px",
    lineHeight: "1.6",
    weight: 400,
  },
  labelMd: {
    family: fontFamilies.hankenGrotesk,
    size: "14px",
    lineHeight: "1.4",
    letterSpacing: "0.05em",
    weight: 600,
  },
  labelSm: {
    family: fontFamilies.hankenGrotesk,
    size: "12px",
    lineHeight: "1.4",
    letterSpacing: "0.02em",
    weight: 500,
  },
} as const;

// Standardized Bias Compass axes — applied uniformly on every page where
// bias is visualized, replacing the divergent labels seen across the new
// HTML prototypes (Liberal/Conservative/Emotional/Factual on the verification
// report, etc). Three named, non-political dimensions per design brief.
export const biasAxes = ["Emotion", "Omission", "Framing"] as const;
export type BiasAxis = (typeof biasAxes)[number];

export type BiasAxes = Record<BiasAxis, number>;

// Radial-gauge circumference for r=40 (the size used across the new HTMLs):
//   2 * π * 40 = 251.327...
// Truncated to 251.2 in the source designs. Use this constant everywhere.
export const GAUGE_CIRCUMFERENCE = 251.2;