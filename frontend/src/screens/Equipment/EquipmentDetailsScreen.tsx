import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import api from "../../config/api";
import {
  createPaymentOrder,
  markPaymentFailed,
  openRazorpayCheckout,
  verifyPayment,
} from "../../services/paymentService";
import CosmicBackground from "../../components/common/CosmicBackground";
import SurfaceCard from "../../components/common/SurfaceCard";
import ScreenHeader from "../../components/common/ScreenHeader";
import AppIcon from "../../components/common/AppIcon";
import ActiveLocationBar from "../../components/common/ActiveLocationBar";
import { useLocationContext } from "../../context/LocationContext";
import locationService from "../../services/locationService";
import { StatusBadge } from "../../components/common/StatusIndicator";
import { colors, typography, radius, shadows, spacing } from "../../theme";

export default function EquipmentDetailsScreen({ route, navigation }: any) {
  const { item } = route.params;

  const [quantity, setQuantity] = useState(1);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<any>(null);
  const [showMap, setShowMap] = useState(false);
  const [pricePerItem, setPricePerItem] = useState(0);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const { activeLocation, isManual, detectGpsLocation, showFallback } = useLocationContext();

  const mapRef = useRef<MapView>(null);

  // Fetch real price from backend and sync active location
  useEffect(() => {
    fetchPrice();
    if (activeLocation) {
      setUserLocation({
        latitude: activeLocation.latitude,
        longitude: activeLocation.longitude,
      });
      setDeliveryLocation({
        latitude: activeLocation.latitude + 0.005,
        longitude: activeLocation.longitude + 0.005,
      });
    }
  }, [activeLocation]);

  const fetchPrice = async () => {
    if (!item || !item.id) return;
    setLoadingPrice(true);
    try {
      const res = await api.get(`/equipment/${item.id}`);
      const data = res.data;
      if (data && typeof data.price !== "undefined") setPricePerItem(Number(data.price));
      else setPricePerItem(Number(item.price || 200));
    } catch {
      setPricePerItem(Number(item.price || 200));
    } finally {
      setLoadingPrice(false);
    }
  };

  const totalPrice = pricePerItem * quantity;

  // Safe location attachment without blocking alerts
  const getLiveLocation = async () => {
    if (activeLocation) {
      setUserLocation({
        latitude: activeLocation.latitude,
        longitude: activeLocation.longitude,
      });
      setDeliveryLocation({
        latitude: activeLocation.latitude + 0.005,
        longitude: activeLocation.longitude + 0.005,
      });
      setShowMap(true);
      return;
    }

    setGettingLocation(true);
    try {
      const coords = await locationService.getCurrentLocation();
      if (coords) {
        setUserLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setDeliveryLocation({
          latitude: coords.latitude + 0.005,
          longitude: coords.longitude + 0.005,
        });
        setShowMap(true);
      } else {
        showFallback("unavailable");
      }
    } finally {
      setGettingLocation(false);
    }
  };

  // Simulate delivery movement
  useEffect(() => {
    if (!deliveryLocation || !userLocation) return;

    const interval = setInterval(() => {
      setDeliveryLocation((prev: any) => {
        if (!prev) return prev;
        return {
          latitude: prev.latitude + (userLocation.latitude - prev.latitude) * 0.1,
          longitude: prev.longitude + (userLocation.longitude - prev.longitude) * 0.1,
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [deliveryLocation, userLocation]);

  // Authoritative Razorpay payment flow
  const handleOrder = async () => {
    const loc = userLocation || (activeLocation ? { latitude: activeLocation.latitude, longitude: activeLocation.longitude } : null);
    if (!loc) {
      showFallback('unavailable');
      return;
    }

    setPlacingOrder(true);
    let paymentOrder: Awaited<ReturnType<typeof createPaymentOrder>> | null = null;
    let checkoutCompleted = false;
    try {
      paymentOrder = await createPaymentOrder(Number(item.id), quantity, loc);
      const checkoutResponse = await openRazorpayCheckout(paymentOrder, item.name);
      checkoutCompleted = true;
      const verified = await verifyPayment(paymentOrder.order_id, checkoutResponse);

      navigation.replace("PaymentSuccess", {
        paymentId: verified.payment_id,
        orderId: verified.order_id,
        amount: paymentOrder.amount,
        equipmentName: paymentOrder.equipment_name || item.name,
      });
    } catch (error: any) {
      const description = error?.description || error?.message || "Payment could not be completed.";
      if (paymentOrder?.order_id && !checkoutCompleted) {
        try {
          await markPaymentFailed(paymentOrder.order_id, description);
        } catch {
          // Payment failure reporting is best effort
        }
      }

      Alert.alert("Payment Incomplete", description, [{ text: "Try again" }]);
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <CosmicBackground>
      <ScreenHeader
        title="Equipment Checkout"
        subtitle={item.name}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO CARD */}
        <SurfaceCard style={styles.heroCard} variant="elevated">
          <View style={styles.iconCircle}>
            <AppIcon name="cube" size={36} color={colors.primary} />
          </View>
          <Text style={styles.equipmentName}>{item.name}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge
              label={item.inStock === false ? "OUT OF STOCK" : "VERIFIED AVAILABLE"}
              status={item.inStock === false ? "danger" : "ready"}
            />
          </View>
          <Text style={styles.descText}>
            {item.description || "Certified personal travel safety equipment inspected for regional safety compliance."}
          </Text>
        </SurfaceCard>

        {/* PRICING & QUANTITY */}
        <SurfaceCard style={styles.priceCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.metaLabel}>PRICE PER UNIT</Text>
            {loadingPrice ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.priceValue}>₹{pricePerItem.toFixed(2)}</Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <Text style={styles.metaLabel}>QUANTITY</Text>
            <View style={styles.qtyControl}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => quantity > 1 && setQuantity(quantity - 1)}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, styles.qtyBtnAdd]}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Text style={[styles.qtyBtnText, { color: colors.background }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <Text style={typography.h4}>Total Amount</Text>
            <Text style={styles.totalPriceValue}>₹{totalPrice.toFixed(2)}</Text>
          </View>
        </SurfaceCard>

        {/* DELIVERY DISPATCH LOCATION */}
        <SurfaceCard style={styles.locationCard}>
          <View style={styles.locHeaderRow}>
            <AppIcon name="location-outline" size={18} color={colors.primary} />
            <Text style={[typography.h4, { marginLeft: 8 }]}>Dispatch Delivery Point</Text>
          </View>

          <Text style={styles.locSub}>
            Express tourist safety gear dispatch is routed to your active GPS or chosen manual location.
          </Text>

          <ActiveLocationBar style={{ marginVertical: 8 }} />

          <TouchableOpacity
            style={[styles.locBtn, userLocation && styles.locBtnDone]}
            onPress={getLiveLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <AppIcon
                  name={userLocation ? "checkmark-circle" : "navigate-outline"}
                  size={18}
                  color={userLocation ? colors.background : colors.primary}
                />
                <Text style={[styles.locBtnText, userLocation && styles.locBtnTextDone]}>
                  {userLocation
                    ? activeLocation
                      ? `${activeLocation.source === 'MANUAL' ? '✏️ Manual: ' : '📍 GPS: '}${activeLocation.name}`
                      : `Attached: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`
                    : "Attach Coordinates"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </SurfaceCard>

        {/* LIVE MAP TRACKER */}
        {showMap && userLocation && (
          <SurfaceCard style={styles.mapCard}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Marker coordinate={userLocation} title="You" />
              {deliveryLocation && (
                <Marker coordinate={deliveryLocation} title="Courier Dispatch" />
              )}
            </MapView>
            <View style={styles.mapNote}>
              <AppIcon name="time-outline" size={14} color={colors.primary} />
              <Text style={styles.mapNoteText}>Estimated courier transit: ~35 mins to verified location</Text>
            </View>
          </SurfaceCard>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* PINNED PAY NOW FOOTER */}
      <View style={styles.footer}>
        <View style={styles.footerPriceCol}>
          <Text style={styles.footerPriceLabel}>TOTAL PAYABLE</Text>
          <Text style={styles.footerPriceValue}>₹{totalPrice.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, placingOrder && styles.btnDisabled]}
          onPress={handleOrder}
          disabled={placingOrder}
          activeOpacity={0.85}
        >
          {placingOrder ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <View style={styles.btnRow}>
              <AppIcon name="card" size={18} color={colors.background} />
              <Text style={styles.checkoutBtnText}>Pay with Razorpay</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 24,
  },
  heroCard: {
    alignItems: "center",
    padding: 22,
    marginBottom: 14,
    borderColor: colors.primaryBorder,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  equipmentName: {
    ...typography.h3,
    color: colors.white,
    textAlign: "center",
    marginBottom: 8,
  },
  badgeRow: {
    marginBottom: 10,
  },
  descText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  priceCard: {
    padding: 16,
    marginBottom: 14,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  priceValue: {
    ...typography.h4,
    color: colors.white,
  },
  totalPriceValue: {
    ...typography.h3,
    color: colors.primary,
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  qtyBtnAdd: {
    backgroundColor: colors.primary,
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.white,
  },
  qtyValue: {
    ...typography.h4,
    color: colors.white,
    paddingHorizontal: 14,
  },
  locationCard: {
    padding: 16,
    marginBottom: 14,
  },
  locHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  locSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  locBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.button,
    paddingVertical: 12,
    gap: 8,
  },
  locBtnDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  locBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
  },
  locBtnTextDone: {
    color: colors.background,
    fontWeight: "800",
  },
  mapCard: {
    overflow: "hidden",
    padding: 0,
    marginBottom: 14,
  },
  map: {
    width: "100%",
    height: 180,
  },
  mapNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: colors.surface,
    gap: 6,
  },
  mapNoteText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 14,
  },
  footerPriceCol: {
    justifyContent: "center",
  },
  footerPriceLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  footerPriceValue: {
    ...typography.h3,
    color: colors.primary,
    fontSize: 20,
    marginTop: 2,
  },
  checkoutBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.glowPrimary,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  checkoutBtnText: {
    fontFamily: typography.button.fontFamily,
    fontSize: 15,
    fontWeight: "800",
    color: colors.background,
  },
});
