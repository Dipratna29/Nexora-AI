/**
 * useLocationTracking Hook
 * Manages location permission requests and GPS tracking
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import locationService from '../services/locationService';
import type {
  LocationCoordinates,
  LocationPermissionState,
  LocationTrackingStatus,
  LocationTrackingConfig,
  LocationTrackingState,
} from '../services/types';

interface UseLocationTrackingOptions {
  onLocationUpdate?: (coords: LocationCoordinates) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
  updateIntervalMs?: number;
}

/**
 * Hook for managing location tracking
 * Handles permissions, subscriptions, and error states
 */
export const useLocationTracking = (options: UseLocationTrackingOptions = {}) => {
  const {
    onLocationUpdate,
    onError,
    autoStart = false,
    updateIntervalMs = 60000,
  } = options;

  const [state, setState] = useState<LocationTrackingState>({
    status: 'idle',
    currentLocation: null,
    permissionState: 'not-requested',
    lastUpdateTime: null,
    error: null,
    isTracking: false,
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize permission state on mount
  useEffect(() => {
    const checkPermission = async () => {
      const permissionState = await locationService.getLocationPermissionState();
      setState((prev) => ({ ...prev, permissionState }));
    };

    checkPermission();
  }, []);

  /**
   * Request location permission
   */
  const requestPermission = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      status: 'requesting-permission' as LocationTrackingStatus,
      error: null,
    }));

    const permissionState = await locationService.requestLocationPermission();

    if (permissionState === 'granted') {
      setState((prev) => ({
        ...prev,
        permissionState,
        status: 'idle' as LocationTrackingStatus,
      }));
      return true;
    } else if (permissionState === 'denied-forever') {
      setState((prev) => ({
        ...prev,
        permissionState,
        status: 'permission-denied' as LocationTrackingStatus,
        error: 'Location permission permanently denied. Please enable in settings.',
      }));
    } else {
      setState((prev) => ({
        ...prev,
        permissionState,
        status: 'permission-denied' as LocationTrackingStatus,
        error: 'Location permission denied.',
      }));
    }

    return false;
  }, []);

  /**
   * Get current location (one-time)
   */
  const getCurrentLocation = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      status: 'acquiring-location' as LocationTrackingStatus,
      error: null,
    }));

    try {
      // Check permission first
      if (state.permissionState !== 'granted') {
        const permGranted = await requestPermission();
        if (!permGranted) {
          setState((prev) => ({
            ...prev,
            status: 'permission-denied' as LocationTrackingStatus,
            error: 'Location permission required',
          }));
          return null;
        }
      }

      const coords = await locationService.getCurrentLocation();

      if (coords) {
        const now = Date.now();
        setState((prev) => ({
          ...prev,
          currentLocation: coords,
          lastUpdateTime: now,
          status: 'idle' as LocationTrackingStatus,
          error: null,
        }));

        onLocationUpdate?.(coords);
        return coords;
      } else {
        setState((prev) => ({
          ...prev,
          status: 'error' as LocationTrackingStatus,
          error: 'Location unavailable',
        }));
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setState((prev) => ({
        ...prev,
        status: 'error' as LocationTrackingStatus,
        error: errorMessage,
      }));
      onError?.(errorMessage);
      return null;
    }
  }, [state.permissionState, requestPermission, onLocationUpdate, onError]);

  /**
   * Start continuous location tracking
   */
  const startTracking = useCallback(async () => {
    // Check permission
    if (state.permissionState !== 'granted') {
      const permGranted = await requestPermission();
      if (!permGranted) {
        setState((prev) => ({
          ...prev,
          status: 'permission-denied' as LocationTrackingStatus,
          error: 'Location permission required to start tracking',
        }));
        return false;
      }
    }

    setState((prev) => ({
      ...prev,
      status: 'tracking' as LocationTrackingStatus,
      error: null,
      isTracking: true,
    }));

    try {
      // Get initial location
      const initialCoords = await locationService.getCurrentLocation();
      if (initialCoords) {
        const now = Date.now();
        setState((prev) => ({
          ...prev,
          currentLocation: initialCoords,
          lastUpdateTime: now,
        }));
        onLocationUpdate?.(initialCoords);
      }

      // Set up location watcher
      const unsubscribe = locationService.watchLocation(
        (coords) => {
          const now = Date.now();
          setState((prev) => ({
            ...prev,
            currentLocation: coords,
            lastUpdateTime: now,
          }));
          onLocationUpdate?.(coords);
        },
        (error) => {
          setState((prev) => ({
            ...prev,
            status: 'error' as LocationTrackingStatus,
            error: error.message,
          }));
          onError?.(error.message);
        },
        { updateIntervalMs }
      );

      unsubscribeRef.current = unsubscribe;
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setState((prev) => ({
        ...prev,
        status: 'error' as LocationTrackingStatus,
        error: errorMessage,
        isTracking: false,
      }));
      onError?.(errorMessage);
      return false;
    }
  }, [state.permissionState, requestPermission, updateIntervalMs, onLocationUpdate, onError]);

  /**
   * Stop continuous location tracking
   */
  const stopTracking = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      status: 'idle' as LocationTrackingStatus,
      isTracking: false,
    }));
  }, []);

  /**
   * Start auto-sending location to backend at intervals
   */
  const startAutoSend = useCallback(
    async (intervalMs: number = updateIntervalMs) => {
      // First attempt
      const result = await locationService.trackAndSendLocation({ updateIntervalMs: intervalMs });

      if (!result.success && onError) {
        onError(result.error || 'Failed to send location');
      }

      // Set up interval
      updateIntervalRef.current = setInterval(async () => {
        const result = await locationService.trackAndSendLocation({ updateIntervalMs: intervalMs });

        if (!result.success && onError) {
          onError(result.error || 'Failed to send location');
        }
      }, intervalMs);
    },
    [updateIntervalMs, onError]
  );

  /**
   * Stop auto-sending
   */
  const stopAutoSend = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, []);

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      stopTracking();
      stopAutoSend();
    };
  }, [stopTracking, stopAutoSend]);

  return {
    state,
    requestPermission,
    getCurrentLocation,
    startTracking,
    stopTracking,
    startAutoSend,
    stopAutoSend,
  };
};

export default useLocationTracking;
