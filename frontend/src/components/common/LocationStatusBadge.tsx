import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import AppIcon from './AppIcon';
import { colors, radius, typography } from '../../theme';
import locationService from '../../services/locationService';

export type LocationBadgeState =
  | 'active'
  | 'acquiring'
  | 'unavailable'
  | 'permission_required'
  | 'services_off'
  | 'manual';

interface LocationStatusBadgeProps {
  state: LocationBadgeState;
  onPress?: () => void;
  style?: object;
  showIcon?: boolean;
}

export default function LocationStatusBadge({
  state,
  onPress,
  style,
  showIcon = true,
}: LocationStatusBadgeProps) {
  const getConfig = () => {
    switch (state) {
      case 'active':
        return {
          label: 'GPS Location',
          color: colors.primary,
          bg: 'rgba(70, 240, 210, 0.12)',
          border: 'rgba(70, 240, 210, 0.3)',
          icon: 'location' as const,
          isLoading: false,
        };
      case 'manual':
        return {
          label: 'Manual Location',
          color: colors.cream,
          bg: 'rgba(251, 226, 180, 0.12)',
          border: 'rgba(251, 226, 180, 0.3)',
          icon: 'pencil' as const,
          isLoading: false,
        };
      case 'acquiring':
        return {
          label: 'Getting Location...',
          color: colors.primary,
          bg: 'rgba(70, 240, 210, 0.12)',
          border: 'rgba(70, 240, 210, 0.3)',
          icon: 'navigate-outline' as const,
          isLoading: true,
        };
      case 'permission_required':
        return {
          label: 'Permission Required',
          color: colors.warning,
          bg: 'rgba(251, 226, 180, 0.12)',
          border: 'rgba(251, 226, 180, 0.3)',
          icon: 'alert-circle-outline' as const,
          isLoading: false,
        };
      case 'services_off':
        return {
          label: 'Location Services Off',
          color: colors.warning,
          bg: 'rgba(251, 226, 180, 0.12)',
          border: 'rgba(251, 226, 180, 0.3)',
          icon: 'power-outline' as const,
          isLoading: false,
        };
      case 'unavailable':
      default:
        return {
          label: 'Location Unavailable',
          color: colors.danger,
          bg: 'rgba(255, 77, 103, 0.12)',
          border: 'rgba(255, 77, 103, 0.3)',
          icon: 'location-outline' as const,
          isLoading: false,
        };
    }
  };

  const config = getConfig();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (state !== 'active' && state !== 'manual') {
      locationService.openLocationSettings();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {config.isLoading ? (
        <ActivityIndicator size="small" color={config.color} style={{ marginRight: 5 }} />
      ) : showIcon ? (
        <AppIcon name={config.icon} size={13} color={config.color} style={{ marginRight: 4 }} />
      ) : (
        <View style={[styles.dot, { backgroundColor: config.color }]} />
      )}
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
