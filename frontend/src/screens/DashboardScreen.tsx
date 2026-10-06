import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import api from "../config/api";
import CosmicBackground from "../components/common/CosmicBackground";
import SurfaceCard from "../components/common/SurfaceCard";
import ScreenHeader from "../components/common/ScreenHeader";
import AppIcon from "../components/common/AppIcon";
import { StatusBadge } from "../components/common/StatusIndicator";
import CustomBottomNav from "../components/common/CustomBottomNav";
import { colors, typography, radius, spacing } from "../theme";

type Complaint = { id: number; category: string; status?: string; created_at: string };
type GuideShort = { g_id: number; name: string; rating: number; status: string };
type Order = { id: number; name: string; total_price: number; status: string };

export default function DashboardScreen() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [bookedGuides, setBookedGuides] = useState<GuideShort[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const userRaw = await AsyncStorage.getItem("user");
      if (!userRaw) {
        setLoading(false);
        return;
      }
      const user = JSON.parse(userRaw);
      const username = user.username;
      const user_id = user.id;

      const [complaintsRes, guidesRes, ordersRes] = await Promise.all([
        api.get(`/user-complaints/${username}`).catch(() => ({ data: [] })),
        api.get(`/guides`, { params: { username } }).catch(() => ({ data: [] })),
        api.get(`/user-orders/${user_id}`).catch(() => ({ data: [] })),
      ]);

      setComplaints(Array.isArray(complaintsRes.data) ? complaintsRes.data : []);

      const allGuides = Array.isArray(guidesRes.data) ? guidesRes.data : [];
      const booked = allGuides
        .filter((g: any) => g.booked_by_user)
        .map((g: any) => ({
          g_id: g.g_id,
          name: g.name,
          rating: Number(g.rating || 0),
          status: g.status || "CONFIRMED",
        }));
      setBookedGuides(booked);

      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  const analytics = useMemo(() => {
    const total = complaints.length;
    const norm = (s?: string) => (s || "pending").toLowerCase();
    const resolved = complaints.filter((c) => norm(c.status).includes("resolved")).length;
    const rejected = complaints.filter((c) => norm(c.status).includes("reject")).length;
    const pending = total - resolved - rejected;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    return {
      total,
      resolved,
      pending,
      rejected,
      resolvedPct: pct(resolved),
      pendingPct: pct(pending),
      criticalCount: complaints.filter((c) => norm(c.status).includes("critical")).length,
    };
  }, [complaints]);

  return (
    <CosmicBackground>
      <ScreenHeader
        title="Activity & Explorer"
        subtitle="Traveler records, gear & safety history"
        rightAction={
          <TouchableOpacity onPress={loadAll} style={styles.headerRefreshBtn}>
            <AppIcon name="refresh" size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadAll}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* OVERVIEW METRIC TILES */}
        <View style={styles.overviewGrid}>
          <SurfaceCard style={styles.metricCard} onPress={() => navigation.navigate("MyComplaints")}>
            <View style={[styles.metricIconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <AppIcon name="document-text-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.metricLabel}>Complaints</Text>
            <Text style={styles.metricValue}>{complaints.length}</Text>
          </SurfaceCard>

          <SurfaceCard style={styles.metricCard} onPress={() => navigation.navigate("MyOrders")}>
            <View style={[styles.metricIconWrap, { backgroundColor: `${colors.cream}18` }]}>
              <AppIcon name="cube-outline" size={20} color={colors.cream} />
            </View>
            <Text style={styles.metricLabel}>Gear Orders</Text>
            <Text style={[styles.metricValue, { color: colors.cream }]}>{orders.length}</Text>
          </SurfaceCard>

          <SurfaceCard style={styles.metricCard} onPress={() => navigation.navigate("Guide")}>
            <View style={[styles.metricIconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <AppIcon name="compass-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.metricLabel}>Guides</Text>
            <Text style={styles.metricValue}>{bookedGuides.length}</Text>
          </SurfaceCard>
        </View>

        {/* COMPLAINT RESOLUTION CARD */}
        <SurfaceCard style={styles.sectionCard} variant="elevated">
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={typography.h4}>Resolution Performance</Text>
              <Text style={styles.cardHeaderSub}>Monthly complaint resolution rate</Text>
            </View>
            <StatusBadge
              label={`${analytics.resolvedPct}% Done`}
              status={analytics.resolvedPct > 50 ? "ready" : "moderate"}
            />
          </View>

          {/* PROGRESS BARS */}
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <View style={styles.progressLabelCol}>
                <Text style={styles.progressName}>Resolved</Text>
                <Text style={styles.progressCount}>{analytics.resolved} of {analytics.total}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${analytics.resolvedPct}%`, backgroundColor: colors.primary }]} />
              </View>
            </View>

            <View style={styles.progressRow}>
              <View style={styles.progressLabelCol}>
                <Text style={styles.progressName}>In Progress / Pending</Text>
                <Text style={styles.progressCount}>{analytics.pending} of {analytics.total}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${analytics.pendingPct}%`, backgroundColor: colors.cream }]} />
              </View>
            </View>
          </View>
        </SurfaceCard>

        {/* RECENT ORDERS */}
        <View style={styles.sectionHeader}>
          <Text style={typography.h3}>Recent Equipment Orders</Text>
          <TouchableOpacity onPress={() => navigation.navigate("MyOrders")}>
            <Text style={styles.viewAllLink}>View All</Text>
          </TouchableOpacity>
        </View>

        {orders.length === 0 ? (
          <SurfaceCard style={styles.emptyCard}>
            <AppIcon name="cube-outline" size={24} color={colors.textMuted} />
            <Text style={styles.emptyText}>No equipment orders yet</Text>
          </SurfaceCard>
        ) : (
          orders.slice(0, 3).map((item) => (
            <SurfaceCard key={item.id} style={styles.orderItemCard} onPress={() => navigation.navigate("MyOrders")}>
              <View style={styles.orderIconWrap}>
                <AppIcon name="cube" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={typography.h4}>{item.name}</Text>
                <Text style={styles.itemMeta}>Total: ₹{Number(item.total_price).toFixed(2)}</Text>
              </View>
              <StatusBadge
                label={item.status || "PAID"}
                status={item.status === "PAID" ? "ready" : "moderate"}
              />
            </SurfaceCard>
          ))
        )}

        {/* RECENT COMPLAINTS */}
        <View style={styles.sectionHeader}>
          <Text style={typography.h3}>Recent Reports</Text>
          <TouchableOpacity onPress={() => navigation.navigate("MyComplaints")}>
            <Text style={styles.viewAllLink}>View All</Text>
          </TouchableOpacity>
        </View>

        {complaints.length === 0 ? (
          <SurfaceCard style={styles.emptyCard}>
            <AppIcon name="document-text-outline" size={24} color={colors.textMuted} />
            <Text style={styles.emptyText}>No reports filed</Text>
          </SurfaceCard>
        ) : (
          complaints.slice(0, 3).map((item) => (
            <SurfaceCard key={item.id} style={styles.orderItemCard} onPress={() => navigation.navigate("MyComplaints")}>
              <View style={styles.complaintIconWrap}>
                <AppIcon name="chatbubble-ellipses-outline" size={20} color={colors.cream} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={typography.h4}>{item.category}</Text>
                <Text style={styles.itemMeta}>Report #{item.id}</Text>
              </View>
              <StatusBadge
                label={item.status || "PENDING"}
                status={item.status?.toLowerCase().includes("resolved") ? "ready" : "moderate"}
              />
            </SurfaceCard>
          ))
        )}
      </ScrollView>

      {/* Pinned Bottom Nav */}
      <CustomBottomNav activeTab="MyComplaints" navigation={navigation} />
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  headerRefreshBtn: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 32,
  },
  overviewGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 14,
    alignItems: "center",
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  metricValue: {
    ...typography.h3,
    color: colors.primary,
    fontSize: 18,
    marginTop: 2,
  },
  sectionCard: {
    marginBottom: 20,
    padding: 18,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardHeaderSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressSection: {
    gap: 14,
  },
  progressRow: {
    gap: 6,
  },
  progressLabelCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressName: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  progressCount: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  viewAllLink: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
  },
  emptyCard: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 8,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  orderItemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 10,
  },
  orderIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${colors.primary}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  complaintIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${colors.cream}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  itemMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});