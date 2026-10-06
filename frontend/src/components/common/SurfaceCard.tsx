import React, { ReactNode } from "react";
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { colors, radius, shadows } from "../../theme";

export interface SurfaceCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: "default" | "elevated" | "highlight" | "danger" | "interactive" | "cream";
  glow?: boolean;
  activeOpacity?: number;
}

/**
 * TrustTrip SurfaceCard
 * Sleek card container with dark surface (#202032), subtle border, and refined curvature.
 */
export default function SurfaceCard({
  children,
  style,
  onPress,
  variant = "default",
  glow = false,
  activeOpacity = 0.85,
}: SurfaceCardProps) {
  const getBackgroundColor = () => {
    switch (variant) {
      case "elevated":
        return colors.surfaceElevated;
      case "highlight":
        return colors.surfaceHighlight;
      case "danger":
        return colors.dangerSurface;
      case "interactive":
        return colors.surfaceElevated;
      case "cream":
        return colors.creamSurface;
      default:
        return colors.surface;
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case "danger":
        return colors.borderDanger;
      case "cream":
        return "rgba(251, 226, 180, 0.25)";
      case "interactive":
        return colors.primaryBorder;
      default:
        return glow ? colors.borderGlow : colors.border;
    }
  };

  const cardStyles: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: getBackgroundColor(),
      borderColor: getBorderColor(),
    },
    glow && shadows.glowPrimary,
    variant === "danger" && shadows.glowDanger,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        style={cardStyles}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
    ...shadows.cardSoft,
  },
});
