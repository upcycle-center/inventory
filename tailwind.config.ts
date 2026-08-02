import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1f2937",
          gold: "#c9a227",
        },
      },
    },
  },
  plugins: [],
};

export default config;
