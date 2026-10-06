import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "./AppIcon";
import { colors, typography, radius } from "../../theme";
import Button from "./Buttons";

/**
 * Translates technical backend/network error into user-friendly message
 */
export function formatUserErrorMessage(error: any): string {
  if (!error) return "Something went wrong. Please try again.";

  const errStr = typeof error === "string" ? error : error?.message || "";
  const status = error?.response?.status;

  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403) return "Access denied. Your account does not have permission or has been restricted.";
  if (status === 404) return "The requested information could not be found.";
  if (status === 500) return "Our server encountered a momentary issue. Please try again shortly.";

  if (errStr.includes("Network Error") || errStr.includes("timeout") || errStr.includes("ECONNREFUSED")) {
    return "Unable to connect to TrustTrip servers. Please check your internet connection.";
  }

  if (errStr.includes("PGRST") || errStr.includes("42501") || errStr.includes("row-level security")) {
    return "Service temporarily synchronizing. Please try again.";
  }

  return error?.response?.data?.message || errStr || "An unexpected error occurred. Please try again.";
}

interface LoadingSkeletonProps {
  count?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function LoadingSkeleton({ count = 3, height = 70, style }: LoadingSkeletonProps) {
  return (
    <View style={[styles.skeletonContainer, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.skeletonItem, { height }]}>
          <View style={styles.skeletonInner} />
        </View>
      ))}
    </View>
  );
}

interface EmptyStateViewProps {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionTitle?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyStateView({
  title,
  description,
  icon = "file-tray-outline",
  actionTitle,
  onAction,
  style,
}: EmptyStateViewProps) {
  return (
    <View style={[styles.stateCard, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[typography.h3, { marginTop: 14, textAlign: "center" }]}>{title}</Text>
      <Text style={[typography.bodySm, { marginTop: 6, textAlign: "center", maxWidth: 260 }]}>
        {description}
      </Text>
      {actionTitle && onAction && (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          size="sm"
          style={{ marginTop: 16 }}
        />
      )}
    </View>
  );
}

interface ErrorRetryViewProps {
  error: any;
  onRetry: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ErrorRetryView({ error, onRetry, style }: ErrorRetryViewProps) {
  const friendlyMessage = formatUserErrorMessage(error);

  return (
    <View style={[styles.stateCard, styles.errorCard, style]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerSurface }]}>
        <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
      </View>
      <Text style={[typography.h4, { marginTop: 12, color: colors.danger, textAlign: "center" }]}>
        Unable to Load
      </Text>
      <Text style={[typography.bodySm, { marginTop: 6, textAlign: "center", maxWidth: 280 }]}>
        {friendlyMessage}
      </Text>
      <Button
        title="Try Again"
        onPress={onRetry}
        variant="primary"
        size="sm"
        icon="refresh"
        style={{ marginTop: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    paddingVertical: 8,
    gap: 12,
  },
  skeletonItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonInner: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  errorCard: {
    borderColor: colors.borderDanger,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
  },
});
