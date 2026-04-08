import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          /* CJK (Chinese, Japanese, Korean) */
          "Noto Sans CJK SC",
          "PingFang SC",
          "Hiragino Sans",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          /* Arabic + Devanagari */
          "Noto Sans Arabic",
          "Noto Sans Devanagari",
          /* System fallbacks */
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "var(--font-display)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        // Brand — clinical blue → calming teal
        brand: {
          50:  "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6", // primary
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        accent: {
          50:  "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#14B8A6", // teal
          600: "#0D9488",
          700: "#0F766E",
        },
        // Semantic
        success: { 500: "#22C55E", 600: "#16A34A" },
        warning: { 500: "#F59E0B", 600: "#D97706" },
        danger:  { 500: "#EF4444", 600: "#DC2626" },
        // Surface tiers (driven by CSS vars so they flip with dark mode)
        surface: {
          0:  "rgb(var(--surface-0) / <alpha-value>)",
          1:  "rgb(var(--surface-1) / <alpha-value>)",
          2:  "rgb(var(--surface-2) / <alpha-value>)",
          3:  "rgb(var(--surface-3) / <alpha-value>)",
        },
        ink: {
          base:    "rgb(var(--ink-base) / <alpha-value>)",
          muted:   "rgb(var(--ink-muted) / <alpha-value>)",
          subtle:  "rgb(var(--ink-subtle) / <alpha-value>)",
          inverse: "rgb(var(--ink-inverse) / <alpha-value>)",
        },
        line: "rgb(var(--line) / <alpha-value>)",
        slate: {
          50:  "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#0B1220",
        },
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #3B82F6 0%, #14B8A6 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(20,184,166,0.12) 100%)",
        "dark-app":
          "radial-gradient(1200px 800px at 10% -10%, rgba(59,130,246,0.12), transparent 60%), radial-gradient(1000px 600px at 110% 10%, rgba(20,184,166,0.10), transparent 60%), linear-gradient(180deg, #0B1220 0%, #0E1627 100%)",
        "light-app":
          "radial-gradient(1200px 800px at 10% -10%, rgba(59,130,246,0.08), transparent 60%), radial-gradient(1000px 600px at 110% 10%, rgba(20,184,166,0.06), transparent 60%), linear-gradient(180deg, #F7F9FB 0%, #F1F5F9 100%)",
      },
      boxShadow: {
        "soft":    "0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.06)",
        "card":    "0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.08)",
        "glow":    "0 0 0 1px rgba(59,130,246,0.24), 0 12px 40px -12px rgba(59,130,246,0.45)",
        "danger-glow": "0 0 0 1px rgba(239,68,68,0.28), 0 8px 32px -8px rgba(239,68,68,0.55)",
      },
      animation: {
        "bounce":       "bounce 1s infinite",
        "fade-up":      "fadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in":      "fadeIn 0.4s ease-out both",
        "shimmer":      "shimmer 2.2s linear infinite",
        "pulse-ring":   "pulseRing 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-soft":   "pulseSoft 2.2s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseRing: {
          "0%":   { boxShadow: "0 0 0 0 rgba(239,68,68,0.55)" },
          "70%":  { boxShadow: "0 0 0 14px rgba(239,68,68,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(239,68,68,0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.7" },
        },
        bounce: {
          "0%, 100%": {
            transform: "translateY(-25%)",
            animationTimingFunction: "cubic-bezier(0.8, 0, 1, 1)",
          },
          "50%": {
            transform: "translateY(0)",
            animationTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
          },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
