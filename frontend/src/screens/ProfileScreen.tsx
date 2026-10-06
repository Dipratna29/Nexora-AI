import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import api from "../config/api";
import CosmicBackground from "../components/common/CosmicBackground";
import { useAuth } from "../context/AuthContext";
import SurfaceCard from "../components/common/SurfaceCard";
import ScreenHeader from "../components/common/ScreenHeader";
import AppIcon from "../components/common/AppIcon";
import { StatusBadge } from "../components/common/StatusIndicator";
import CustomBottomNav from "../components/common/CustomBottomNav";
import { colors, typography, radius, spacing } from "../theme";

export default function ProfileScreen({ logoutUser, navigation }: any) {
  const { logout: authLogout, refreshProfile: authRefreshProfile, user: authUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complaintCount, setComplaintCount] = useState(0);

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [mob, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [nationality, setNationality] = useState("");
  const [emergency_contact, setEmergency] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const user = await AsyncStorage.getItem("user");
      if (!user) return;

      const parsedUser = JSON.parse(user);
      const uname = parsedUser.username;
      setUsername(uname);

      const response = await api.get(`/profile/${uname}`);
      const data = response.data;

      setName(data.name || "");
      setMobile(data.mob || "");
      setAddress(data.address || "");
      setNationality(data.nationality || "");
      setEmergency(data.emergency_contact || "");

      const complaintRes = await api.get(`/user-complaints/${uname}`).catch(() => ({ data: [] }));
      const complaintData = Array.isArray(complaintRes.data) ? complaintRes.data : [];
      setComplaintCount(complaintData.length);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.put(`/profile/${username}`, {
        name,
        mob,
        address,
        nationality,
        emergency_contact,
      });

      if (response.status >= 200 && response.status < 300) {
        Alert.alert("Profile Updated", "Your traveler profile credentials have been saved.");
        setIsEditing(false);
        authRefreshProfile().catch(() => {});
      } else {
        Alert.alert("Notice", "Profile update could not be saved. Please try again.");
      }
    } catch {
      Alert.alert("Notice", "Unable to update profile. Please check your network.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Confirm Sign Out",
      "Are you sure you want to end your active TrustTrip security session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await authLogout();
              if (logoutUser) logoutUser();
            } catch (err) {
              console.log("[ProfileScreen] Logout error:", err);
            }
          },
        },
      ]
    );
  };

  return (
    <CosmicBackground>
      <ScreenHeader
        title="Traveler Profile"
        subtitle="Identity credentials & security settings"
        rightAction={
          <TouchableOpacity
            style={styles.editToggleBtn}
            onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <AppIcon
                  name={isEditing ? "checkmark" : "create-outline"}
                  size={14}
                  color={colors.background}
                />
                <Text style={styles.editToggleText}>
                  {isEditing ? "Save" : "Edit"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* AVATAR HERO CARD */}
        <SurfaceCard style={styles.heroCard} variant="elevated">
          <View style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              <AppIcon name="person" size={40} color={colors.primary} />
            </View>
          </View>

          <Text style={styles.userName}>{name || username || "Traveler"}</Text>
          <Text style={styles.userHandle}>@{username}</Text>

          <View style={styles.badgeRow}>
            <StatusBadge label="VERIFIED TRAVELER" status="ready" />
          </View>
        </SurfaceCard>

        {/* METRICS ROW */}
        <View style={styles.metricsRow}>
          <SurfaceCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>INCIDENTS</Text>
            <Text style={styles.metricValue}>{complaintCount}</Text>
          </SurfaceCard>

          <SurfaceCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>VERIFICATION</Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>100%</Text>
          </SurfaceCard>

          <SurfaceCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>SAFETY SCORE</Text>
            <Text style={[styles.metricValue, { color: colors.cream }]}>98%</Text>
          </SurfaceCard>
        </View>

        {/* PROFILE CREDENTIALS FORM */}
        <View style={styles.sectionHeader}>
          <Text style={typography.h3}>Personal Information</Text>
        </View>

        <SurfaceCard style={styles.formCard}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>FULL LEGAL NAME</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter full name"
                placeholderTextColor={colors.textMuted}
              />
            ) : (
              <Text style={styles.staticValue}>{name || "Not provided"}</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Nationality */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>NATIONALITY</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={nationality}
                onChangeText={setNationality}
                placeholder="Country of citizenship"
                placeholderTextColor={colors.textMuted}
              />
            ) : (
              <Text style={styles.staticValue}>{nationality || "Not provided"}</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Mobile */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={mob}
                onChangeText={setMobile}
                placeholder="Primary phone number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.staticValue}>{mob || "Not provided"}</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Emergency Contact */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMERGENCY CONTACT PHONE</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={emergency_contact}
                onChangeText={setEmergency}
                placeholder="Emergency hotline / family number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={[styles.staticValue, { color: colors.cream }]}>
                {emergency_contact || "Not configured"}
              </Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>RESIDENCE / ACCOMMODATION</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={address}
                onChangeText={setAddress}
                placeholder="Current hotel or home address"
                placeholderTextColor={colors.textMuted}
              />
            ) : (
              <Text style={styles.staticValue}>{address || "Not provided"}</Text>
            )}
          </View>
        </SurfaceCard>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <AppIcon name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutBtnText}>Sign Out of TrustTrip</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* BOTTOM NAV */}
      <CustomBottomNav activeTab="Profile" navigation={navigation} />
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  editToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    gap: 4,
  },
  editToggleText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 32,
  },
  heroCard: {
    alignItems: "center",
    padding: 22,
    marginBottom: 16,
    borderColor: colors.primaryBorder,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    ...typography.h3,
    color: colors.white,
  },
  userHandle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  badgeRow: {
    marginTop: 10,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  metricValue: {
    ...typography.h3,
    color: colors.white,
    marginTop: 4,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  formCard: {
    padding: 16,
    marginBottom: 20,
  },
  inputGroup: {
    paddingVertical: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  staticValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 14,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerSurface,
    borderWidth: 1,
    borderColor: colors.borderDanger,
    borderRadius: radius.button,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 20,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.danger,
  },
});
