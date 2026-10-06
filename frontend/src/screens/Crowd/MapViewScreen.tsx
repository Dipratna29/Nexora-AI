import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import api from "../../config/api";
import CosmicBackground from "../../components/common/CosmicBackground";
import ScreenHeader from "../../components/common/ScreenHeader";
import SurfaceCard from "../../components/common/SurfaceCard";
import AppIcon from "../../components/common/AppIcon";
import ActiveLocationBar from "../../components/common/ActiveLocationBar";
import { useLocationContext } from "../../context/LocationContext";
import { StatusBadge } from "../../components/common/StatusIndicator";
import { colors, typography, radius, spacing } from "../../theme";
import type { CrowdLocationApiResponse, CrowdMapPin } from "./types";

export default function MapViewScreen() {
  const [selected, setSelected] = useState<number | null>(null);
  const [pins, setPins] = useState<CrowdMapPin[]>([]);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(60);
  const navigation = useNavigation<any>();
  const { activeLocation, isManual } = useLocationContext();

  const mapW = Dimensions.get("window").width;
  const mapH = Dimensions.get("window").height * 0.65;

  useEffect(() => {
    fetchLocations();
    const timer = setInterval(fetchLocations, intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [activeLocation, intervalSeconds]);

  const fetchLocations = async () => {
    try {
      const res = await api.get<CrowdLocationApiResponse[]>("/crowd/locations");
      if (Array.isArray(res.data)) {
        const mappedPins: CrowdMapPin[] = res.data.map((loc, index) => {
          const lat = loc.latitude ?? (activeLocation ? activeLocation.latitude : 0);
          const lng = loc.longitude ?? (activeLocation ? activeLocation.longitude : 0);
          const normX = Math.abs((lng * 100) % 1);
          const normY = Math.abs((lat * 100) % 1);
          const clampX = Math.min(Math.max(normX, 0.15), 0.85);
          const clampY = Math.min(Math.max(normY, 0.2), 0.8);

          return {
            id: index + 1,
            label: loc.location_name,
            x: clampX,
            y: clampY,
            color:
              loc.crowd_status === "OVERCROWDED"
                ? colors.danger
                : loc.crowd_status === "MODERATE"
                ? colors.cream
                : colors.primary,
            size: loc.crowd_status === "OVERCROWDED" ? 22 : 18,
            icon: "location",
            isMain: index === 0,
            raw: loc,
          };
        });
        setPins(mappedPins);
      }
    } catch {
      // Fallback
    }
  };

  const selectedPin = pins.find((p) => p.id === selected) || pins[0];

  return (
    <CosmicBackground>
      <ScreenHeader
        title="Interactive Safety Map"
        subtitle="Live precinct density radar"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={fetchLocations} style={{ padding: 8 }}>
            <AppIcon name="refresh" size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* ACTIVE LOCATION INDICATOR */}
      <ActiveLocationBar compact style={{ marginHorizontal: spacing.screenPadding, marginVertical: 6 }} />

      {/* RADAR MAP CONTAINER */}
      <View style={[styles.mapContainer, { width: mapW, height: mapH }]}>
        <View style={styles.radarGrid}>
          {/* Concentric radar rings */}
          <View style={[styles.radarRing, { width: mapW * 0.85, height: mapW * 0.85, borderRadius: (mapW * 0.85) / 2 }]} />
          <View style={[styles.radarRing, { width: mapW * 0.55, height: mapW * 0.55, borderRadius: (mapW * 0.55) / 2 }]} />
          <View style={[styles.radarRing, { width: mapW * 0.25, height: mapW * 0.25, borderRadius: (mapW * 0.25) / 2 }]} />

          {/* Crosshairs */}
          <View style={styles.crosshairH} />
          <View style={styles.crosshairV} />

          {/* PINS */}
          {pins.map((pin) => {
            const isSel = pin.id === selected;
            return (
              <TouchableOpacity
                key={pin.id}
                style={[
                  styles.pinWrap,
                  {
                    left: pin.x * (mapW - 60) + 10,
                    top: pin.y * (mapH - 60) + 10,
                  },
                ]}
                onPress={() => setSelected(pin.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.pinOuter,
                    {
                      borderColor: pin.color,
                      backgroundColor: isSel ? pin.color : "rgba(19, 19, 33, 0.85)",
                    },
                  ]}
                >
                  <AppIcon
                    name="location"
                    size={14}
                    color={isSel ? colors.background : pin.color}
                  />
                </View>
                <Text style={styles.pinLabel} numberOfLines={1}>
                  {pin.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FLOATING LEGEND */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Low</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.cream }]} />
            <Text style={styles.legendText}>Moderate</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
            <Text style={styles.legendText}>High</Text>
          </View>
        </View>
      </View>

      {/* SELECTED PIN DETAILS BOTTOM SHEET */}
      {selectedPin && (
        <SurfaceCard
          style={styles.bottomCard}
          variant="elevated"
          onPress={() => {
            if (selectedPin.raw) {
              navigation.navigate("CrowdLocationDetail", { location: selectedPin.raw });
            }
          }}
        >
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={typography.h4}>{selectedPin.label}</Text>
              <Text style={styles.cardSub}>
                Occupancy: {selectedPin.raw?.crowd_count ?? 0} / {selectedPin.raw?.capacity ?? 0} ({selectedPin.raw?.occupancy_percentage ?? 0}%)
              </Text>
            </View>
            <StatusBadge
              label={selectedPin.raw?.crowd_status ?? "NORMAL"}
              status={
                selectedPin.raw?.crowd_status === "OVERCROWDED"
                  ? "danger"
                  : selectedPin.raw?.crowd_status === "MODERATE"
                  ? "moderate"
                  : "ready"
              }
            />
          </View>
        </SurfaceCard>
      )}

      {/* TELEMETRY INTERVAL CHIPS */}
      <View style={styles.intervalRow}>
        <Text style={styles.intervalTitle}>Radar Telemetry:</Text>
        {[30, 60, 120].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.intervalChip, intervalSeconds === s && styles.intervalChipActive]}
            onPress={() => setIntervalSeconds(s)}
          >
            <Text style={[styles.intervalChipText, intervalSeconds === s && styles.intervalChipTextActive]}>
              {s}s
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    position: "relative",
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  radarGrid: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  radarRing: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(70, 240, 210, 0.12)",
  },
  crosshairH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(70, 240, 210, 0.08)",
  },
  crosshairV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(70, 240, 210, 0.08)",
  },
  pinWrap: {
    position: "absolute",
    alignItems: "center",
    maxWidth: 90,
  },
  pinOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pinLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.white,
    marginTop: 3,
    textAlign: "center",
  },
  legend: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "rgba(19, 19, 33, 0.90)",
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  bottomCard: {
    marginHorizontal: spacing.screenPadding,
    marginTop: 12,
    padding: 14,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  intervalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 10,
    gap: 8,
  },
  intervalTitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  intervalChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  intervalChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  intervalChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  intervalChipTextActive: {
    color: colors.background,
  },
});
