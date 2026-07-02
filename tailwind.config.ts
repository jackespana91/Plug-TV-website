import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(240 12% 5%)",
        foreground: "hsl(0 0% 96%)",
        card: "hsl(240 10% 8%)",
        border: "hsl(240 8% 16%)",
        muted: "hsl(240 6% 60%)",
        primary: {
          DEFAULT: "hsl(142 76% 48%)",
          foreground: "hsl(240 12% 5%)",
        },
        accent: {
          DEFAULT: "hsl(268 80% 62%)",
          foreground: "hsl(0 0% 100%)",
        },
        gold: "hsl(45 95% 55%)",
      },
      fontFamily: {
        display: ["'Bungee'", "system-ui", "sans-serif"],
        body: ["'Space Grotesk'", "system-ui", "sans-serif"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1", filter: "drop-shadow(0 0 12px hsl(142 76% 48% / 0.6))" },
          "50%": { opacity: "0.85", filter: "drop-shadow(0 0 28px hsl(142 76% 48% / 0.9))" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        float: "float 4s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        marquee: "marquee 24s linear infinite",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
