/**
 * Location Service
 * Handles GPS location tracking, manual geocoding, and communication with backend.
 * Production-ready: never crashes or blocks UI on GPS failure.
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';
import type {
  LocationCoordinates,
  LocationPermissionState,
  LocationUpdateResponse,
  LocationTrackingConfig,
  ActiveLocation,
} from './types';
import { POPULAR_TRAVEL_LOCATIONS, CuratedLocation } from './locationConstants';

// Default configuration
const DEFAULT_CONFIG: LocationTrackingConfig = {
  updateIntervalMs: 60000, // 60 seconds between updates
  foregroundTracking: true,
  backgroundTracking: false,
};

/**
 * Check if system location services (GPS) are enabled on the device
 */
export const isLocationServicesEnabled = async (): Promise<boolean> => {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch (error) {
    console.log('[LocationService] hasServicesEnabledAsync check error:', error);
    return false;
  }
};

/**
 * Get current permission state
 */
export const getLocationPermissionState = async (): Promise<LocationPermissionState> => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();

    if (status === 'granted') {
      return 'granted';
    } else if (status === 'denied') {
      return 'denied';
    } else if (status === 'undetermined') {
      return 'not-requested';
    }

    return 'denied-forever';
  } catch (error) {
    console.log('[LocationService] Error checking location permission:', error);
    return 'denied';
  }
};

/**
 * Request foreground location permission
 */
export const requestLocationPermission = async (): Promise<LocationPermissionState> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status === 'granted') {
      return 'granted';
    } else if (status === 'denied') {
      return 'denied';
    }

    return 'denied-forever';
  } catch (error) {
    console.log('[LocationService] Error requesting location permission:', error);
    return 'denied';
  }
};

/**
 * Get last known GPS coordinates (fast, low battery, instant fallback)
 */
export const getLastKnownLocation = async (): Promise<LocationCoordinates | null> => {
  try {
    const location = await Location.getLastKnownPositionAsync();
    if (!location) return null;

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      altitudeAccuracy: location.coords.altitudeAccuracy ?? null,
      heading: location.coords.heading,
      speed: location.coords.speed,
    };
  } catch (error) {
    console.log('[LocationService] Error getting last known location (non-fatal):', error);
    return null;
  }
};

/**
 * Get current GPS coordinates safely.
 * Never throws blocking errors, never hangs, and never returns fake coordinates.
 */
export const getCurrentLocation = async (): Promise<LocationCoordinates | null> => {
  try {
    // 1. Check if device location services are turned on
    const isEnabled = await isLocationServicesEnabled();
    if (!isEnabled) {
      console.log('[LocationService] Location services disabled on device.');
      return null;
    }

    // 2. Check permission
    const permission = await getLocationPermissionState();
    if (permission !== 'granted') {
      console.log('[LocationService] Location permission not granted:', permission);
      return null;
    }

    // 3. Try to get current position with balanced accuracy and 7-second timeout
    const positionPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.log('[LocationService] getCurrentPositionAsync timed out after 7s');
        resolve(null);
      }, 7000);
    });

    const location = await Promise.race([positionPromise, timeoutPromise]);

    if (location && location.coords) {
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        altitudeAccuracy: location.coords.altitudeAccuracy ?? null,
        heading: location.coords.heading,
        speed: location.coords.speed,
      };
    }

    // 4. Fallback to last known position if current acquisition timed out or returned empty
    return await getLastKnownLocation();
  } catch (error) {
    console.log('[LocationService] getCurrentLocation non-fatal notice, trying last known position:', error);
    return await getLastKnownLocation();
  }
};

/**
 * Watch location changes (for continuous tracking)
 */
export const watchLocation = (
  onLocationChange: (coords: LocationCoordinates) => void,
  onError: (error: Error) => void,
  config: Partial<LocationTrackingConfig> = {}
): (() => void) => {
  const settings = { ...DEFAULT_CONFIG, ...config };
  let unsubscribeFn: (() => void) | null = null;

  Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: settings.updateIntervalMs,
      distanceInterval: 10,
    },
    (location) => {
      const coords: LocationCoordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        altitudeAccuracy: location.coords.altitudeAccuracy ?? null,
        heading: location.coords.heading,
        speed: location.coords.speed,
      };
      onLocationChange(coords);
    }
  )
    .then((subscription) => {
      unsubscribeFn = () => subscription.remove();
    })
    .catch((error) => {
      console.log('[LocationService] watchLocation notice:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    });

  return () => {
    if (unsubscribeFn) {
      unsubscribeFn();
    }
  };
};

/**
 * Reverse geocode coordinates to get a clean human-readable name and address
 */
export const reverseGeocodeCoords = async (
  latitude: number,
  longitude: number
): Promise<{ name: string; address: string }> => {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results && results.length > 0) {
      const place = results[0];
      const parts: string[] = [];

      if (place.name && place.name !== place.street) parts.push(place.name);
      if (place.street) parts.push(place.street);
      if (place.district || place.subregion) parts.push(place.district || place.subregion || '');
      if (place.city) parts.push(place.city);
      if (place.region) parts.push(place.region);

      const cleanParts = parts.filter(Boolean);
      const name = place.name || place.district || place.city || 'Current Location';
      const address = cleanParts.length > 0 ? cleanParts.join(', ') : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      return { name, address };
    }
  } catch (error) {
    console.log('[LocationService] reverseGeocode non-critical notice:', error);
  }

  // Fallback to match curated locations or coordinates string
  const matched = POPULAR_TRAVEL_LOCATIONS.find(
    (loc) => Math.abs(loc.latitude - latitude) < 0.05 && Math.abs(loc.longitude - longitude) < 0.05
  );

  if (matched) {
    return {
      name: matched.name,
      address: `${matched.area}, ${matched.city}, ${matched.state}`,
    };
  }

  return {
    name: 'Selected Location',
    address: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
  };
};

