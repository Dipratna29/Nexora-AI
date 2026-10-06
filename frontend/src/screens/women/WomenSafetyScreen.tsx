import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import CosmicBackground from "../../components/common/CosmicBackground";
import SurfaceCard from "../../components/common/SurfaceCard";
import ScreenHeader from "../../components/common/ScreenHeader";
import AppIcon from "../../components/common/AppIcon";
import { StatusBadge } from "../../components/common/StatusIndicator";
import CustomBottomNav from "../../components/common/CustomBottomNav";
import ActiveLocationBar from "../../components/common/ActiveLocationBar";
import { useLocationContext } from "../../context/LocationContext";
import { colors, typography, radius, spacing } from "../../theme";

const { width } = Dimensions.get("window");

const FACILITIES = [
  {
    id: "1",
    name: "Women Safe Restroom",
    category: "Verified Amenity",
    distance: "0.4 km",
    available: true,
    icon: "shield-checkmark",
    statusLabel: "AVAILABLE",
  },
  {
    id: "2",
    name: "Mother & Baby Care Room",
    category: "Comfort Station",
    distance: "0.8 km",
    available: true,
    icon: "heart",
    statusLabel: "AVAILABLE",
  },
  {
    id: "3",
    name: "Transit Changing Station",
    category: "Rest Station",
    distance: "1.2 km",
    available: false,
    icon: "cube",
    statusLabel: "OCCUPIED",
  },
  {
    id: "4",
    name: "Tourist Police Help Post",
    category: "24/7 Security",
    distance: "0.3 km",
    available: true,
    icon: "shield",
    statusLabel: "ON DUTY",
  },
];

export default function WomenSafetyScreen() {
  const navigation = useNavigation<any>();
  const { activeLocation, isManual } = useLocationContext();

  const callNumber = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(() => {});
  };

  return (
    <CosmicBackground>
      <ScreenHeader
        title="Women Safety Guardian"
        subtitle="Verified safe zones, helplines & amenities"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ACTIVE LOCATION INDICATOR (GPS VS MANUAL) */}
        <ActiveLocationBar style={{ marginBottom: 12 }} />

        {/* 24/7 HELPLINE EMERGENCY BAR */}
        <SurfaceCard style={styles.helplineCard} variant="elevated">
          <View style={styles.helplineHeader}>
            <View style={styles.helplineIconCircle}>
              <AppIcon name="call" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={typography.h4}>24/7 Dedicated Helplines</Text>
              <Text style={styles.helplineSub}>Instant connection to verified response units</Text>
            </View>
          </View>

          <View style={styles.helplineBtnsRow}>
            <TouchableOpacity
              style={styles.helplineBtn}
              onPress={() => callNumber("1091")}
              activeOpacity={0.8}
            >
              <AppIcon name="call" size={16} color={colors.background} />
              <Text style={styles.helplineBtnText}>1091 (Women Help)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.helplineBtn, { backgroundColor: colors.cream }]}
              onPress={() => callNumber("112")}
              activeOpacity={0.8}
            >
              <AppIcon name="shield" size={16} color={colors.background} />
              <Text style={styles.helplineBtnText}>112 (National SOS)</Text>
            </TouchableOpacity>
          </View>
        </SurfaceCard>

        {/* VERIFIED SAFE FACILITIES */}
        <View style={styles.sectionHeader}>
          <Text style={typography.h3}>Verified Safe Locations</Text>
          <Text style={styles.countBadge}>{FACILITIES.length} Nearby</Text>
        </View>

        <View style={styles.facilitiesGrid}>
          {FACILITIES.map((facility) => (
            <SurfaceCard
              key={facility.id}
              style={styles.facilityCard}
              onPress={() => navigation.navigate("WomenSafetyDetail", { facility })}
            >
              <View style={styles.facilityTopRow}>
                <View style={styles.facilityIconWrap}>
                  <AppIcon name={facility.icon} size={20} color={colors.primary} />
                </View>
                <StatusBadge
                  label={facility.statusLabel}
                  status={facility.available ? "ready" : "moderate"}
                />
              </View>

              <Text style={styles.facilityName}>{facility.name}</Text>
              <Text style={styles.facilityCategory}>{facility.category}</Text>

              <View style={styles.distanceRow}>
                <AppIcon name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.distanceText}>{facility.distance} away</Text>
              </View>
            </SurfaceCard>
          ))}
        </View>

        {/* TRAVEL TIPS */}
        <SurfaceCard style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <AppIcon name="shield-checkmark" size={20} color={colors.cream} />
            <Text style={[typography.h4, { color: colors.cream, marginLeft: 8 }]}>
              Safety Recommendations
            </Text>
          </View>
          <Text style={styles.tipItem}>
            • Share your live location with trusted emergency contacts when moving at night.
          </Text>
          <Text style={styles.tipItem}>
            • TrustTrip verified safe zones have continuous CCTV and security presence.
          </Text>
          <Text style={styles.tipItem}>
            • The Emergency SOS button broadcasts your telemetry coordinates instantly.
          </Text>
        </SurfaceCard>
      </ScrollView>

      {/* BOTTOM NAV */}
      <CustomBottomNav activeTab="Home" navigation={navigation} />
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 32,
  },
  helplineCard: {
    marginBottom: 20,
    padding: 16,
    borderColor: colors.primaryBorder,
  },
  helplineHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  helplineIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  helplineSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  helplineBtnsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  helplineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 10,
    gap: 6,
  },
  helplineBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.background,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  countBadge: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
  },
  facilitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  facilityCard: {
    width: (width - spacing.screenPadding * 2 - 10) / 2,
    padding: 14,
  },
  facilityTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  facilityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: `${colors.primary}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  facilityName: {
    ...typography.h4,
    fontSize: 13,
    color: colors.white,
    minHeight: 36,
  },
  facilityCategory: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  distanceText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  tipsCard: {
    padding: 16,
    borderColor: "rgba(251, 226, 180, 0.2)",
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  tipItem: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
});
