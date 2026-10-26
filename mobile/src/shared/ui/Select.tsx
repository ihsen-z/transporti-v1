import { useMemo, useState } from 'react';
import {
  FlatList,
  I18nManager,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/icons';
import { Txt } from '@/shared/ui/Txt';
import { colors, radii, spacing, fontSize, FIELD_HEIGHT } from '@/shared/theme';
import { useSheetBottomPadding } from '@/shared/ui/useSheetBottomPadding';

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
  testID?: string;
  /**
   * Champ de recherche en tête de feuille. Pour les longues listes : les 24
   * gouvernorats se faisaient défiler à chaque recherche, vingt lignes depuis
   * Médenine ou Tataouine (défaut m-03 de l'audit du 06/09).
   */
  searchable?: boolean;
}

/** Minuscules sans accents : « beja » trouve « Béja », « GAB » trouve « Gabès ». */
function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
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
  testID,
  searchable = false,
}: Props<T>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const visibles = useMemo(() => {
    const q = normaliser(query);
    return q ? options.filter((o) => normaliser(o.label).includes(q)) : options;
  }, [options, query]);

  const fermer = () => {
    setOpen(false);
    // La recherche ne survit pas à la feuille : la prochaine ouverture repart
    // de la liste complète.
    setQuery('');
  };
  const textAlign = I18nManager.isRTL ? 'right' : 'left';
  const selected = options.find((o) => o.value === value);

  // Bord à bord Android 16 : la feuille ne colle pas la barre de gestes.
  const sheetPadding = useSheetBottomPadding(spacing.lg);

  return (
    <View style={styles.wrap}>
      <Txt style={[styles.label, { textAlign }]}>{label}</Txt>

      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.field, error ? styles.fieldError : null]}
        onPress={() => setOpen(true)}
      >
        <Txt style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Txt>
        <Icon name="chevron-down" size={18} color={colors.neutral[400]} />
      </Pressable>

      {error ? <Txt style={[styles.error, { textAlign }]}>{error}</Txt> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={fermer}>
        <Pressable style={styles.backdrop} onPress={fermer}>
          <View
            style={[
              styles.sheet,
              // Hauteur FIXE quand on peut chercher : une liste filtrée à deux
              // lignes ne fait pas rétrécir la feuille sous le clavier.
              searchable && styles.sheetSearchable,
              { paddingBottom: sheetPadding },
            ]}
            // Un tap dans la feuille (autour du champ, entre deux lignes) ne
            // doit pas la fermer comme un tap sur le fond.
            onStartShouldSetResponder={() => true}
          >
            <Txt style={styles.sheetTitle}>{label}</Txt>
            {searchable ? (
              <TextInput
                testID={testID ? `${testID}-search` : undefined}
                value={query}
                onChangeText={setQuery}
                placeholder={t('common.search_in_list')}
                placeholderTextColor={colors.neutral[400]}
                autoCorrect={false}
                autoCapitalize="none"
                accessibilityLabel={t('common.search_in_list')}
                style={[styles.search, { textAlign }]}
              />
            ) : null}
            <FlatList
              data={visibles}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Txt style={[styles.noMatch, { textAlign }]}>{t('common.no_match')}</Txt>
              }
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <Pressable
                  testID={testID ? `${testID}-option-${item.value}` : undefined}
                  accessibilityRole="button"
                  style={styles.row}
                  onPress={() => {
                    onChange(item.value);
                    fermer();
                  }}
                >
                  <Txt style={styles.rowText}>{item.label}</Txt>
                  {item.value === value ? (
                    <Icon name="check" size={18} color={colors.brand[500]} />
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
  // Même gabarit que TextField : le sélecteur EST un champ, et deux champs
  // empilés dans le même formulaire ne peuvent pas avoir deux rayons.
  wrap: { gap: 7 },
  label: { fontSize: fontSize.label, fontWeight: '600', color: colors.neutral[500] },
  field: {
    minHeight: FIELD_HEIGHT,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: radii.input,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[50],
  },
  fieldError: { borderColor: colors.error },
  value: { fontSize: fontSize.md, color: colors.neutral[900], flex: 1 },
  placeholder: { color: colors.neutral[400] },
  error: { fontSize: fontSize.label, fontWeight: '600', color: colors.text.error },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.neutral[0],
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    maxHeight: '70%',
  },
  sheetSearchable: { height: '70%' },
  search: {
    height: FIELD_HEIGHT,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.neutral[50],
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  noMatch: {
    fontSize: fontSize.md,
    color: colors.neutral[500],
    paddingVertical: spacing.md,
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
