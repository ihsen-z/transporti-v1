import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MapViewWrapperProps {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  initialRegion: any;
  pickupColor?: string;
  dropoffColor?: string;
}

export const MapViewWrapper: React.FC<MapViewWrapperProps> = ({
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
}) => {
  return (
    <View style={styles.webFallback}>
      <Text style={styles.fallbackText}>[Carte Interactive disponible uniquement sur Mobile]</Text>
      <Text style={styles.coordsText}>
        Départ : {pickupLat.toFixed(4)}, {pickupLng.toFixed(4)}
      </Text>
      <Text style={styles.coordsText}>
        Arrivée : {dropoffLat.toFixed(4)}, {dropoffLng.toFixed(4)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  webFallback: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fallbackText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  coordsText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
