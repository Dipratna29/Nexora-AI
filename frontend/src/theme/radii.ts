/**
 * TrustTrip Design System — Border Radii
 * Soft, modern, refined curves.
 */

export const radius = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  xxl: 32,
  card: 20,
  button: 16,
  input: 14,
  pill: 9999,
} as const;

export type RadiusType = typeof radius;
export default radius;
