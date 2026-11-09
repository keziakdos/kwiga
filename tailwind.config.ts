import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        board: {
          DEFAULT: "#14532d",
          deep: "#0f3d22",
          soft: "#166534",
          line: "#1f6b3a",
        },
        paper: {
          DEFAULT: "#faf6ec",
          dark: "#f2ecdd",
          line: "#e2d9c2",
        },
        ink: {
          DEFAULT: "#233028",
          soft: "#4b5a50",
          faint: "#7c8a80",
        },
        accent: {
          yellow: "#f4c430",
          coral: "#ef7a5a",
        },
        slate: {
          deep: "#0f172a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.06), 0 12px 32px -12px rgba(15,23,42,0.18)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
