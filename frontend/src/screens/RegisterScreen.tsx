import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
} from "react-native";
import api from "../config/api";
import { useAuth } from "../context/AuthContext";
import { getFriendlyErrorMessage } from "../utils/apiError";
import CosmicBackground from "../components/common/CosmicBackground";
import SurfaceCard from "../components/common/SurfaceCard";
import AppIcon from "../components/common/AppIcon";
import { colors, typography, radius, shadows, spacing } from "../theme";

export default function RegisterScreen({ navigation }: any) {
  const { register: authRegister } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [mob, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [nationality, setNationality] = useState("");
  const [emergency_contact, setEmergencyContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const register = async () => {
    if (loading) return;

    if (!name.trim()) {
      Alert.alert("Required Field", "Please provide your full name.");
      return;
    }

    if (!username.trim()) {
      Alert.alert("Required Field", "Please choose a username.");
      return;
    }

    if (!password) {
      Alert.alert("Required Field", "Please enter a password.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Security Requirement", "Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match. Please verify your password confirmation.");
      return;
    }

    setLoading(true);
    try {
      const result = await authRegister({
        username: username.trim(),
        password,
        name: name.trim(),
        mob: mob.trim(),
        address: address.trim(),
        nationality: nationality.trim(),
        emergency_contact: emergency_contact.trim(),
      });

      if (result.success) {
        Alert.alert(
          "Account Created",
          "Your TrustTrip traveler account has been created successfully. Please sign in to continue.",
          [
            {
              text: "Sign In",
              onPress: () => navigation.replace("Login"),
            },
          ]
        );
      } else {
        Alert.alert("Registration Notice", result.message || "Unable to create account.");
      }
    } catch (err: any) {
      const friendly = getFriendlyErrorMessage(
        err,
        "Registration failed. Please check your network and try again."
      );
      Alert.alert("Registration Notice", friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CosmicBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* TOP BAR */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <AppIcon name="arrow-back" size={20} color={colors.textPrimary} />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.brandTitle}>
                Trust<Text style={{ color: colors.primary }}>Trip</Text>
              </Text>
            </View>

            {/* FORM CARD */}
            <SurfaceCard style={styles.formCard} variant="elevated">
              <Text style={styles.headerTitle}>Create Account</Text>
              <Text style={styles.headerSubtitle}>
                Register to activate your personal safety guardian & community protection
              </Text>

              {/* 1. PERSONAL INFORMATION */}
              <Text style={styles.sectionHeader}>PERSONAL INFORMATION</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[styles.inputWrapper, focusedField === "name" && styles.inputWrapperFocused]}>
                  <AppIcon
                    name="person-outline"
                    size={18}
                    color={focusedField === "name" ? colors.primary : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nationality</Text>
                <View style={[styles.inputWrapper, focusedField === "nationality" && styles.inputWrapperFocused]}>
                  <AppIcon
                    name="globe-outline"
                    size={18}
                    color={focusedField === "nationality" ? colors.primary : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Indian, American, etc."
                    placeholderTextColor={colors.textMuted}
                    value={nationality}
                    onChangeText={setNationality}
                    onFocus={() => setFocusedField("nationality")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* 2. ACCOUNT CREDENTIALS */}
              <Text style={styles.sectionHeader}>ACCOUNT CREDENTIALS</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={[styles.inputWrapper, focusedField === "username" && styles.inputWrapperFocused]}>
                  <AppIcon
                    name="person-circle-outline"
                    size={18}
                    color={focusedField === "username" ? colors.primary : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Choose a unique username"
                    placeholderTextColor={colors.textMuted}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[styles.inputWrapper, focusedField === "password" && styles.inputWrapperFocused]}>
                  <AppIcon
                    name="lock-closed-outline"
                    size={18}
                    color={focusedField === "password" ? colors.primary : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={[styles.inputWrapper, focusedField === "confirmPassword" && styles.inputWrapperFocused]}>
                  <AppIcon
                    name="lock-closed-outline"
                    size={18}
                    color={focusedField === "confirmPassword" ? colors.primary : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter your password"
                    placeholderTextColor={colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    onFocus={() => setFocusedField("confirmPassword")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* 3. CONTACT & SAFETY */}
              <Text style={styles.sectionHeader}>CONTACT & EMERGENCY</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Phone</Text>
                <View style={[styles.inputWrapper, focusedField === "mob" && styles.inputWrapperFocused]}>
                  <AppIcon
                    name="call-outline"
                    size={18}
                    color={focusedField === "mob" ? colors.primary : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. +91 9876543210"
                    placeholderTextColor={colors.textMuted}
                    value={mob}
                    onChangeText={setMobile}
                    keyboardType="phone-pad"
                    onFocus={() => setFocusedField("mob")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Emergency Contact Phone</Text>
                <View style={[styles.inputWrapper, focusedField === "emergency" && styles.inputWrapperFocused]}>
                  <AppIcon
                    name="alert-circle-outline"
                    size={18}
                    color={focusedField === "emergency" ? colors.primary : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Emergency guardian phone"
                    placeholderTextColor={colors.textMuted}
                    value={emergency_contact}
                    onChangeText={setEmergencyContact}
                    keyboardType="phone-pad"
                    onFocus={() => setFocusedField("emergency")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Residential / Current Address</Text>
                <View style={[styles.inputWrapper, focusedField === "address" && styles.inputWrapperFocused]}>
                  <AppIcon
                    name="location-outline"
                    size={18}
                    color={focusedField === "address" ? colors.primary : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="City, State / Hotel"
                    placeholderTextColor={colors.textMuted}
                    value={address}
                    onChangeText={setAddress}
                    onFocus={() => setFocusedField("address")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* SUBMIT BUTTON */}
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={register}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <View style={styles.btnLoadingRow}>
                    <ActivityIndicator size="small" color={colors.background} />
                    <Text style={styles.primaryBtnText}>Creating Account...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryBtnText}>Create Account</Text>
                )}
              </TouchableOpacity>

              {/* SIGN IN LINK */}
              <View style={styles.loginRow}>
                <Text style={styles.loginPrompt}>Already have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </SurfaceCard>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 16,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingRight: 12,
  },
  backBtnText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  brandTitle: {
    fontFamily: typography.displayLarge.fontFamily,
    fontSize: 22,
    fontWeight: "900",
    color: colors.white,
    letterSpacing: -0.5,
  },
  formCard: {
    padding: 22,
    borderColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    fontSize: 22,
    color: colors.white,
  },
  headerSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 10,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    ...shadows.glowPrimary,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    fontFamily: typography.button.fontFamily,
    color: colors.background,
    fontSize: 16,
    fontWeight: "800",
  },
  btnLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 6,
  },
  loginPrompt: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  loginLink: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "800",
  },
});
