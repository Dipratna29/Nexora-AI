import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, typography, radius } from "../../theme";

interface StatusGaugeProps {
  label: string;
  value: string;
  status: "active" | "ready" | "warning" | "danger" | "offline";
  size?: number;
  strokeWidth?: number;
  sublabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatusGauge({
  label,
  value,
  status,
  size = 76,
  strokeWidth = 5,
  sublabel,
  style,
}: StatusGaugeProps) {
  const radiusVal = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radiusVal;

  const getColor = () => {
    switch (status) {
      case "active":
      case "ready":
        return colors.success;
      case "warning":
        return colors.warning;
      case "danger":
        return colors.danger;
      case "offline":
      default:
        return colors.textMuted;
    }
  };

  const ringColor = getColor();

  return (
    <View style={[styles.gaugeContainer, style]}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size}>
          {/* Background Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radiusVal}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Active Ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radiusVal}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference * 0.85} ${circumference}`}
            strokeLinecap="round"
            fill="transparent"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>

        <View style={styles.gaugeCenterText}>
          <Text style={[styles.gaugeValue, { color: ringColor }]}>{value}</Text>
          {sublabel && <Text style={styles.gaugeSublabel}>{sublabel}</Text>}
        </View>
      </View>

      <Text style={styles.gaugeLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

interface StatusBadgeProps {
  label: string;
  status?: "active" | "ready" | "warning" | "danger" | "offline" | "moderate";
  dotColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatusBadge({ label, status = "active", dotColor, style }: StatusBadgeProps) {
  const getColors = () => {
    switch (status) {
      case "active":
      case "ready":
        return { bg: colors.successSurface, border: colors.primaryBorder, dot: colors.success };
      case "warning":
      case "moderate":
        return { bg: colors.warningSurface, border: "rgba(251, 226, 180, 0.25)", dot: colors.warning };
      case "danger":
        return { bg: colors.dangerSurface, border: colors.borderDanger, dot: colors.danger };
      case "offline":
      default:
        return { bg: "rgba(255, 255, 255, 0.05)", border: colors.border, dot: colors.textMuted };
    }
  };

  const scheme = getColors();

  return (
    <View
      style={[
        styles.badgeContainer,
        { backgroundColor: scheme.bg, borderColor: scheme.border },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: dotColor || scheme.dot }]} />
      <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: "600" }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gaugeContainer: {
    alignItems: "center",
  },
  gaugeCenterText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeValue: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  gaugeSublabel: {
    fontSize: 9,
    fontWeight: "500",
    color: colors.textMuted,
    marginTop: 1,
  },
  gaugeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
});
