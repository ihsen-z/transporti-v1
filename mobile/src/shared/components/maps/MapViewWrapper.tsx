import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';

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
  initialRegion,
  pickupColor,
  dropoffColor,
}) => {
  return (
    <MapView style={styles.map} initialRegion={initialRegion}>
      <Marker coordinate={{ latitude: pickupLat, longitude: pickupLng }} title="Départ" pinColor={pickupColor} />
      <Marker coordinate={{ latitude: dropoffLat, longitude: dropoffLng }} title="Arrivée" pinColor={dropoffColor} />
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
