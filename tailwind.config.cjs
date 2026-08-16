/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PRISM neo-brutalist theme — electric yellow canvas, black ink,
        // thick black outlines and hard offset shadows. Accent cards in
        // emerald green, hot pink and light blue. All semantic classes
        // (bg-surface, text-on-surface, border-silver-grey…) derive from
        // these tokens, so the whole app flips in one place.
        surface: '#ffe600',
        'surface-dim': '#f2d900',
        'surface-bright': '#fff44f',
        'surface-container-lowest': '#ffeb3b',
        'surface-container-low': '#fff9c4',
        'surface-container': '#ffffff',
        'surface-container-high': '#f7f7f7',
        'surface-container-highest': '#ececec',
        'on-surface': '#0a0a0a',
        'on-surface-variant': '#3d3d3d',
        'inverse-surface': '#0a0a0a',
        'on-inverse-surface': '#ffe600',
        outline: '#0a0a0a',
        'outline-variant': '#0a0a0a',
        surfaceTint: '#22c55e',
        primary: '#22c55e',
        'on-primary': '#ffffff',
        'primary-container': '#d1fae5',
        'on-primary-container': '#14532d',
        'inverse-primary': '#16a34a',
        secondary: '#ff4fd8',
        'on-secondary': '#ffffff',
        'secondary-container': '#ffd6f2',
        'on-secondary-container': '#7c0a5b',
        tertiary: '#4fc3f7',
        'on-tertiary': '#083a5c',
        'tertiary-container': '#e1f5fe',
        'on-tertiary-container': '#01579b',
        error: '#ef4444',
        'on-error': '#ffffff',
        'error-container': '#fee2e2',
        'on-error-container': '#7f1d1d',
        'primary-fixed': '#d1fae5',
        'primary-fixed-dim': '#86efac',
        'on-primary-fixed': '#14532d',
        'on-primary-fixed-variant': '#166534',
        'secondary-fixed': '#ffd6f2',
        'secondary-fixed-dim': '#ff9fe0',
        'on-secondary-fixed': '#7c0a5b',
        'on-secondary-fixed-variant': '#a21caf',
        'tertiary-fixed': '#e1f5fe',
        'tertiary-fixed-dim': '#a5e3fd',
        'on-tertiary-fixed': '#01579b',
        'on-tertiary-fixed-variant': '#0277bd',
        background: '#ffe600',
        'on-background': '#0a0a0a',
        'surface-variant': '#ffffff',
        'deep-charcoal': '#0a0a0a',
        'soft-white': '#ffffff',
        'silver-grey': '#0a0a0a',
        'transparency-teal': '#22c55e',
        // Playful arcade accents used directly in components
        'arcade-yellow': '#ffe600',
        'arcade-green': '#22c55e',
        'arcade-pink': '#ff4fd8',
        'arcade-blue': '#4fc3f7',
        'arcade-ink': '#0a0a0a',
      },
      boxShadow: {
        // Hard offset shadows — the neo-brutalist signature
        'brutal': '4px 4px 0 0 #0a0a0a',
        'brutal-sm': '3px 3px 0 0 #0a0a0a',
        'brutal-lg': '6px 6px 0 0 #0a0a0a',
        'brutal-hover': '2px 2px 0 0 #0a0a0a',
      },
      borderWidth: {
        // Chunky outlines for cards and panels
        'brutal': '2px',
        'brutal-thick': '3px',
      },
      fontFamily: {
        // Blocky display + chunky grotesk body (loaded in index.css)
        display: ['"Archivo Black"', 'system-ui', 'sans-serif'],
        body: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        'brutal': '-0.02em',
      },
    },
  },
  plugins: [],
}
