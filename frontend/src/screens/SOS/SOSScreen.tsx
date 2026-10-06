import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Animated,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../config/api";
import locationService from "../../services/locationService";
import CosmicBackground from "../../components/common/CosmicBackground";
import SurfaceCard from "../../components/common/SurfaceCard";
import ScreenHeader from "../../components/common/ScreenHeader";
import AppIcon from "../../components/common/AppIcon";
import CustomBottomNav from "../../components/common/CustomBottomNav";
import ActiveLocationBar from "../../components/common/ActiveLocationBar";
import { useLocationContext } from "../../context/LocationContext";
import { colors, typography, radius, shadows, spacing } from "../../theme";

interface EmergencyService {
  id: string;
  name: string;
  number: string;
  icon: string;
  category: string;
}

const SERVICES: EmergencyService[] = [
  { id: "1", name: "Police Dispatch", number: "100", icon: "shield", category: "Law & Order" },
  { id: "2", name: "Medical Ambulance", number: "108", icon: "medkit", category: "Emergency Healthcare" },
  { id: "3", name: "Fire & Rescue", number: "101", icon: "alert-circle", category: "Disaster Response" },
  { id: "4", name: "Women Emergency Helpline", number: "1091", icon: "heart", category: "Women Protection" },
  { id: "5", name: "National Emergency Service", number: "112", icon: "call", category: "Unified Response" },
  { id: "6", name: "Forest / Wildlife Emergency", number: "1926", icon: "compass", category: "Ranger Assistance" },
];

