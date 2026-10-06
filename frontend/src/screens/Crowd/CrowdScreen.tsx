import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useNavigation, type NavigationProp } from "@react-navigation/native";
import api from "../../config/api";
import locationService from "../../services/locationService";
import CosmicBackground from "../../components/common/CosmicBackground";
import SurfaceCard from "../../components/common/SurfaceCard";
import ScreenHeader from "../../components/common/ScreenHeader";
import AppIcon from "../../components/common/AppIcon";
import ActiveLocationBar from "../../components/common/ActiveLocationBar";
import { useLocationContext } from "../../context/LocationContext";
import { StatusBadge } from "../../components/common/StatusIndicator";
import CustomBottomNav from "../../components/common/CustomBottomNav";
import { colors, typography, radius, spacing } from "../../theme";
import type {
  CrowdLocationApiResponse,
  CrowdLocationCardItem,
  CrowdStackParamList,
  CrowdStatus,
} from "./types";

export default function CrowdMonitoringScreen() {
  const [locations, setLocations] = useState<CrowdLocationCardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NavigationProp<CrowdStackParamList>>();
  const { activeLocation, isManual } = useLocationContext();

  useEffect(() => {
    fetchLocations();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (activeLocation) {
        locationService.sendLocationToBackend({
          latitude: activeLocation.latitude,
          longitude: activeLocation.longitude,
          accuracy: activeLocation.accuracy,
        }).catch(() => {});
      }
    }, [activeLocation])
  );

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await api.get<CrowdLocationApiResponse[]>("/crowd/locations");
      if (Array.isArray(res.data)) {
        const mapped: CrowdLocationCardItem[] = res.data.map((r: CrowdLocationApiResponse) => ({
          name: r.location_name,
          current: r.crowd_count,
          max: r.capacity,
          percent: r.occupancy_percentage,
          level: r.crowd_status,
          dotColor: r.occupancy_percentage >= 80 ? colors.danger : colors.primary,
          barColor: r.occupancy_percentage >= 80 ? colors.danger : r.occupancy_percentage >= 50 ? colors.cream : colors.primary,
          raw: r,
        }));
        setLocations(mapped);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (loc: CrowdLocationCardItem) => {
    navigation.navigate("CrowdLocationDetail", { location: loc.raw });
  };

  const getStatusType = (level: string) => {
    if (level === "OVERCROWDED" || level === "HIGH") return "danger";
    if (level === "MODERATE") return "moderate";
    return "ready";
  };

  return (
    <CosmicBackground>
      <ScreenHeader
        title="Crowd Density Radar"
        subtitle="Live tourist precinct saturation & alerts"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.mapHeaderBtn}
            onPress={() => navigation.navigate("CrowdMap")}
            accessibilityLabel="Open Map"
          >
            <AppIcon name="map-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchLocations}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ACTIVE LOCATION INDICATOR (GPS VS MANUAL) */}
        <ActiveLocationBar style={{ marginBottom: 12 }} />

        {/* HEATMAP SHORTCUT BANNER */}
        <SurfaceCard
          style={styles.heatmapBanner}
          variant="interactive"
          onPress={() => navigation.navigate("CrowdMap")}
        >
          <View style={styles.heatmapRow}>
            <View style={styles.heatmapIconCircle}>
              <AppIcon name="map" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={typography.h4}>Interactive Safety Heatmap</Text>
              <Text style={styles.heatmapDesc}>View real-time congestion zones on GPS radar</Text>
            </View>
            <AppIcon name="chevron-forward" size={18} color={colors.primary} />
          </View>
        </SurfaceCard>

        {/* CROWD LIST TITLE */}
        <View style={styles.sectionHeader}>
          <Text style={typography.h3}>Monitored Precincts</Text>
          <Text style={styles.totalBadge}>{locations.length} Locations</Text>
        </View>

        {/* LOCATIONS LIST */}
        {locations.length === 0 && !loading ? (
          <SurfaceCard style={styles.emptyCard}>
            <AppIcon name="people-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Scanning Tourist Precincts</Text>
            <Text style={styles.emptyDesc}>Real-time crowd data is loading for nearby tourist areas.</Text>
          </SurfaceCard>
        ) : (
          locations.map((item, index) => (
            <SurfaceCard
              key={index}
              style={styles.locationCard}
              onPress={() => openDetail(item)}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={typography.h4}>{item.name}</Text>
                  <View style={styles.countsRow}>
                    <AppIcon name="people" size={14} color={colors.textMuted} />
                    <Text style={styles.countText}>
                      <Text style={{ color: colors.white, fontWeight: "700" }}>{item.current}</Text> / {item.max} capacity
                    </Text>
                  </View>
                </View>
                <StatusBadge
                  label={item.level}
                  status={getStatusType(item.level)}
                />
              </View>

              {/* PROGRESS BAR */}
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(item.percent, 100)}%`,
                        backgroundColor: item.barColor,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.percentLabel, { color: item.barColor }]}>
                  {item.percent}% Full
                </Text>
              </View>
            </SurfaceCard>
          ))
        )}
      </ScrollView>

      {/* BOTTOM NAV */}
      <CustomBottomNav activeTab="Home" navigation={navigation} />
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  mapHeaderBtn: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 28,
  },
  heatmapBanner: {
    marginBottom: 18,
    padding: 14,
    borderColor: colors.primaryBorder,
  },
  heatmapRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heatmapIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  heatmapDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  totalBadge: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
  },
  locationCard: {
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  countsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  countText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  percentLabel: {
    fontSize: 12,
    fontWeight: "700",
    minWidth: 54,
    textAlign: "right",
  },
  emptyCard: {
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.white,
    marginTop: 8,
  },
  emptyDesc: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
});
