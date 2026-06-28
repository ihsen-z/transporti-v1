export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'restricted';

export type TrackingMode = 'off' | 'foreground' | 'background';
