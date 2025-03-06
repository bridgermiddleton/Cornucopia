import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';
import Geolocation from '@react-native-community/geolocation';

export type LocationPermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable';

export interface Location {
  latitude: number;
  longitude: number;
}

export const checkLocationPermission = async (): Promise<LocationPermissionStatus> => {
  const permission = Platform.select({
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  }) as Permission;

  try {
    const result = await check(permission);
    switch (result) {
      case RESULTS.GRANTED:
        return 'granted';
      case RESULTS.DENIED:
        return 'denied';
      case RESULTS.BLOCKED:
        return 'blocked';
      default:
        return 'unavailable';
    }
  } catch (error) {
    console.error('Error checking location permission:', error);
    return 'unavailable';
  }
};

export const requestLocationPermission = async (): Promise<LocationPermissionStatus> => {
  const permission = Platform.select({
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  }) as Permission;

  try {
    const result = await request(permission);
    switch (result) {
      case RESULTS.GRANTED:
        return 'granted';
      case RESULTS.DENIED:
        return 'denied';
      case RESULTS.BLOCKED:
        return 'blocked';
      default:
        return 'unavailable';
    }
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return 'unavailable';
  }
};

export const getCurrentLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
};

export const watchLocation = (
  onLocationUpdate: (location: Location) => void,
  onError?: (error: any) => void
): number => {
  return Geolocation.watchPosition(
    (position) => {
      onLocationUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
    { enableHighAccuracy: true, distanceFilter: 10 }
  );
};

export const clearLocationWatch = (watchId: number): void => {
  Geolocation.clearWatch(watchId);
}; 