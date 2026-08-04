/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: {
          950: "#07080d",
          900: "#0b0d14",
          850: "#10131d",
          800: "#151926",
          700: "#1e2434",
          600: "#2a3248",
        },
        brand: {
          400: "#8b5cf6",
          500: "#7c3aed",
          600: "#6d28d9",
        },
        accent: {
          mint: "#34d399",
          amber: "#fbbf24",
          rose: "#fb7185",
          sky: "#38bdf8",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(124, 58, 237, 0.35)",
        card: "0 4px 20px rgba(0, 0, 0, 0.35)",
      },
      animation: {
        "fade-up": "fadeUp 0.35s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
        pop: "pop 0.25s ease-out both",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        pop: {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
