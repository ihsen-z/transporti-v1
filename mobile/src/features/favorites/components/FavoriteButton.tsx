import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/icons';
import { useAuthStore } from '@/core/auth/authStore';
import { colors, radii, TOUCH_TARGET } from '@/shared/theme';
import type { FavoriDto } from '../api/dto';
import { useFavorites } from '../api/useFavorites';
import { useToggleFavorite } from '../api/useToggleFavorite';

interface Props {
  transporterId: number;
  testID?: string;
}

/**
 * Ajout / retrait d'un transporteur des favoris.
 *
 * Ce bouton manquait : `useToggleFavorite` n'était appelé que depuis le
 * panneau de la liste, donc uniquement pour RETIRER. Une cliente qui n'utilise
 * que le mobile ne pouvait jamais alimenter la rubrique que son menu lui
 * promet (écart E-04 de l'audit du 02/09).
 *
 * Réservé au CLIENT : les deux endpoints portent `RequireRole('CLIENT')` et
 * répondraient 403 à un transporteur — afficher un cœur inopérant serait
 * exactement le genre de promesse non tenue que le lot 3 corrige.
 *
 * L'état ne se déduit pas d'une variable locale inversée à chaque appui : le
 * serveur décide et renvoie l'état résultant, la liste est invalidée, et ce
 * bouton relit. Deux appuis rapides ne peuvent donc pas désynchroniser
 * l'affichage de la base.
 */
export function FavoriteButton({ transporterId, testID }: Props) {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const estClient = role === 'CLIENT';

  const favoris = useFavorites(estClient);
  const bascule = useToggleFavorite();

  if (!estClient) return null;

  const liste: FavoriDto[] = favoris.data ?? [];
  const estFavori = liste.some((f) => f.transporter_id === transporterId);

  return (
    <Pressable
      testID={testID}
      onPress={() => bascule.mutate(transporterId)}
      disabled={bascule.isPending}
      accessibilityRole="button"
      accessibilityState={{ selected: estFavori, busy: bascule.isPending }}
      accessibilityLabel={t(estFavori ? 'favorites.remove_a11y' : 'favorites.add_a11y')}
      style={[s.bouton, estFavori && s.boutonActif, bascule.isPending && s.enCours]}
    >
      {/* Lucide n'a pas de paire plein/contour pour le cœur : l'état se lit à
          la couleur et au trait, comme pour les onglets de la barre. */}
      <Icon
        name="heart"
        size={22}
        color={estFavori ? colors.error : colors.neutral[400]}
        filled={estFavori}
      />
    </Pressable>
  );
}

const s = StyleSheet.create({
  // Cible tactile de la charte rendue explicite (44 dp).
  bouton: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
  },
  boutonActif: { borderColor: colors.errorBorder, backgroundColor: '#fef2f2' },
  enCours: { opacity: 0.6 },
});
