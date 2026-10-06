/**
 * ActiveLocationBar.tsx
 * Visual indicator banner displaying active location source and place name.
 * Clearly distinguishes:
 * • GPS Location
 * • Manual Location
 * Allows traveler to change, reset to GPS, or continue without location anytime.
 * Uses official TrustTrip AppIcons (no emojis).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppIcon from './AppIcon';
import SurfaceCard from './SurfaceCard';
import { useLocationContext } from '../../context/LocationContext';
import { colors, typography, radius, spacing } from '../../theme';

interface ActiveLocationBarProps {
  style?: object;
  compact?: boolean;
}

export const ActiveLocationBar: React.FC<ActiveLocationBarProps> = ({ style, compact = false }) => {
  const {
    activeLocation,
    isManual,
    gpsStatus,
    isDetecting,
    clearManualLocation,
    detectGpsLocation,
    showFallback,
  } = useLocationContext();

  const navigation = useNavigation<any>();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleOpenMenu = () => {
    setMenuVisible(true);
  };

  const handleSelectManual = () => {
    setMenuVisible(false);
    try {
      navigation.navigate('SelectLocation');
    } catch {
      showFallback('unavailable');
    }
  };

  const handleUseGps = async () => {
    setMenuVisible(false);
    await clearManualLocation();
  };

  const handleDismissMenu = () => {
    setMenuVisible(false);
  };

  const isGpsActive = gpsStatus === 'ACTIVE';
  const isSearching = isDetecting || gpsStatus === 'SEARCHING';

  const renderLocationMenu = () => (
    <Modal
      visible={menuVisible}
      transparent
      animationType="fade"
      onRequestClose={handleDismissMenu}
    >
      <TouchableWithoutFeedback onPress={handleDismissMenu}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContainer}>
              <SurfaceCard variant="elevated" style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconCircle}>
                    <AppIcon name="location" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={typography.h4}>Location Preferences</Text>
                    <Text style={styles.modalSubtitle}>
                      Manage how TrustTrip tracks your location
                    </Text>
                  </View>
                </View>

                <View style={styles.modalDivider} />

                {/* OPTION 1: USE GPS */}
                <TouchableOpacity
                  style={[styles.menuOptionBtn, !isManual && isGpsActive && styles.menuOptionActive]}
                  onPress={handleUseGps}
                  activeOpacity={0.8}
                >
                  <View style={[styles.menuOptionIcon, { backgroundColor: 'rgba(70, 240, 210, 0.15)' }]}>
                    <AppIcon name="navigate" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.menuOptionTitle, { color: colors.primary }]}>
                      Use Current GPS Location
                    </Text>
                    <Text style={styles.menuOptionDesc}>
                      Detect real-time GPS coordinates automatically
                    </Text>
                  </View>
                  {!isManual && isGpsActive && (
                    <AppIcon name="checkmark-circle" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>

                {/* OPTION 2: SELECT MANUALLY */}
                <TouchableOpacity
                  style={[styles.menuOptionBtn, isManual && styles.menuOptionActive]}
                  onPress={handleSelectManual}
                  activeOpacity={0.8}
                >
                  <View style={[styles.menuOptionIcon, { backgroundColor: 'rgba(251, 226, 180, 0.15)' }]}>
                    <AppIcon name="pencil" size={18} color={colors.cream} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.menuOptionTitle, { color: colors.cream }]}>
                      Change Location Manually
                    </Text>
                    <Text style={styles.menuOptionDesc}>
                      Search city, landmark, area, or address
                    </Text>
                  </View>
                  {isManual && (
                    <AppIcon name="checkmark-circle" size={18} color={colors.cream} />
                  )}
                </TouchableOpacity>

                {/* OPTION 3: CLOSE / CANCEL */}
                <TouchableOpacity
                  style={styles.cancelOptionBtn}
                  onPress={handleDismissMenu}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelOptionText}>Close</Text>
                </TouchableOpacity>
              </SurfaceCard>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  if (compact) {
    return (
      <>
        <TouchableOpacity
          style={[styles.compactContainer, style]}
          onPress={handleOpenMenu}
          activeOpacity={0.8}
        >
          <View style={styles.compactLeft}>
            <AppIcon
              name={isManual ? 'pencil' : 'location'}
              size={13}
              color={isManual ? colors.cream : colors.primary}
            />
            <Text style={[styles.compactSourceText, { color: isManual ? colors.cream : colors.primary }]}>
              {isManual ? 'Manual' : 'GPS'}:
            </Text>
            <Text style={styles.compactNameText} numberOfLines={1}>
              {activeLocation?.name || 'Location Not Set'}
            </Text>
          </View>
          <AppIcon name="chevron-forward" size={13} color={colors.textMuted} />
        </TouchableOpacity>
        {renderLocationMenu()}
      </>
    );
  }

  return (
    <>
      <View style={[styles.container, isManual ? styles.manualContainer : styles.gpsContainer, style]}>
        <TouchableOpacity
          style={styles.contentWrap}
          onPress={handleOpenMenu}
          activeOpacity={0.8}
        >
          {/* ICON & STATUS BADGE */}
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: isManual ? 'rgba(251, 226, 180, 0.15)' : 'rgba(70, 240, 210, 0.15)' },
            ]}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <AppIcon
                name={isManual ? 'pencil' : 'location'}
                size={18}
                color={isManual ? colors.cream : colors.primary}
              />
            )}
          </View>

          {/* TEXT DETAILS */}
          <View style={styles.infoWrap}>
            <View style={styles.headerRow}>
              <View style={styles.sourceLabelRow}>
                <AppIcon
                  name={isManual ? 'pencil' : 'location'}
                  size={12}
                  color={isManual ? colors.cream : colors.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.sourceLabel, { color: isManual ? colors.cream : colors.primary }]}>
                  {isManual ? 'Manual Location' : 'GPS Location'}
                </Text>
              </View>

              {isGpsActive && !isManual && (
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>

            <Text style={styles.placeName} numberOfLines={1}>
              {activeLocation?.name || (isSearching ? 'Detecting location...' : 'Location unavailable')}
            </Text>

            {activeLocation?.address ? (
              <Text style={styles.placeAddress} numberOfLines={1}>
                {activeLocation.address}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* ACTION BUTTONS (CHANGE / RESET) */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.changeBtn}
            onPress={handleOpenMenu}
            activeOpacity={0.7}
          >
            <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>

          {isManual && (
            <TouchableOpacity
              style={styles.resetGpsBtn}
              onPress={handleUseGps}
              activeOpacity={0.7}
            >
              <AppIcon name="refresh" size={12} color={colors.primary} />
              <Text style={styles.resetGpsBtnText}>Use GPS</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {renderLocationMenu()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
  },
  gpsContainer: {
    backgroundColor: 'rgba(32, 32, 50, 0.92)',
    borderColor: 'rgba(70, 240, 210, 0.22)',
  },
  manualContainer: {
    backgroundColor: 'rgba(36, 34, 46, 0.95)',
    borderColor: 'rgba(251, 226, 180, 0.35)',
  },
  contentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sourceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(70, 240, 210, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginRight: 4,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  placeName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
  },
  placeAddress: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  changeBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  changeBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  resetGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(70, 240, 210, 0.12)',
    gap: 4,
  },
  resetGpsBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(32, 32, 50, 0.85)',
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  compactSourceText: {
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 4,
  },
  compactNameText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 18, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.screenPadding,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
  },
  modalCard: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(70, 240, 210, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 16,
  },
  menuOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  menuOptionActive: {
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  menuOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuOptionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cancelOptionBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelOptionText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ActiveLocationBar;
