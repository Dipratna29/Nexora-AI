import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import AppIcon, { IconName } from "./AppIcon";
import { colors, radius, shadows } from "../../theme";

export type TabKey = "Home" | "Guide" | "SOS" | "MyComplaints" | "Profile";

interface CustomBottomNavProps {
  activeTab: TabKey;
  navigation: any;
}

interface TabItem {
  key: TabKey;
  label: string;
  iconActive: IconName;
  iconInactive: IconName;
  screen: string;
  isCenter?: boolean;
}

const TABS: TabItem[] = [
  { key: "Home", label: "Home", iconActive: "home", iconInactive: "home-outline", screen: "Home" },
  { key: "Guide", label: "Explore", iconActive: "compass", iconInactive: "compass-outline", screen: "Guide" },
  { key: "SOS", label: "SOS", iconActive: "alert-circle", iconInactive: "alert-circle-outline", screen: "SOS", isCenter: true },
  { key: "MyComplaints", label: "Activity", iconActive: "document-text", iconInactive: "document-text-outline", screen: "Dashboard" },
  { key: "Profile", label: "Profile", iconActive: "person", iconInactive: "person-outline", screen: "Profile" },
];

export default function CustomBottomNav({ activeTab, navigation }: CustomBottomNavProps) {
  const handleTabPress = (tab: TabItem) => {
    if (activeTab === tab.key && tab.screen === "Home") return;
    navigation.navigate(tab.screen);
  };

  return (
    <View style={styles.outerContainer}>
      <View style={styles.navBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;

          if (tab.isCenter) {
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.85}
                onPress={() => handleTabPress(tab)}
                style={styles.centerButtonOuter}
              >
                <View style={styles.centerButtonInner}>
                  <AppIcon name="alert-circle" size={22} color={colors.white} />
                  <Text style={styles.centerLabel}>SOS</Text>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.7}
              onPress={() => handleTabPress(tab)}
              style={styles.tabItem}
            >
              <View style={styles.iconContainer}>
                {isActive && <View style={styles.activeIndicator} />}
                <AppIcon
                  name={isActive ? tab.iconActive : tab.iconInactive}
                  size={20}
                  color={isActive ? colors.primary : colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.primary : colors.textMuted },
                  isActive && { fontWeight: "700" },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 22 : 10,
    backgroundColor: colors.background,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    minWidth: 54,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    height: 24,
  },
  activeIndicator: {
    position: "absolute",
    top: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  centerButtonOuter: {
    top: -12,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.glowDanger,
  },
  centerButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.background,
  },
  centerLabel: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 1,
  },
});
