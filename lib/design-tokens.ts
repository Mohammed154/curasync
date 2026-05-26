// ─── CuraSync Design Tokens ─────────────────────────────────────────────────
// Exact values from Design Language & UI Specification Document §11
// Source of truth — import this everywhere, do not hardcode hex values

export const colors = {
  bg: {
    dark: "#0A0A0A",
    light: "#F4F4F6",
    card: "#FFFFFF",
    cardLavender: "#F0EFF8",
    cardMint: "#E6FAF9",
  },
  accent: {
    violet: "#6C5CE7",
    lavender: "#A29BFE",
    pink: "#E84393",
    mint: "#00CEC9",
  },
  text: {
    primary: "#1A1A2E",
    secondary: "#4A4A68",
    tertiary: "#8888A8",
    inverse: "#FFFFFF",
  },
  status: {
    green: "#00B894",
    amber: "#FDCB6E",
    red: "#D63031",
    greenBg: "#E8F8F5",
    amberBg: "#FEF9E7",
    redBg: "#FDECEA",
  },
  star: "#F8B400",
  divider: "#E2E0F0",
} as const;

export const radius = {
  sm: "8px",
  md: "14px",
  lg: "16px",
  xl: "20px",
  full: "9999px",
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "32px",
} as const;

export const typography = {
  fontFamily: "'Plus Jakarta Sans', 'SF Pro Display', system-ui, sans-serif",
  sizes: {
    display: "clamp(32px, 5vw, 40px)",
    titleLg: "clamp(20px, 3vw, 24px)",
    titleMd: "clamp(16px, 2.5vw, 20px)",
    body: "15px",
    label: "13px",
    metricXl: "clamp(26px, 4vw, 32px)",
    nav: "11px",
  },
} as const;

// ─── Condition colour map ────────────────────────────────────────────────────
export const conditionColors: Record<
  string,
  { accent: string; bg: string; emoji: string; label: string }
> = {
  diabetes_t2: {
    accent: colors.accent.mint,
    bg: colors.bg.cardMint,
    emoji: "🩸",
    label: "Type 2 Diabetes",
  },
  diabetes_t1: {
    accent: colors.accent.mint,
    bg: colors.bg.cardMint,
    emoji: "🩸",
    label: "Type 1 Diabetes",
  },
  hypertension: {
    accent: colors.accent.pink,
    bg: colors.bg.cardLavender,
    emoji: "💉",
    label: "Hypertension",
  },
  ckd: {
    accent: colors.accent.lavender,
    bg: colors.bg.cardLavender,
    emoji: "🫘",
    label: "Chronic Kidney Disease",
  },
  copd: {
    accent: "#74B9FF",
    bg: "#EBF5FB",
    emoji: "🫁",
    label: "COPD",
  },
  chf: {
    accent: colors.accent.pink,
    bg: colors.bg.cardLavender,
    emoji: "❤️",
    label: "Heart Failure",
  },
  cad: {
    accent: colors.accent.pink,
    bg: colors.bg.cardLavender,
    emoji: "🫀",
    label: "Coronary Artery Disease",
  },
  hypothyroidism: {
    accent: "#FDCB6E",
    bg: "#FEF9E7",
    emoji: "🦋",
    label: "Hypothyroidism",
  },
  ra: {
    accent: colors.accent.violet,
    bg: "#F0EFF8",
    emoji: "🦴",
    label: "Rheumatoid Arthritis",
  },
  asthma: {
    accent: "#74B9FF",
    bg: "#EBF5FB",
    emoji: "💨",
    label: "Asthma",
  },
};
