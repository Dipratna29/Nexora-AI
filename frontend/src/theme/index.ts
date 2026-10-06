/**
 * TrustTrip Design System — Theme Entry Point
 */

import colors from "./colors";
import typography from "./typography";
import spacing from "./spacing";
import radius from "./radii";
import shadows from "./shadows";
import icons from "./icons";

export { colors, typography, spacing, radius, shadows, icons };

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  icons,
} as const;

export type ThemeType = typeof theme;
export default theme;
