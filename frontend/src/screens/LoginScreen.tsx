import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../config/api";
import { send_notification_to_user_welcome } from "../services/pushNotificationService";
import { useAuth } from "../context/AuthContext";
import CosmicBackground from "../components/common/CosmicBackground";
import SurfaceCard from "../components/common/SurfaceCard";
import AppIcon from "../components/common/AppIcon";
import { colors, typography, radius, shadows, spacing } from "../theme";

interface Props {
  navigation: {
    navigate: (screen: string) => void;
  };
  loginUser?: (user: any) => void;
}

export default function LoginScreen({ navigation, loginUser }: Props) {
  const { login: authLogin } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"username" | "password" | null>(null);

  const validate = (): string | null => {
    if (!username.trim()) return "Please enter your username.";
    if (!password) return "Please enter your password.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const login = async () => {
    if (loading) return;

    const error = validate();
    if (error) {
      Alert.alert("Required Information", error);
      return;
    }

    setLoading(true);
    try {
      const result = await authLogin(username, password);

      if (result.success) {
        // Welcome notification for first-time login
        try {
          const userRaw = await AsyncStorage.getItem("user");
          if (userRaw) {
            const parsed = JSON.parse(userRaw);
            const uid = parsed.id || parsed.user_id;
            if (uid) {
              const storageKey = `firstLogin_${uid}`;
              const hasLoggedIn = await AsyncStorage.getItem(storageKey);
              if (!hasLoggedIn) {
                await AsyncStorage.setItem(storageKey, "true");
                send_notification_to_user_welcome(uid).catch(() => {});
              }
            }
            if (loginUser) {
              loginUser(parsed);
            }
          }
        } catch {
          // Non-critical background task
        }
      } else {
        Alert.alert(
          "Sign In Failed",
          result.message || "Invalid username or password. Please verify your credentials."
        );
      }
    } catch {
      Alert.alert(
        "Connection Notice",
        "Unable to reach TrustTrip services. Please verify your internet connection and try again."
      );
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
            {/* BRAND HERO HEADER */}
            <View style={styles.brandHero}>
              <View style={styles.logoIconCircle}>
                <AppIcon name="shield-checkmark" size={36} color={colors.primary} />
              </View>
              <Text style={styles.brandTitle}>
                Trust<Text style={{ color: colors.primary }}>Trip</Text>
              </Text>
              <Text style={styles.brandSubtitle}>Travel Safe. Travel Smart.</Text>
            </View>

            {/* FORM CARD */}
            <SurfaceCard style={styles.formCard} variant="elevated">
              <Text style={styles.welcomeTitle}>Welcome back</Text>
              <Text style={styles.welcomeSubtitle}>
                Sign in to access your travel guardian & verified safety tools
              </Text>

              {/* USERNAME INPUT */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username or Email</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === "username" && styles.inputWrapperFocused,
                  ]}
                >
                  <AppIcon
                    name="person-outline"
                    size={18}
                    color={focusedField === "username" ? colors.primary : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your username"
                    placeholderTextColor={colors.textMuted}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* PASSWORD INPUT */}
              <View style={styles.inputGroup}>
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("ForgotPassword")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === "password" && styles.inputWrapperFocused,
                  ]}
                >
                  <AppIcon
                    name="lock-closed-outline"
                    size={18}
                    color={focusedField === "password" ? colors.primary : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    accessibilityLabel="Toggle password visibility"
                  >
                    <AppIcon
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* PRIMARY SIGN IN BUTTON */}
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={login}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <View style={styles.btnLoadingRow}>
                    <ActivityIndicator size="small" color={colors.background} />
                    <Text style={styles.primaryBtnText}>Signing in...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryBtnText}>Sign In</Text>
                )}
              </TouchableOpacity>

              {/* REGISTER LINK */}
              <View style={styles.registerRow}>
                <Text style={styles.registerPrompt}>Don't have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                  <Text style={styles.registerLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </SurfaceCard>

            {/* TRUST FOOTER */}
            <View style={styles.footerContainer}>
              <View style={styles.footerShieldRow}>
                <AppIcon name="shield-outline" size={14} color={colors.textMuted} />
                <Text style={styles.footerText}>Protected by TrustTrip Safety Guardian</Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 36,
    paddingBottom: 24,
  },
  brandHero: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primaryGlow,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandTitle: {
    fontFamily: typography.displayLarge.fontFamily,
    fontSize: 30,
    fontWeight: "900",
    color: colors.white,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  formCard: {
    padding: 22,
    borderColor: colors.border,
  },
  welcomeTitle: {
    ...typography.h2,
    fontSize: 22,
    color: colors.white,
  },
  welcomeSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 22,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "700",
    marginBottom: 8,
  },
  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  forgotPasswordLink: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    minHeight: 50,
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
    fontSize: 15,
    paddingVertical: 12,
  },
  eyeBtn: {
    padding: 6,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
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
  registerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 6,
  },
  registerPrompt: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  registerLink: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "800",
  },
  footerContainer: {
    alignItems: "center",
    marginTop: 32,
  },
  footerShieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
});
