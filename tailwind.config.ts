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
          50:  "#F7F0FE",
          100: "#EBD9FC",
          200: "#D5B0F8",
          300: "#BA7EF2",
          400: "#9C4AE8",
          500: "#7C1FD4",
          600: "#640ABA",
          700: "#5B14B3",
          800: "#502882",
          900: "#3A1A6B",
        },
        gold: {
          50:  "#FFF9E8",
          100: "#FEF0C4",
          200: "#fee9af",
          300: "#FED875",
          400: "#FFCC50",
          500: "#F5B800",
          600: "#D4A006",
          700: "#A07800",
          800: "#6B5000",
          900: "#3D2E00",
        },
        apple: {
          "text-primary": "#1C1826",
          "text-secondary": "#5A5B6C",
          "text-tertiary": "#8A8696",
          "text-muted": "#B0ACB8",
          "bg-page": "#F6F4F8",
          "bg-card": "#FFFFFF",
          "bg-subtle": "#EEEAF3",
          "border-default": "#DFDCE5",
          "border-light": "#EBEAF0",
        },
        semantic: {
          "danger":       "#D40511",
          "danger-hover":  "#B5040E",
          "danger-bg":    "#FEF0F0",
          "danger-text":   "#A00310",
          "warning":      "#D4A006",
          "warning-bg":   "#FEF8EC",
          "warning-text":  "#7A5800",
          "success":      "#025A3C",
          "success-bg":   "#E8F5EE",
          "success-text":  "#014A31",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Helvetica Neue", "Arial", "sans-serif"],
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
        "apple-subtle": "0 1px 2px rgba(0,0,0,0.03)",
        "apple-sm": "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
        "apple":    "0 1px 6px rgba(0,0,0,0.05), 0 2px 12px rgba(0,0,0,0.03)",
        "apple-lg": "0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      },
      borderRadius: {
        "apple": "12px",
      },
      transitionDuration: {
        "200": "200ms",
      },
    }
  },
  plugins: []
};

export default config;
