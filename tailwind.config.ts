import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#e8f1fb",
          100: "#d1e5f8",
          200: "#a3cbf1",
          300: "#74b0ea",
          400: "#4696e3",
          500: "#177bd8",
          600: "#0071e3",
          700: "#0064cc",
          800: "#0053a8",
          900: "#003d80",
        },
        apple: {
          "text-primary": "#1d1d1f",
          "text-secondary": "#6e6e73",
          "text-tertiary": "#86868b",
          "text-muted": "#aeaeb2",
          "bg-page": "#f5f5f7",
          "bg-card": "#ffffff",
          "bg-subtle": "#f2f2f7",
          "border-default": "#d2d2d7",
          "border-light": "#e8e8ed",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "SF Pro Text", "Helvetica Neue", "var(--font-inter)", "Arial", "sans-serif"],
      },
      fontSize: {
        display: ["34px", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        title: ["28px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        headline: ["17px", { lineHeight: "1.3" }],
        body: ["15px", { lineHeight: "1.5" }],
        caption: ["13px", { lineHeight: "1.4" }],
        footnote: ["11px", { lineHeight: "1.3" }],
      },
      boxShadow: {
        "apple-subtle": "0 1px 3px rgba(0,0,0,0.04)",
        "apple-sm": "0 1px 4px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
        "apple":    "0 2px 12px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.04)",
        "apple-lg": "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        "apple": "18px",
      },
      transitionDuration: {
        "200": "200ms",
      },
    }
  },
  plugins: []
};

export default config;
