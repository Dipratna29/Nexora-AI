import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  Animated,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../config/api";
import locationService from "../services/locationService";
import CosmicBackground from "../components/common/CosmicBackground";
import SurfaceCard from "../components/common/SurfaceCard";
import FeatureCard from "../components/common/FeatureCard";
import AppIcon from "../components/common/AppIcon";
import { StatusBadge } from "../components/common/StatusIndicator";
import CustomBottomNav from "../components/common/CustomBottomNav";
import ActiveLocationBar from "../components/common/ActiveLocationBar";
import { useLocationContext } from "../context/LocationContext";
import { colors, typography, radius, shadows, spacing } from "../theme";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [offers, setOffers] = useState<any[]>([]);
  const [userName, setUserName] = useState("Traveler");
  const [userStatus, setUserStatus] = useState("ACTIVE");
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [activeSOS, setActiveSOS] = useState<any>(null);

  const {
    activeLocation,
    isManual,
    gpsStatus,
    isDetecting,
    detectGpsLocation,
    showFallback,
  } = useLocationContext();

  // SOS hold button animation
  const sosHoldAnim = useRef(new Animated.Value(0)).current;
  const [holdingSOS, setHoldingSOS] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    loadUserProfile();
    fetchLiveOffers();
    checkSOSStatus();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
      fetchUnreadCount();
      checkSOSStatus();
    }, [])
  );

  const fetchUnreadCount = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const uid = user.id || user.user_id;
      if (!uid) return;

      const res = await api.get("/api/notifications/unread-count", {
        params: { user_id: uid },
      });
      if (res.data && res.data.success) {
        setUnreadNotificationsCount(res.data.unread_count || 0);
      }
    } catch {
      // Clean fallback
    }
  };

  const loadUserProfile = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      if (user.name) {
        setUserName(user.name);
      } else if (user.username) {
        setUserName(user.username);
      }
      if (user.status) {
        setUserStatus(user.status);
      }
    } catch {
      // Clean fallback
    }
  };

  const checkSOSStatus = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const uid = user.id || user.user_id;
      if (!uid) return;

      const res = await api.get(`/sos/active/${uid}`);
      if (res.data?.active && res.data?.incident) {
        setActiveSOS(res.data.incident);
      } else {
        setActiveSOS(null);
      }
    } catch {
      setActiveSOS(null);
    }
  };

  const fetchLiveOffers = async () => {
    try {
      const res = await api.get("/offers");
      if (Array.isArray(res.data)) {
        setOffers(res.data);
      }
    } catch {
      // Clean fallback
    }
  };

  const handleSosPressIn = () => {
    setHoldingSOS(true);
    Animated.timing(sosHoldAnim, {
      toValue: 1,
      duration: 1800,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        navigation.navigate("SOS");
      }
    });
  };

  const handleSosPressOut = () => {
    setHoldingSOS(false);
    Animated.timing(sosHoldAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  return (
    <CosmicBackground>
      {/* 1. TOP HEADER & GREETING */}
      <View style={styles.topHeader}>
        <View style={styles.brandAndGreeting}>
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>
              Trust<Text style={{ color: colors.primary }}>Trip</Text>
            </Text>
          </View>
          <Text style={styles.subGreeting}>
            {getGreeting()}, <Text style={styles.userName}>{userName}</Text>
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate("Notifications")}
            accessibilityLabel="Notifications"
          >
            <AppIcon name="notifications-outline" size={20} color={colors.textPrimary} />
            {unreadNotificationsCount > 0 && (
              <View style={styles.unreadDot}>
                <Text style={styles.unreadText}>
                  {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => navigation.navigate("Profile")}
            accessibilityLabel="Profile"
          >
            <AppIcon name="person" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ACTIVE SOS BANNER (IF AN EMERGENCY IS CURRENTLY UNDERWAY) */}
        {activeSOS && (
          <SurfaceCard
            variant="danger"
            style={styles.activeSosBanner}
            onPress={() => navigation.navigate("SOS")}
          >
            <View style={styles.alertRow}>
              <View style={styles.alertPulse}>
                <AppIcon name="alert-circle" size={22} color={colors.danger} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[typography.h4, { color: colors.danger }]}>Emergency SOS Active</Text>
                <Text style={[typography.bodySm, { color: colors.textSecondary }]} numberOfLines={1}>
                  Incident #{activeSOS.id} • Responders alerted
                </Text>
              </View>
              <AppIcon name="chevron-forward" size={18} color={colors.danger} />
            </View>
          </SurfaceCard>
        )}

        {/* ACTIVE LOCATION STATUS BAR (GPS VS MANUALLY SELECTED) */}
        <ActiveLocationBar style={{ marginBottom: 12 }} />

        {/* 2. TRUST STATUS HERO CARD ("Am I safe?") */}
        <SurfaceCard style={styles.trustStatusCard} variant="elevated">
          <View style={styles.trustHeader}>
            <View style={styles.trustShieldContainer}>
              <AppIcon name="shield-checkmark" size={24} color={colors.primary} />
            </View>
            <View style={styles.trustTextCol}>
              <Text style={styles.trustCaption}>ACTIVE TRAVEL GUARDIAN</Text>
              <Text style={styles.trustTitle}>
                {userStatus === "ACTIVE" ? "Protected & Monitored" : "Attention Required"}
              </Text>
            </View>
            <StatusBadge
              label={userStatus === "ACTIVE" ? "Secured" : "Review"}
              status={userStatus === "ACTIVE" ? "ready" : "danger"}
            />
          </View>

          <View style={styles.trustDivider} />

          <View style={styles.trustFooter}>
            <TouchableOpacity
              style={styles.locationStatusRow}
              onPress={() => navigation.navigate("SelectLocation")}
              activeOpacity={0.7}
            >
              <AppIcon
                name={isManual ? "pencil" : gpsStatus === "ACTIVE" ? "location" : "location-outline"}
                size={16}
                color={isManual ? colors.cream : gpsStatus === "ACTIVE" ? colors.primary : colors.warning}
              />
              <Text style={styles.locationStatusText} numberOfLines={1}>
                {isManual
                  ? `✏️ Manual: ${activeLocation?.name || "Selected Location"}`
                  : gpsStatus === "ACTIVE"
                  ? `📍 GPS: ${activeLocation?.name || "Live Protection Active"}`
                  : isDetecting
                  ? "Detecting location..."
                  : "Location Services Off"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("CrowdMap")}
              activeOpacity={0.7}
              style={styles.mapLink}
            >
              <Text style={styles.mapLinkText}>View Radar</Text>
              <AppIcon name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </SurfaceCard>

        {/* 3. SAFETY OVERVIEW (3 COMPACT STAT CAPSULES) */}
        <View style={styles.overviewGrid}>
          <SurfaceCard style={styles.overviewCard} onPress={() => navigation.navigate("CrowdMap")}>
            <View style={[styles.overviewIconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <AppIcon name="shield-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.overviewLabel}>Safety Shield</Text>
            <Text style={styles.overviewValue}>Active</Text>
          </SurfaceCard>

          <SurfaceCard
            style={styles.overviewCard}
            onPress={() => {
              if (isManual || gpsStatus === "ACTIVE") {
                navigation.navigate("SelectLocation");
              } else {
                showFallback(gpsStatus === "PERMISSION_DENIED" ? "permission_denied" : "gps_disabled");
              }
            }}
          >
            <View
              style={[
                styles.overviewIconWrap,
                {
                  backgroundColor: isManual
                    ? `${colors.cream}18`
                    : gpsStatus === "ACTIVE"
                    ? `${colors.primary}18`
                    : `${colors.warning}18`,
                },
              ]}
            >
              <AppIcon
                name={isManual ? "pencil" : gpsStatus === "ACTIVE" ? "location" : "navigate-outline"}
                size={18}
                color={isManual ? colors.cream : gpsStatus === "ACTIVE" ? colors.primary : colors.warning}
              />
            </View>
            <Text style={styles.overviewLabel}>{isManual ? "Manual Location" : "GPS Location"}</Text>
            <Text
              style={[
                styles.overviewValue,
                isManual
                  ? { color: colors.cream }
                  : gpsStatus !== "ACTIVE" && { color: colors.warning },
              ]}
            >
              {isManual ? "Selected" : gpsStatus === "ACTIVE" ? "Ready" : isDetecting ? "Searching" : "Offline"}
            </Text>
          </SurfaceCard>

          <SurfaceCard style={styles.overviewCard} onPress={() => navigation.navigate("Crowd")}>
            <View style={[styles.overviewIconWrap, { backgroundColor: `${colors.cream}18` }]}>
              <AppIcon name="people-outline" size={18} color={colors.cream} />
            </View>
            <Text style={styles.overviewLabel}>Crowd Level</Text>
            <Text style={[styles.overviewValue, { color: colors.cream }]}>Moderate</Text>
          </SurfaceCard>
        </View>

        {/* 4. HIGH-VISIBILITY EMERGENCY SOS CONTROL */}
        <View style={styles.sosCardContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={handleSosPressIn}
            onPressOut={handleSosPressOut}
            onPress={() => navigation.navigate("SOS")}
            style={styles.sosTouchable}
          >
            <View style={styles.sosInnerContent}>
              <View style={styles.sosIconWrap}>
                <AppIcon name="alert-circle" size={24} color={colors.white} />
              </View>
              <View style={styles.sosTextCol}>
                <Text style={styles.sosTitle}>EMERGENCY SOS</Text>
                <Text style={styles.sosSubtitle}>
                  {holdingSOS ? "Holding... Alerting Responders" : "Hold for 2 seconds to broadcast alert"}
                </Text>
              </View>
              <AppIcon name="chevron-forward" size={18} color={colors.white} />
            </View>

            {/* Hold progress bar overlay */}
            <Animated.View
              style={[
                styles.sosProgressBar,
                {
                  width: sosHoldAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* 5. QUICK SAFETY TOOLS GRID */}
        <View style={styles.sectionHeader}>
          <Text style={typography.h3}>Quick Safety Tools</Text>
        </View>

        <View style={styles.quickToolsGrid}>
          <FeatureCard
            title="Crowd Radar"
            subtitle="Check real-time tourist density & alerts"
            icon="people-outline"
            iconColor={colors.primary}
            onPress={() => navigation.navigate("Crowd")}
            style={styles.toolCard}
          />
          <FeatureCard
            title="Women Safety"
            subtitle="Verified safe zones, routes & helpline"
            icon="heart-outline"
            iconColor={colors.cream}
            onPress={() => navigation.navigate("WomenSafety")}
            style={styles.toolCard}
          />
          <FeatureCard
            title="Report Issue"
            subtitle="Lodge tourist complaint & track resolution"
            icon="chatbubble-ellipses-outline"
            iconColor={colors.primary}
            onPress={() => navigation.navigate("Complaint")}
            style={styles.toolCard}
          />
          <FeatureCard
            title="AI Assistant"
            subtitle="24/7 travel advice & safety intelligence"
            icon="sparkles-outline"
            iconColor={colors.cream}
            onPress={() => navigation.navigate("ChatBot")}
            style={styles.toolCard}
          />
        </View>

        {/* 6. TRAVELER SERVICES (HORIZONTAL ROW) */}
        <View style={styles.sectionHeader}>
          <Text style={typography.h3}>Traveler Services</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.servicesScroll}
        >
          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => navigation.navigate("Equipment")}
            activeOpacity={0.75}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: `${colors.primary}18` }]}>
              <AppIcon name="cube-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.serviceItemText}>Safety Gear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => navigation.navigate("Guide")}
            activeOpacity={0.75}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: `${colors.cream}18` }]}>
              <AppIcon name="compass-outline" size={20} color={colors.cream} />
            </View>
            <Text style={styles.serviceItemText}>Local Guides</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => navigation.navigate("PriceCheck")}
            activeOpacity={0.75}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: `${colors.primary}18` }]}>
              <AppIcon name="pricetag-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.serviceItemText}>Fair Prices</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => navigation.navigate("Language")}
            activeOpacity={0.75}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: `${colors.cream}18` }]}>
              <AppIcon name="language-outline" size={20} color={colors.cream} />
            </View>
            <Text style={styles.serviceItemText}>Translator</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => navigation.navigate("Dashboard")}
            activeOpacity={0.75}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: `${colors.primary}18` }]}>
              <AppIcon name="document-text-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.serviceItemText}>Activity</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* 7. VERIFIED PROMOTIONAL OFFERS */}
        <View style={styles.sectionHeader}>
          <Text style={typography.h3}>Verified Travel Offers</Text>
        </View>

        {offers.length === 0 ? (
          <SurfaceCard style={styles.emptyOffersCard}>
            <AppIcon name="pricetag-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyOffersText}>
              No active offers at this time. Check back soon for travel discounts.
            </Text>
          </SurfaceCard>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.offersScroll}
          >
            {offers.map((offer) => (
              <SurfaceCard key={offer.id} style={styles.offerCard}>
                {offer.image_url ? (
                  <Image source={{ uri: offer.image_url }} style={styles.offerImage} resizeMode="cover" />
                ) : (
                  <View style={styles.offerImagePlaceholder}>
                    <AppIcon name="pricetag" size={28} color={colors.primary} />
                  </View>
                )}
                {offer.discount_percentage ? (
                  <View style={styles.offerBadge}>
                    <Text style={styles.offerDiscountText}>{offer.discount_percentage}% OFF</Text>
                  </View>
                ) : null}
                <View style={styles.offerBody}>
                  <Text style={styles.offerCategory}>{offer.category || "PROMO"}</Text>
                  <Text style={styles.offerTitle} numberOfLines={1}>
                    {offer.title}
                  </Text>
                </View>
              </SurfaceCard>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      {/* BOTTOM NAV */}
      <CustomBottomNav activeTab="Home" navigation={navigation} />
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 16,
    paddingBottom: 14,
  },
  brandAndGreeting: {
    flex: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandTitle: {
    fontFamily: typography.displayLarge.fontFamily,
    fontSize: 22,
    fontWeight: "900",
    color: colors.white,
    letterSpacing: -0.5,
  },
  subGreeting: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userName: {
    color: colors.white,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: colors.danger,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.background,
  },
  unreadText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.white,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 24,
  },
  activeSosBanner: {
    marginBottom: 16,
    padding: 14,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  alertPulse: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.dangerSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  trustStatusCard: {
    marginBottom: 16,
    padding: 18,
    borderColor: colors.primaryBorder,
  },
  trustHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  trustShieldContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  trustTextCol: {
    flex: 1,
  },
  trustCaption: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.8,
  },
  trustTitle: {
    ...typography.h3,
    fontSize: 16,
    marginTop: 2,
  },
  trustDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  trustFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationStatusText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  mapLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mapLinkText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
  },
  overviewGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  overviewCard: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  overviewLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
  },
  overviewValue: {
    ...typography.label,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  sosCardContainer: {
    marginBottom: 20,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.danger,
    ...shadows.glowDanger,
  },
  sosTouchable: {
    padding: 16,
    position: "relative",
  },
  sosInnerContent: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
  sosIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sosTextCol: {
    flex: 1,
  },
  sosTitle: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 17,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.5,
  },
  sosSubtitle: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
  },
  sosProgressBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 4,
  },
  quickToolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  toolCard: {
    width: (width - spacing.screenPadding * 2 - 10) / 2,
  },
  servicesScroll: {
    gap: 10,
    paddingBottom: 4,
    marginBottom: 16,
  },
  serviceItem: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 90,
  },
  serviceIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  serviceItemText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  emptyOffersCard: {
    alignItems: "center",
    padding: 24,
    marginBottom: 16,
  },
  emptyOffersText: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: "center",
  },
  offersScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  offerCard: {
    width: 220,
    padding: 0,
    overflow: "hidden",
  },
  offerImage: {
    width: "100%",
    height: 110,
    backgroundColor: colors.surfaceElevated,
  },
  offerImagePlaceholder: {
    width: "100%",
    height: 110,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  offerBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  offerDiscountText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.background,
  },
  offerBody: {
    padding: 12,
  },
  offerCategory: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
  },
  offerTitle: {
    ...typography.h4,
    fontSize: 13,
    marginTop: 2,
  },
});
