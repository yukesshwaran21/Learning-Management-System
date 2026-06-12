/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans:    ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Outfit", "Inter", "sans-serif"],
      },
      colors: {
        // Brand palette — indigo-violet gradient family
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        // Accent — violet
        accent: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        // Dark-mode surface palette
        surface: {
          900: "#0f0f13",
          800: "#18181f",
          700: "#24242e",
          600: "#2e2e3a",
          500: "#3a3a48",
        },
      },
      backgroundImage: {
        "hero-gradient":   "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)",
        "card-gradient":   "linear-gradient(145deg, #18181f, #24242e)",
        "brand-gradient":  "linear-gradient(90deg, #6366f1, #8b5cf6)",
      },
      boxShadow: {
        "glow-brand": "0 0 30px rgba(99,102,241,0.3)",
        "glow-sm":    "0 0 12px rgba(99,102,241,0.2)",
        "card-dark":  "0 4px 24px rgba(0,0,0,0.4)",
      },
      animation: {
        "fade-in":      "fadeIn 0.4s ease-out",
        "slide-up":     "slideUp 0.4s ease-out",
        "slide-in-right": "slideInRight 0.35s ease-out",
        "pulse-slow":   "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%":   { transform: "translateY(20px)", opacity: 0 },
          "100%": { transform: "translateY(0)",    opacity: 1 },
        },
        slideInRight: {
          "0%":   { transform: "translateX(20px)", opacity: 0 },
          "100%": { transform: "translateX(0)",    opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
