import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F0D1C",
          soft: "#14122400",
        },
        bg: "#100E1F",
        surface: "#1B1730",
        raised: "#241F3D",
        line: "#332C55",
        accent: {
          DEFAULT: "#FFD23F",
          soft: "#FFE38A",
        },
        violet: {
          DEFAULT: "#8B7FFF",
          soft: "#B4ACFF",
          deep: "#5B4FD9",
        },
        mint: "#4ADE9E",
        coral: "#FF6B6B",
        text: {
          DEFAULT: "#F7F5FF",
          muted: "#9891B8",
          faint: "#66608A",
        },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        hand: ["var(--font-caveat)", "cursive"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      backgroundImage: {
        "grain": "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)",
        "glow-violet": "radial-gradient(60% 60% at 50% 0%, rgba(139,127,255,0.25) 0%, rgba(139,127,255,0) 70%)",
        "glow-accent": "radial-gradient(60% 60% at 50% 100%, rgba(255,210,63,0.15) 0%, rgba(255,210,63,0) 70%)",
      },
      boxShadow: {
        card: "0 30px 60px -20px rgba(0,0,0,0.5)",
        "card-hover": "0 40px 80px -20px rgba(0,0,0,0.65)",
        glow: "0 0 0 1px rgba(255,210,63,0.4), 0 0 30px rgba(255,210,63,0.15)",
      },
      keyframes: {
        "fan-in": {
          "0%": { opacity: "0", transform: "translateY(24px) rotate(0deg)" },
          "100%": { opacity: "1", transform: "translateY(0) rotate(var(--rot))" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "underline-grow": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fan-in": "fan-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        float: "float 6s ease-in-out infinite",
        "underline-grow": "underline-grow 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
};
export default config;

