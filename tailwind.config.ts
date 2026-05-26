import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── Colours: CuraSync Design Doc §11 ──────────────────────────────
      colors: {
        bg: {
          dark:    "#0A0A0A",
          light:   "#F4F4F6",
          card:    "#FFFFFF",
          lavender:"#F0EFF8",
          mint:    "#E6FAF9",
        },
        accent: {
          violet:  "#6C5CE7",
          lavender:"#A29BFE",
          pink:    "#E84393",
          mint:    "#00CEC9",
        },
        text: {
          primary:  "#1A1A2E",
          secondary:"#4A4A68",
          tertiary: "#8888A8",
          inverse:  "#FFFFFF",
        },
        status: {
          green:    "#00B894",
          amber:    "#FDCB6E",
          red:      "#D63031",
          // background variants — used as bg-status-green-bg etc.
          "green-bg": "#E8F8F5",
          "amber-bg": "#FEF9E7",
          "red-bg":   "#FDECEA",
        },
        divider: "#E2E0F0",
      },

      // ── Border radius ────────────────────────────────────────────────────
      borderRadius: {
        sm:   "8px",
        md:   "14px",
        lg:   "16px",
        xl:   "20px",
        full: "9999px",
      },

      // ── Typography ───────────────────────────────────────────────────────
      fontFamily: {
        sans: ["Plus Jakarta Sans", "SF Pro Display", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        // Custom scale — avoids colliding with Tailwind's built-in `text-sm`, `text-xs` etc.
        "display":    ["clamp(32px,5vw,40px)",  { lineHeight: "1.15" }],
        "title-lg":   ["clamp(20px,3vw,24px)",  { lineHeight: "1.2"  }],
        "title-md":   ["clamp(16px,2.5vw,20px)",{ lineHeight: "1.3"  }],
        "body-md":    ["15px",                   { lineHeight: "1.5"  }],
        "label-sm":   ["13px",                   { lineHeight: "1.4"  }],
        "metric-xl":  ["clamp(26px,4vw,32px)",   { lineHeight: "1.15" }],
        "nav-xs":     ["11px",                   { lineHeight: "1.4"  }],
      },

      // ── Spacing extras ───────────────────────────────────────────────────
      spacing: {
        "4xs": "2px",
        "3xs": "4px",
        "2xs": "6px",
      },

      // ── Shadows ──────────────────────────────────────────────────────────
      boxShadow: {
        card:         "0 4px 16px rgba(108,92,231,0.08)",
        "card-hover": "0 8px 32px rgba(108,92,231,0.14)",
        "alert-red":  "0 4px 16px rgba(214,48,49,0.16)",
        "alert-amber":"0 4px 16px rgba(253,203,110,0.20)",
      },

      // ── Animations ───────────────────────────────────────────────────────
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-in":    "ccFadeIn 0.4s ease-out both",
        "slide-up":   "ccSlideUp 0.4s ease-out both",
      },
      keyframes: {
        ccFadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        ccSlideUp: {
          "0%":   { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
