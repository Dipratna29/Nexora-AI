/**
 * TrustTrip Design System — Typography
 * Uses platform-native condensed bold styles for display headings and modern sans-serif for body.
 */

import { Platform, TextStyle } from "react-native";
import { colors } from "./colors";

const DISPLAY_FONT = Platform.select({
  android: "sans-serif-condensed",
  ios: "System",
  default: "System",
});

const BODY_FONT = Platform.select({
  android: "sans-serif",
  ios: "System",
  default: "System",
});

export const typography = {
  // Major Display Headings
  displayLarge: {
    fontFamily: DISPLAY_FONT,
    fontSize: 32,
    fontWeight: "800" as const,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  displayMedium: {
    fontFamily: DISPLAY_FONT,
    fontSize: 28,
    fontWeight: "800" as const,
    color: colors.textPrimary,
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  displaySmall: {
    fontFamily: DISPLAY_FONT,
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 30,
  },

  // Headings
  h1: {
    fontFamily: DISPLAY_FONT,
    fontSize: 28,
    fontWeight: "800" as const,
    color: colors.textPrimary,
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  h2: {
    fontFamily: DISPLAY_FONT,
    fontSize: 22,
    fontWeight: "700" as const,
    color: colors.textPrimary,
    letterSpacing: -0.2,
    lineHeight: 28,
  },
  h3: {
    fontFamily: BODY_FONT,
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  h4: {
    fontFamily: BODY_FONT,
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.textPrimary,
    lineHeight: 22,
  },

  // Body Text
  bodyLg: {
    fontFamily: BODY_FONT,
    fontSize: 16,
    fontWeight: "400" as const,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  body: {
    fontFamily: BODY_FONT,
    fontSize: 14,
    fontWeight: "400" as const,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bodySm: {
    fontFamily: BODY_FONT,
    fontSize: 12,
    fontWeight: "400" as const,
    color: colors.textMuted,
    lineHeight: 17,
  },

  // UI Labels & Controls
  label: {
    fontFamily: BODY_FONT,
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textPrimary,
  },
  labelSm: {
    fontFamily: BODY_FONT,
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  caption: {
    fontFamily: BODY_FONT,
    fontSize: 11,
    fontWeight: "500" as const,
    color: colors.textMuted,
    lineHeight: 15,
  },
  button: {
    fontFamily: DISPLAY_FONT,
    fontSize: 15,
    fontWeight: "700" as const,
    letterSpacing: 0.2,
  },
} as const;

export type TypographyType = typeof typography;
export default typography;
