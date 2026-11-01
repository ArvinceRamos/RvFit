// Colour tokens, copied from the web app's src/app/globals.css (docs/UI-REFRESH.md).
// Dark is the default; light is the dark theme flipped. Fit Green (#AFFA00) is never text on a light
// background: light mode uses accentText (#3F6212) for green words.

export type ThemeName = "dark" | "light";

const dark = {
  page: "#161a18",
  card: "#222624",
  ink: "#fef9f5",
  muted: "#a3a3a3",
  line: "rgba(254,249,245,0.1)",
  track: "#363b38",
  accent: "#affa00",
  accentSoft: "#cfed89",
  accentText: "#affa00",
  onAccent: "#141a0f",
  warn: "#fbbf24",
  danger: "#f87171",
  field: "#1b1f1d",
  edge: "rgba(254,249,245,0.4)",
  selected: "rgba(175,250,0,0.12)",
  selectedEdge: "#affa00",
  warnBg: "rgba(251,191,36,0.12)",
  dangerBg: "rgba(248,113,113,0.12)",
  dangerEdge: "rgba(248,113,113,0.4)",
  dangerFill: "#f87171",
  onDanger: "#1f1414",
  btn2Bg: "rgba(34,38,36,0.5)",
  btn2Edge: "rgba(175,250,0,0.3)",
  focus: "#affa00",
  tile: "rgba(255,255,255,0.03)",
  glassEdge: "rgba(254,249,245,0.12)",
  successBg: "rgba(175,250,0,0.1)",
  successEdge: "rgba(175,250,0,0.35)",
  shadowCard: "0px 1px 2px rgba(8,12,10,0.35), 0px 12px 32px -16px rgba(8,12,10,0.55)",
  shadowFloat: "0px 24px 64px -24px rgba(8,12,10,0.7)",
  // Chart lines and fills (web: the weight chart's soft green fill).
  chartFill: "rgba(175,250,0,0.14)",
};

export type Palette = typeof dark;

const light: Palette = {
  ...dark,
  page: "#f3f5f1",
  card: "#ffffff",
  ink: "#1b1f1d",
  muted: "#525a55",
  line: "rgba(27,31,29,0.1)",
  track: "#e2e7df",
  accentText: "#3f6212",
  warn: "#92400e",
  danger: "#b91c1c",
  field: "#f7f8f5",
  edge: "rgba(27,31,29,0.5)",
  selected: "rgba(175,250,0,0.25)",
  selectedEdge: "#4d7c0f",
  warnBg: "rgba(245,158,11,0.12)",
  dangerBg: "rgba(220,38,38,0.08)",
  dangerEdge: "rgba(220,38,38,0.4)",
  dangerFill: "#b91c1c",
  onDanger: "#ffffff",
  btn2Bg: "rgba(255,255,255,0.55)",
  btn2Edge: "rgba(63,98,18,0.4)",
  focus: "#3f6212",
  tile: "rgba(27,31,29,0.03)",
  glassEdge: "rgba(27,31,29,0.08)",
  successBg: "rgba(77,124,15,0.1)",
  successEdge: "rgba(77,124,15,0.4)",
  shadowCard: "0px 0px 0px 1px rgba(27,31,29,0.05), 0px 1px 2px rgba(27,31,29,0.06), 0px 12px 32px -16px rgba(27,31,29,0.18)",
  shadowFloat: "0px 24px 64px -24px rgba(27,31,29,0.24)",
  chartFill: "rgba(77,124,15,0.14)",
};

export const palettes: Record<ThemeName, Palette> = { dark, light };

// Geist is the web app's typeface; Instrument Serif italic is the hero's one accent word.
export const fonts = {
  regular: "Geist_400Regular",
  medium: "Geist_500Medium",
  semibold: "Geist_600SemiBold",
  bold: "Geist_700Bold",
  serifItalic: "InstrumentSerif_400Regular_Italic",
  mono: "GeistMono",
};

// Radius: 12 for controls and tiles, 14 for buttons, 22 for cards (web design system AU-9).
export const radius = { control: 12, button: 14, buttonSm: 10, card: 22, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
