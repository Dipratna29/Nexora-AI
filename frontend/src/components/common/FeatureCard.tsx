import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import AppIcon, { IconName } from "./AppIcon";
import { colors, radius, typography, shadows } from "../../theme";

interface FeatureCardProps {
  title: string;
  subtitle: string;
  icon: IconName | string;
  iconColor?: string;
  onPress: () => void;
  badge?: string;
  style?: StyleProp<ViewStyle>;
}

export default function FeatureCard({
  title,
  subtitle,
  icon,
  iconColor = colors.primary,
  onPress,
  badge,
  style,
}: FeatureCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.card, style]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}18` }]}>
          <AppIcon name={icon} size={22} color={iconColor} />
        </View>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={typography.h4} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "space-between",
    ...shadows.cardSoft,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryGlow,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
});
