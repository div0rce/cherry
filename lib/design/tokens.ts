export const tokens = {
  colors: {
    red: "#ff4d6d",
    green: "#34d399",
    bg: "#0b1021",
    surface: "#111a2f",
    border: "#1b2645",
    text: "#eef2fb",
  },
  spacing: {
    1: "0.25rem",
    1.5: "0.375rem",
    2: "0.5rem",
    2.5: "0.625rem",
    3: "0.75rem",
    4: "1rem",
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
  },
} as const;

export type DesignTokens = typeof tokens;
