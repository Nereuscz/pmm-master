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
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        "apple-sm": "0 1px 4px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
        "apple":    "0 2px 12px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.04)",
        "apple-lg": "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        "apple": "18px",
      },
    }
  },
  plugins: []
};

export default config;
