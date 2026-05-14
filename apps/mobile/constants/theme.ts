// Design System: "High-Performance Zen" — obsidian dark, violet primary, cyan accent
export const colors = {
  // Canvas layers
  bg:               "#050508",
  surface:          "#13121b",
  card:             "#0d0d14",
  elevated:         "#13131f",
  surfaceContainer: "#1f1f28",
  surfaceHigh:      "#2a2933",
  surfaceHighest:   "#35343e",
  surfaceLow:       "#1b1b24",
  surfaceLowest:    "#0e0d16",

  // Text
  text:             "#e4e1ee",
  textVariant:      "#c7c4d8",

  // Primary — lavender violet
  primary:            "#c4c0ff",
  primaryContainer:   "#8781ff",
  onPrimary:          "#2000a4",
  onPrimaryContainer: "#1b0091",

  // Secondary — cyan
  secondary:          "#a2e7ff",
  secondaryContainer: "#00d2fd",

  // Tertiary — amber/orange
  tertiary:           "#ffb785",
  tertiaryContainer:  "#db761f",

  // Semantic
  error:          "#ffb4ab",
  errorContainer: "#93000a",
  success:        "#00e5a0",
  warning:        "#ffb800",

  // Borders
  border:         "rgba(255,255,255,0.08)",
  borderLight:    "rgba(255,255,255,0.14)",
  outline:        "#918fa1",
  outlineVariant: "#464555",

  // Nav
  tabbar: "#080810",
} as const;

export const gradients = {
  // Violet → deep blue — used for CTAs on splash/auth
  brand:    ["#6c63ff", "#3622ca"] as const,
  // Lavender → purple — used for streak banners, progress fills
  primary:  ["#c4c0ff", "#8781ff"] as const,
  // Deep indigo → lavender — tutor earnings card
  earnings: ["#4f44e2", "#c4c0ff"] as const,
} as const;

export const typography = {
  largeTitle: { fontSize: 34, fontWeight: "700" as const, lineHeight: 41, letterSpacing: -0.5 },
  title1:     { fontSize: 28, fontWeight: "700" as const, lineHeight: 34, letterSpacing: -0.4 },
  title2:     { fontSize: 22, fontWeight: "600" as const, lineHeight: 28, letterSpacing: -0.3 },
  title3:     { fontSize: 20, fontWeight: "600" as const, lineHeight: 25, letterSpacing: -0.2 },
  body:       { fontSize: 17, fontWeight: "400" as const, lineHeight: 22, letterSpacing: -0.1 },
  captionMono:{ fontSize: 12, fontWeight: "500" as const, lineHeight: 16, letterSpacing: 0.5 },
} as const;

export const shadows = {
  card: {
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius:  16,
    elevation:     16,
  },
  glow: {
    shadowColor:   "#6c63ff",
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius:  20,
    elevation:     12,
  },
  glowPrimary: {
    shadowColor:   "#c4c0ff",
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius:  32,
    elevation:     12,
  },
  button: {
    shadowColor:   "#6c63ff",
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius:  32,
    elevation:     8,
  },
} as const;

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 9999,
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
} as const;

export const TAB_BAR_HEIGHT = 83;
export const HORIZONTAL_PAD = 16;