export interface LocationSearchResult {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  latitude: number;
  longitude: number;
  isCurated?: boolean;
}

/**
 * Real geocoding search for city, area, landmark, or address
 * Never generates fake coordinates.
 */
export const searchLocations = async (query: string): Promise<LocationSearchResult[]> => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    // Return curated popular list
    return POPULAR_TRAVEL_LOCATIONS.map((loc) => ({
      id: loc.id,
      name: loc.name,
      address: `${loc.area}, ${loc.city}, ${loc.state}`,
      city: loc.city,
      state: loc.state,
      latitude: loc.latitude,
      longitude: loc.longitude,
      isCurated: true,
    }));
  }

  const results: LocationSearchResult[] = [];

  // 1. Check curated directory for instant matches
  const curatedMatches = POPULAR_TRAVEL_LOCATIONS.filter(
    (loc) =>
      loc.name.toLowerCase().includes(trimmed) ||
      loc.area.toLowerCase().includes(trimmed) ||
      loc.city.toLowerCase().includes(trimmed) ||
      loc.state.toLowerCase().includes(trimmed)
  );

  for (const match of curatedMatches) {
    results.push({
      id: match.id,
      name: match.name,
      address: `${match.area}, ${match.city}, ${match.state}`,
      city: match.city,
      state: match.state,
      latitude: match.latitude,
      longitude: match.longitude,
      isCurated: true,
    });
  }

  // 2. Perform live geocoding using expo-location for arbitrary addresses or landmarks
  try {
    const geocoded = await Location.geocodeAsync(query);
    if (geocoded && geocoded.length > 0) {
      for (let i = 0; i < Math.min(geocoded.length, 5); i++) {
        const item = geocoded[i];
        if (
          typeof item.latitude === 'number' &&
          typeof item.longitude === 'number' &&
          item.latitude >= -90 &&
          item.latitude <= 90 &&
          item.longitude >= -180 &&
          item.longitude <= 180
        ) {
          // Check if already matched
          const exists = results.some(
            (r) => Math.abs(r.latitude - item.latitude) < 0.005 && Math.abs(r.longitude - item.longitude) < 0.005
          );

          if (!exists) {
            const rev = await reverseGeocodeCoords(item.latitude, item.longitude);
            results.push({
              id: `geo_${item.latitude.toFixed(4)}_${item.longitude.toFixed(4)}_${i}`,
              name: rev.name || query,
              address: rev.address || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`,
              latitude: item.latitude,
              longitude: item.longitude,
              isCurated: false,
            });
          }
        }
      }
    }
  } catch (geoError) {
    console.log('[LocationService] Geocode search notice (non-fatal):', geoError);
  }

  return results;
};

/**
 * Send location to backend
 */
export const sendLocationToBackend = async (
  coordinates: { latitude: number; longitude: number; accuracy?: number | null }
): Promise<LocationUpdateResponse> => {
  try {
    const userStr = await AsyncStorage.getItem('user');
    if (!userStr) {
      return {
        success: false,
        message: 'User not authenticated',
      };
    }

    const user: any = JSON.parse(userStr);
    const userId = user.id || user.user_id;
    if (!userId) {
      return {
        success: false,
        message: 'Invalid user ID',
      };
    }

    const response = await api.post<LocationUpdateResponse>('/crowd/location-update', {
      user_id: userId,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      accuracy: coordinates.accuracy ?? 15,
    });

    return response.data;
  } catch (error) {
    console.log('[LocationService] Error sending location to backend (non-critical):', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to send location: ${errorMessage}`,
    };
  }
};

/**
 * Complete location tracking flow:
 * 1. Check/request permission
 * 2. Get current location
 * 3. Send to backend
 */
export const trackAndSendLocation = async (
  config: Partial<LocationTrackingConfig> = {}
): Promise<{
  success: boolean;
  location: LocationCoordinates | null;
  backendResponse: LocationUpdateResponse | null;
  error: string | null;
}> => {
  try {
    const permissionState = await getLocationPermissionState();

    if (permissionState !== 'granted') {
      return {
        success: false,
        location: null,
        backendResponse: null,
        error: 'Location permission not granted',
      };
    }

    const location = await getCurrentLocation();

    if (!location) {
      return {
        success: false,
        location: null,
        backendResponse: null,
        error: 'Unable to detect location',
      };
    }

    const backendResponse = await sendLocationToBackend(location);

    return {
      success: backendResponse.success,
      location,
      backendResponse,
      error: backendResponse.success ? null : backendResponse.message,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      location: null,
      backendResponse: null,
      error: errorMessage,
    };
  }
};

export const openLocationSettings = async (): Promise<void> => {
  try {
    const { Linking } = require('react-native');
    await Linking.openSettings();
  } catch (error) {
    console.log('[LocationService] Error opening settings:', error);
  }
};

export default {
  isLocationServicesEnabled,
  getLocationPermissionState,
  requestLocationPermission,
  getCurrentLocation,
  getLastKnownLocation,
  watchLocation,
  reverseGeocodeCoords,
  searchLocations,
  sendLocationToBackend,
  trackAndSendLocation,
  openLocationSettings,
};
