import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cherry: {
          red: "#ff4d6d",
          green: "#34d399",
          bg: "#0b1021",
          surface: "#111a2f",
          border: "#1b2645",
          text: "#eef2fb",
        },
      },
      spacing: {
        1: "0.25rem",
        "1.5": "0.375rem",
        2: "0.5rem",
        "2.5": "0.625rem",
        3: "0.75rem",
        4: "1rem",
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
      },
    },
  },
  plugins: [],
};

export default config;
