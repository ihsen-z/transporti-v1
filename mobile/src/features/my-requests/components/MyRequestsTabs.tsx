import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pill } from '@/shared/ui/Pill';
import { spacing } from '@/shared/theme';
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
      // `flexGrow: 0` : un ScrollView horizontal n'a pas de hauteur propre et
      // s'étire à toute la place verticale que son parent lui laisse. Dans la
      // colonne `flex: 1` d'AppScreen, les onglets sont devenus des pilules de
      // pleine hauteur (mesuré sur émulateur, 06/09). Le contenu impose la
      // hauteur, pas le conteneur.
      style={styles.zone}
      contentContainerStyle={styles.barre}
      accessibilityRole="tablist"
    >
      {ONGLETS_DEMANDES.map((onglet) => {
        const compteur = compteurs[onglet];
        return (
          <Pill
            key={onglet}
            testID={`mes-demandes-onglet-${onglet}`}
            label={`${t(`my_requests.tabs.${onglet}`)}${compteur > 0 ? ` · ${compteur}` : ''}`}
            selected={onglet === actif}
            onPress={() => onSelect(onglet)}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  zone: { flexGrow: 0 },
  barre: { gap: spacing.sm, paddingVertical: spacing.xs },
});