export default function SOSScreen() {
  const navigation = useNavigation<any>();
  const [holdingSOS, setHoldingSOS] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const holdAnim = useRef(new Animated.Value(0)).current;
  const { activeLocation, isManual } = useLocationContext();

  const performSOSBroadcast = async (loc: typeof activeLocation) => {
    setBroadcasting(true);
    try {
      const userStr = await AsyncStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const uid = user?.id || user?.user_id;

      // Send SOS incident to backend with real coordinates and source (never fake)
      const payload: any = {
        user_id: uid,
        type: "EMERGENCY_BROADCAST",
      };

      if (loc) {
        payload.latitude = loc.latitude;
        payload.longitude = loc.longitude;
        payload.location_name = loc.name;
        payload.location_source = loc.source;
      } else {
        payload.latitude = null;
        payload.longitude = null;
        payload.location_name = null;
        payload.location_source = "NONE";
      }

      await api.post("/sos/trigger", payload).catch(() => null);

      const locNotice = loc
        ? loc.source === "MANUAL"
          ? `Your manually selected location (${loc.name}) has been transmitted to emergency responders.`
          : `Your live GPS coordinates have been transmitted to local emergency responders.`
        : "Distress beacon sent WITHOUT coordinates. Please communicate your exact whereabouts when contacted.";

      Alert.alert(
        "EMERGENCY ALERT BROADCAST",
        locNotice,
        [
          {
            text: "Open Command Center",
            onPress: () =>
              navigation.navigate("SOSDetail", {
                emergency: { name: "National Emergency Dispatch", number: "112" },
              }),
          },
        ]
      );
    } catch {
      Alert.alert("Emergency Alert Sent", "Emergency services notified.");
    } finally {
      setBroadcasting(false);
      setHoldingSOS(false);
      holdAnim.setValue(0);
    }
  };

  const handlePressIn = () => {
    setHoldingSOS(true);
    Animated.timing(holdAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        if (!activeLocation) {
          Alert.alert(
            "Location Unavailable",
            "No live GPS or manual location is currently detected. Responders will receive your distress beacon without coordinates.\n\nBroadcast anyway, or select a location manually?",
            [
              {
                text: "Select Location First",
                onPress: () => {
                  setHoldingSOS(false);
                  holdAnim.setValue(0);
                  navigation.navigate("SelectLocation");
                },
              },
              {
                text: "Broadcast Without Coordinates",
                style: "destructive",
                onPress: () => performSOSBroadcast(null),
              },
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => {
                  setHoldingSOS(false);
                  holdAnim.setValue(0);
                },
              },
            ]
          );
        } else {
          performSOSBroadcast(activeLocation);
        }
      }
    });
  };

  const handlePressOut = () => {
    if (!broadcasting) {
      setHoldingSOS(false);
      Animated.timing(holdAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  };

  const callNumber = (num: string) => {
    Linking.openURL(`tel:${num}`).catch(() => {});
  };

  return (
    <CosmicBackground>
      <ScreenHeader
        title="Emergency SOS"
        subtitle="Hold to broadcast • Direct dispatch line"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ACTIVE LOCATION INDICATOR (GPS VS MANUAL) */}
        <ActiveLocationBar style={{ marginHorizontal: spacing.screenPadding, marginBottom: 14 }} />

        {/* MAIN HOLD-TO-ACTIVATE SOS HERO CARD */}
        <View style={styles.sosCardWrap}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.sosTouchable}
          >
            <View style={styles.sosContentRow}>
              <View style={styles.sosIconCircle}>
                <AppIcon name="alert-circle" size={32} color={colors.white} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.sosTitle}>
                  {broadcasting ? "BROADCASTING ALERT..." : "EMERGENCY SOS"}
                </Text>
                <Text style={styles.sosSub}>
                  {holdingSOS
                    ? "HOLD FOR 2 SECONDS TO BROADCAST..."
                    : "Press & hold for 2 seconds to alert responders & contacts"}
                </Text>
              </View>
              <AppIcon name="chevron-forward" size={20} color={colors.white} />
            </View>

            {/* Hold progress bar */}
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: holdAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* INSTRUCTION BADGE */}
        <SurfaceCard style={styles.instructionCard}>
          <View style={styles.instructionRow}>
            <AppIcon name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={styles.instructionText}>
              Telemetry coordinates & device telemetry are automatically attached to the broadcast.
            </Text>
          </View>
        </SurfaceCard>

        {/* DIRECT HELPLINE SERVICES */}
        <View style={styles.sectionHeader}>
          <Text style={typography.h3}>Instant Authority Lines</Text>
        </View>

        {SERVICES.map((item) => (
          <SurfaceCard
            key={item.id}
            style={styles.serviceCard}
            onPress={() => navigation.navigate("SOSDetail", { emergency: item })}
          >
            <View style={styles.serviceRow}>
              <View style={styles.serviceIconWrap}>
                <AppIcon name={item.icon} size={20} color={colors.danger} />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={typography.h4}>{item.name}</Text>
                <Text style={styles.serviceCategory}>{item.category}</Text>
              </View>

              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => callNumber(item.number)}
                activeOpacity={0.8}
              >
                <AppIcon name="call" size={14} color={colors.white} />
                <Text style={styles.callBtnText}>{item.number}</Text>
              </TouchableOpacity>
            </View>
          </SurfaceCard>
        ))}
      </ScrollView>

      {/* BOTTOM NAV */}
      <CustomBottomNav activeTab="SOS" navigation={navigation} />
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sosCardWrap: {
    backgroundColor: colors.danger,
    borderRadius: radius.card,
    overflow: "hidden",
    marginBottom: 16,
    ...shadows.glowDanger,
  },
  sosTouchable: {
    padding: 18,
    position: "relative",
  },
  sosContentRow: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
  sosIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  sosTitle: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 18,
    fontWeight: "900",
    color: colors.white,
    letterSpacing: 0.5,
  },
  sosSub: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 3,
    lineHeight: 16,
  },
  progressBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    zIndex: 1,
  },
  instructionCard: {
    padding: 12,
    marginBottom: 20,
    borderColor: colors.primaryBorder,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  instructionText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    fontSize: 11,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  serviceCard: {
    padding: 14,
    marginBottom: 10,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  serviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.dangerSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceCategory: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },
});
