import * as Location from 'expo-location';
import { Coordinates, PermissionStatus } from '../types';

export const locationService = {
  checkForegroundPermission: async (): Promise<PermissionStatus> => {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status as PermissionStatus;
  },

  requestForegroundPermission: async (): Promise<PermissionStatus> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status as PermissionStatus;
  },

  checkBackgroundPermission: async (): Promise<PermissionStatus> => {
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status as PermissionStatus;
  },

  requestBackgroundPermission: async (): Promise<PermissionStatus> => {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status as PermissionStatus;
  },

  getCurrentPosition: async (): Promise<Coordinates | null> => {
    try {
      const hasPermission = await locationService.checkForegroundPermission();
      if (hasPermission !== 'granted') {
        const request = await locationService.requestForegroundPermission();
        if (request !== 'granted') {
          return null;
        }
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch (error) {
      console.error('Failed to get current location', error);
      return null;
    }
  },
};
