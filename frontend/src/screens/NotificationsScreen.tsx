import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "../components/common/AppIcon";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../config/api";
import CosmicBackground from "../components/common/CosmicBackground";
import SurfaceCard from "../components/common/SurfaceCard";
import ScreenHeader from "../components/common/ScreenHeader";
import { LoadingSkeleton, EmptyStateView } from "../components/common/StateViews";
import { colors, typography, radius, spacing } from "../theme";

interface NotificationItem {
  notification_id: number;
  user_id: number;
  notification_type: string;
  title: string;
  body: string;
  data?: {
    type?: string;
    screen?: string;
    deep_link?: string;
    priority?: string;
  };
  is_read: boolean;
  expo_response_status?: string;
  created_at: string;
}

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "emergency", label: "Emergency" },
  { id: "safety", label: "Safety" },
  { id: "system", label: "System" },
  { id: "offers", label: "Offers" },
];

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchNotifications(false);
      }
    }, [userId, selectedCategory])
  );

  const loadUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const uid = user.id || user.user_id;
        if (uid) {
          setUserId(Number(uid));
          fetchNotificationsForUser(Number(uid), false);
        }
      }
    } catch {
      // Fallback
    }
  };

  const fetchNotifications = async (isPull = false) => {
    if (!userId) return;
    await fetchNotificationsForUser(userId, isPull);
  };

  const fetchNotificationsForUser = async (uid: number, isPull = false) => {
    if (isPull) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get("/api/notifications", {
        params: {
          user_id: uid,
          unread_only: selectedCategory === "unread",
          notification_type:
            selectedCategory !== "all" && selectedCategory !== "unread"
              ? selectedCategory
              : undefined,
        },
      });

      if (res.data && res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkAsRead = async (notif: NotificationItem) => {
    if (notif.is_read) return;

    try {
      await api.put(`/api/notifications/${notif.notification_id}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notif.notification_id ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Silent error
    }
  };

  const handleMarkAllRead = async () => {
    if (!userId || unreadCount === 0) return;

    try {
      await api.put("/api/notifications/mark-all-read", null, {
        params: { user_id: userId },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      Alert.alert("Notice", "Could not mark all notifications as read.");
    }
  };

  const handleDelete = async (notifId: number) => {
    try {
      await api.delete(`/api/notifications/${notifId}`);
      setNotifications((prev) => prev.filter((n) => n.notification_id !== notifId));
    } catch {
      Alert.alert("Notice", "Could not delete notification.");
    }
  };

  const handleNotificationPress = async (notif: NotificationItem) => {
    await handleMarkAsRead(notif);

    const screen = notif.data?.screen;
    if (screen) {
      navigation.navigate(screen);
      return;
    }

    if (notif.notification_type === "emergency" || notif.notification_type === "sos_alert") {
      navigation.navigate("SOS");
    } else if (notif.notification_type === "payment_success") {
      navigation.navigate("MyOrders");
    } else if (notif.notification_type === "complaint_update") {
      navigation.navigate("MyComplaints");
    }
  };

  const formatTimestamp = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "emergency":
      case "sos_alert":
        return { name: "alert-circle" as const, color: colors.danger, bg: colors.dangerSurface };
      case "safety":
        return { name: "shield-checkmark" as const, color: colors.primary, bg: colors.primaryGlow };
      case "payment_success":
        return { name: "card" as const, color: colors.primary, bg: colors.primaryGlow };
      case "offers":
        return { name: "pricetag" as const, color: colors.cream, bg: "rgba(251, 226, 180, 0.15)" };
      default:
        return { name: "notifications" as const, color: colors.primary, bg: colors.primaryGlow };
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const iconConfig = getIconForType(item.notification_type);

    return (
      <SurfaceCard
        style={[styles.card, !item.is_read && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconCircle, { backgroundColor: iconConfig.bg }]}>
            <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
          </View>

          <View style={styles.contentCol}>
            <View style={styles.headerRow}>
              <Text style={[styles.titleText, !item.is_read && styles.unreadTitle]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.timeText}>{formatTimestamp(item.created_at)}</Text>
            </View>

            <Text style={styles.bodyText} numberOfLines={2}>
              {item.body}
            </Text>
          </View>

          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
      </SurfaceCard>
    );
  };

  return (
    <CosmicBackground>
      {/* HEADER */}
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread alert(s)` : "All caught up"}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={handleMarkAllRead}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* CATEGORIES SCROLL */}
      <View style={styles.categoriesWrap}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
                onPress={() => setSelectedCategory(item.id)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* CONTENT LIST */}
      <View style={styles.container}>
        {loading && !refreshing ? (
          <View style={styles.loaderWrap}>
            <LoadingSkeleton count={4} height={90} />
          </View>
        ) : notifications.length === 0 ? (
          <EmptyStateView
            title="No Notifications"
            description="You are completely up to date. Safety alerts and order updates will appear here."
            icon="notifications-outline"
          />
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.notification_id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchNotifications(true)}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          />
        )}
      </View>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  markAllText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
  },
  categoriesWrap: {
    marginBottom: 10,
  },
  categoriesList: {
    paddingHorizontal: spacing.screenPadding,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  categoryChipTextSelected: {
    color: colors.background,
    fontWeight: "800",
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
  },
  loaderWrap: {
    paddingTop: 10,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    marginBottom: 10,
    padding: 12,
  },
  unreadCard: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.surfaceElevated,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contentCol: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  titleText: {
    ...typography.label,
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: "800",
    color: colors.white,
  },
  timeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  bodyText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
});
