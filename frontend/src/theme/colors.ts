/**
 * TrustTrip Design System — Color Palette
 * Reference: Dark Premium (#131321), Primary Turquoise (#46F0D2), Warm Cream (#FBE2B4).
 */

export const colors = {
  // Backgrounds
  background: "#131321",
  backgroundSecondary: "#191927",
  backgroundDeep: "#0E0E1A",
  backgroundDark: "#131321",
  backgroundNavy: "#191927",

  // Surfaces
  surface: "#202032",
  surfaceElevated: "#27273A",
  surfaceHighlight: "#303047",
  surfaceGlass: "rgba(32, 32, 50, 0.88)",
  surfaceGlassElevated: "rgba(39, 39, 58, 0.94)",

  // Primary Turquoise Brand Accents
  primary: "#46F0D2",
  primaryDark: "#2BC9B0",
  primaryLight: "#71F4DE",
  primaryGlow: "rgba(70, 240, 210, 0.15)",
  electricBlue: "#46F0D2", // Map legacy alias to primary turquoise
  brightBlue: "#46F0D2",
  cyanGlow: "#46F0D2",

  // Secondary Warm Cream Accents
  cream: "#FBE2B4",
  creamDark: "#E5C895",
  creamSurface: "rgba(251, 226, 180, 0.12)",
  violet: "#FBE2B4", // Map legacy secondary to warm cream
  purple: "#FBE2B4",
  lavenderGlow: "rgba(251, 226, 180, 0.20)",

  // Neutrals & Base
  white: "#FFFFFF",
  black: "#000000",

  // Typography & Text
  textPrimary: "#FFFFFF",
  textSecondary: "#A9A9BC",
  textMuted: "#707085",
  textAccent: "#46F0D2",
  textInverse: "#131321",

  // Borders & Dividers
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.08)",
  borderGlass: "rgba(255, 255, 255, 0.10)",
  primaryBorder: "rgba(70, 240, 210, 0.20)",
  borderGlow: "rgba(70, 240, 210, 0.25)",
  borderDanger: "rgba(255, 83, 100, 0.35)",

  // Status & Safety Semantics
  success: "#46F0D2",
  successSurface: "rgba(70, 240, 210, 0.12)",
  warning: "#FBE2B4",
  warningSurface: "rgba(251, 226, 180, 0.12)",
  danger: "#FF5364", // Strictly reserved for Emergency SOS & danger
  dangerGlow: "#FF2A4D",
  dangerSurface: "rgba(255, 83, 100, 0.14)",
  info: "#79A7FF",
  infoSurface: "rgba(121, 167, 255, 0.12)",
} as const;

export type ColorsType = typeof colors;
export default colors;
