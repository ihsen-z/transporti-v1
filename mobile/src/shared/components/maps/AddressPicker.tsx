import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors, radius, spacing } from '../../../core/theme/tokens';

interface AddressPickerProps {
  value: string;
  onValueChange: (val: string) => void;
  latitude: number | null;
  longitude: number | null;
  onCoordinatesChange: (lat: number, lng: number) => void;
}

export const AddressPicker: React.FC<AddressPickerProps> = ({
  value,
  onValueChange,
  latitude,
  longitude,
  onCoordinatesChange,
}) => {
  const initialRegion = {
    latitude: latitude || 36.8065,
    longitude: longitude || 10.1815,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onValueChange}
        placeholder="Entrez l'adresse de livraison..."
      />
      <View style={styles.mapContainer}>
        {MapView ? (
          <MapView
            style={styles.map}
            initialRegion={initialRegion}
            onPress={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              onCoordinatesChange(latitude, longitude);
            }}
          >
            {latitude !== null && longitude !== null && (
              <Marker 
                coordinate={{ latitude, longitude }} 
                draggable
                onDragEnd={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  onCoordinatesChange(latitude, longitude);
                }}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.webFallback}>
            <Text style={styles.fallbackText}>[Carte Interactive disponible sur Mobile]</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.base,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  mapContainer: {
    height: 180,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  webFallback: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});
