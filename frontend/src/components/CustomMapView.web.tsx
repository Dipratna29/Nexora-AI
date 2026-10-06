import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function Marker({ title, coordinate }: any) {
  return (
    <View style={webStyles.markerPin}>
      <Text style={webStyles.pinIcon}>📍</Text>
      {title && <Text style={webStyles.markerTitle}>{title}</Text>}
    </View>
  );
}

export function Polyline() { return null; }
export function Circle() { return null; }

export default function CustomMapView({ style, initialRegion, region, children }: any) {
  const currentRegion = region || initialRegion || { latitude: 18.922, longitude: 72.8347 };

  return (
    <View style={[webStyles.mapContainer, style]}>
      <View style={webStyles.mapGridBackground}>
        <Text style={webStyles.watermark}>🗺 Location Map ({currentRegion.latitude?.toFixed(4)}, {currentRegion.longitude?.toFixed(4)})</Text>
        <View style={webStyles.childrenContainer}>
          {children}
        </View>
      </View>
    </View>
  );
}

const webStyles = StyleSheet.create({
  mapContainer: {
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    minHeight: 200,
  },
  mapGridBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  watermark: {
    position: 'absolute',
    top: 12,
    left: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  childrenContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerPin: {
    alignItems: 'center',
    margin: 8,
  },
  pinIcon: {
    fontSize: 24,
  },
  markerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
