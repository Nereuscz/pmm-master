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
          50: "#eef9ff",
          100: "#d9f0ff",
          600: "#0087c7",
          700: "#006d9f",
          900: "#0c2b3a"
        }
      }
    }
  },
  plugins: []
};

export default config;
