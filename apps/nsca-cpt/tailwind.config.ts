import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // スコアボード風のアクセント（力強いライム）
        accent: {
          DEFAULT: "#a3e635",
          soft: "#bef264",
          strong: "#84cc16",
        },
        surface: {
          light: "#ffffff",
          dark: "#0b0f14",
        },
      },
      fontFamily: {
        // 数字を大きく見せるためのカウンター用
        counter: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.18s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
