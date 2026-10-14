import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#13263D", 700: "#1E3A5A", 500: "#40566F", 300: "#8496AA" },
        teal: { DEFAULT: "#0B7A75", 600: "#096A66", 700: "#075A56", 100: "#DDF2F0", 50: "#F0F9F8" },
        amber: { DEFAULT: "#B45309", 100: "#FEF3C7" },
        danger: { DEFAULT: "#B42318", 100: "#FEE4E2" },
        ok: { DEFAULT: "#067647", 100: "#DCFAE6" },
        mute: { DEFAULT: "#5B6B7C", 100: "#EEF2F6" },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        tamil: ["var(--font-tamil)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl: "14px", "2xl": "20px" },
    },
  },
  plugins: [],
} satisfies Config;
