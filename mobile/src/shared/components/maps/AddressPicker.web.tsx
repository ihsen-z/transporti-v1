import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
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
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onValueChange}
        placeholder="Entrez l'adresse..."
      />
      <View style={styles.mapContainer}>
        <View style={styles.webFallback}>
          <Text style={styles.fallbackText}>[Carte Interactive disponible uniquement sur Mobile]</Text>
          {latitude !== null && longitude !== null && (
            <Text style={styles.coordsText}>
              Coordonnées : {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </Text>
          )}
        </View>
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
  webFallback: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fallbackText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  coordsText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});
