/**
 * TrustTrip Design System — Spacing Scale
 * Clean 4px grid system.
 */

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  screenPadding: 20,
} as const;

export type SpacingType = typeof spacing;
export default spacing;
