import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TOUCH_TARGET, colors, fontSize, spacing } from '@/shared/theme';
import {
  ONGLETS_DEMANDES,
  type OngletDemande,
} from '../model/onglets';

interface Props {
  actif: OngletDemande;
  compteurs: Record<OngletDemande, number>;
  onSelect: (onglet: OngletDemande) => void;
}

/**
 * Onglets de « Mes demandes », ordonnés par qui doit agir (C2.1).
 *
 * Défilement horizontal : quatre libellés français ne tiennent pas sur une
 * largeur de téléphone, et les tronquer effacerait justement la distinction
 * entre « en négociation » et « à payer », qui est ce que l'écran doit rendre
 * lisible d'un coup d'œil.
 */
export function MyRequestsTabs({ actif, compteurs, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.barre}
      accessibilityRole="tablist"
    >
      {ONGLETS_DEMANDES.map((onglet) => {
        const estActif = onglet === actif;
        const compteur = compteurs[onglet];
        return (
          <Pressable
            key={onglet}
            testID={`mes-demandes-onglet-${onglet}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: estActif }}
            onPress={() => onSelect(onglet)}
            style={[styles.onglet, estActif && styles.ongletActif]}
          >
            <Text style={[styles.label, estActif && styles.labelActif]}>
              {t(`my_requests.tabs.${onglet}`)}
              {compteur > 0 ? ` · ${compteur}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  barre: { gap: spacing.sm, paddingVertical: spacing.xs },
  onglet: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
  },
  ongletActif: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[600],
  },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.neutral[700] },
  labelActif: { color: colors.neutral[0] },
});
