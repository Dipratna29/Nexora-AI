import React, { ReactNode } from "react";
import { View, StyleSheet, StatusBar, StyleProp, ViewStyle } from "react-native";
import { colors } from "../../theme";

interface CosmicBackgroundProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  showAtmosphericGlow?: boolean;
}

/**
 * TrustTrip Screen Canvas Container
 * Clean, calm matte dark background (#131321) with refined subtle contrast.
 */
export default function CosmicBackground({
  children,
  style,
  showAtmosphericGlow = false,
}: CosmicBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} translucent={false} />
      {showAtmosphericGlow && (
        <View style={styles.topAtmosphere} pointerEvents="none" />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topAtmosphere: {
    position: "absolute",
    top: -80,
    left: "20%",
    width: 240,
    height: 180,
    borderRadius: 120,
    backgroundColor: "rgba(70, 240, 210, 0.04)",
  },
});
