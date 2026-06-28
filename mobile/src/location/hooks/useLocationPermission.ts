import { useState, useEffect } from 'react';
import { Linking } from 'react-native';
import { locationService } from '../services/locationService';
import { PermissionStatus } from '../types';

export const useLocationPermission = () => {
  const [foregroundStatus, setForegroundStatus] = useState<PermissionStatus>('undetermined');
  const [backgroundStatus, setBackgroundStatus] = useState<PermissionStatus>('undetermined');

  const checkPermissions = async () => {
    const fg = await locationService.checkForegroundPermission();
    const bg = await locationService.checkBackgroundPermission();
    setForegroundStatus(fg);
    setBackgroundStatus(bg);
  };

  const requestForeground = async () => {
    const fg = await locationService.requestForegroundPermission();
    setForegroundStatus(fg);
    return fg;
  };

  const requestBackground = async () => {
    const bg = await locationService.requestBackgroundPermission();
    setBackgroundStatus(bg);
    return bg;
  };

  const openSettings = async () => {
    await Linking.openSettings();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkPermissions();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return {
    foregroundStatus,
    backgroundStatus,
    requestForeground,
    requestBackground,
    openSettings,
    refresh: checkPermissions,
  };
};
