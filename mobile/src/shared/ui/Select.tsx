import { useState } from 'react';
import {
  FlatList,
  I18nManager,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, fontSize } from '@/shared/theme';

export interface SelectOption<T> {
  value: T;
  label: string;
}

interface Props<T> {
  label: string;
  placeholder: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  error?: string;
}

// Sélecteur générique (RN n'a pas de <select> natif) : champ + feuille modale.
// Utilisé pour gouvernorat, type de trajet, jour et heure.
export function Select<T extends string | number>({
  label,
  placeholder,
  value,
  options,
  onChange,
  error,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const textAlign = I18nManager.isRTL ? 'right' : 'left';
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { textAlign }]}>{label}</Text>

      <Pressable
        accessibilityRole="button"
        style={[styles.field, error ? styles.fieldError : null]}
        onPress={() => setOpen(true)}
      >
        <Text
          style={[styles.value, !selected && styles.placeholder]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.neutral[400]} />
      </Pressable>

      {error ? <Text style={[styles.error, { textAlign }]}>{error}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.row}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.rowText}>{item.label}</Text>
                  {item.value === value ? (
                    <Ionicons name="checkmark" size={18} color={colors.brand[500]} />
                  ) : null}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.neutral[700] },
  field: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[0],
  },
  fieldError: { borderColor: colors.error },
  value: { fontSize: fontSize.md, color: colors.neutral[900], flex: 1 },
  placeholder: { color: colors.neutral[400] },
  error: { fontSize: fontSize.sm, color: colors.error },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.neutral[0],
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    maxHeight: '70%',
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  rowText: { fontSize: fontSize.md, color: colors.neutral[900] },
});
