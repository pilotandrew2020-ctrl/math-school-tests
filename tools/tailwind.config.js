/** Сборка: см. tools/README.md. Tailwind собирается локально в assets/tailwind.css (без CDN). */
module.exports = {
  content: ['../index.html'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#04060c', 900: '#070b14', 800: '#0b1220', 700: '#111a2e', 600: '#1a2540' },
        neon: { cyan: '#22d3ee', violet: '#a78bfa', pink: '#f472b6', lime: '#a3e635', amber: '#fbbf24' },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 28px rgba(34,211,238,.28)',
        'glow-v': '0 0 28px rgba(167,139,250,.30)',
      },
    },
  },
  plugins: [],
};
