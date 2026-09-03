import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize, radii, TOUCH_TARGET } from '@/shared/theme';
import { useTransporterStats } from '@/features/stats/api/useTransporterStats';
import {
  useMyReturnTrips,
  daysUntilExpiry,
  isExpired,
} from '../api/useMyReturnTrips';
import type { ReturnTripDto } from '../api/dto';

/**
 * T1.1 — La section « Mes retours » de l'Accueil transporteur.
 *
 * Pendant mobile de `frontend/components/dashboard/ReturnsHubSection.tsx`.
 *
 * Deux blocs, dans l'ordre de ce qui compte :
 * 1. Les kilomètres à vide valorisés — la métrique unique du produit, rendue à
 *    celui qui la produit (IA-5). Les chiffres viennent de
 *    `get_transporter_stats()` côté serveur : le contrat du projet interdit de
 *    les recalculer ici.
 * 2. Les retours en ligne, avec l'accès à l'inventaire — qui n'a pas d'onglet
 *    dédié (la charte impose 4 onglets plus le bouton central), donc c'est ici
 *    son point d'entrée principal.
 */
export function ReturnsHubSection() {
  const { t } = useTranslation();
  const router = useRouter();

  const stats = useTransporterStats(true);
  const trajets = useMyReturnTrips();

  // Le type est explicite : `data ?? []` produit une union `ReturnTripDto[] |
  // never[]`, et TypeScript ne resout pas la signature de `.filter` sur une
  // union de types tableau — le parametre y devient un implicit any.
  const tous: ReturnTripDto[] = trajets.data ?? [];

  // Seuls les trajets encore visibles dans la recherche comptent comme « en
  // ligne » : un trajet expiré n'apporte plus rien au client.
  const enLigne = tous.filter(
    (trajet) => trajet.status === 'PUBLISHED' && !isExpired(trajet),
  );

  const km = stats.data?.km_transformed ?? 0;
  const remplissage = stats.data?.fill_rate ?? null;

  return (
    <View style={s.section}>
      {km > 0 ? (
        <View style={s.valeur} testID="hub-km-valorises">
          <Text style={s.valeurChiffre}>
            {t('trips.hub.km_valued', { km: Math.round(km) })}
          </Text>
          {remplissage !== null ? (
            <Text style={s.valeurDetail}>
              {t('trips.hub.fill_rate', { rate: remplissage })}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={s.carte}>
        <Txt style={s.titre}>{t('trips.hub.my_returns')}</Txt>

        {enLigne.length === 0 ? (
          <Txt style={s.vide} testID="hub-retours-vide">
            {t('trips.hub.none_online')}
          </Txt>
        ) : (
          <View style={s.liste} testID="hub-retours-liste">
            {enLigne.slice(0, 3).map((trajet) => (
              <View key={trajet.id} style={s.ligne}>
                <Text style={s.corridor}>
                  {trajet.pickup_governorate} → {trajet.dropoff_governorate}
                </Text>
                <Text style={s.expiration}>
                  {t('trips.hub.expires_in_days', {
                    count: daysUntilExpiry(trajet),
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Pressable
          testID="hub-voir-inventaire"
          onPress={() => router.push('/mes-retours')}
          accessibilityRole="button"
          style={s.lien}
        >
          <Text style={s.lienTexte}>{t('trips.hub.manage')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { gap: spacing.md },
  valeur: {
    borderWidth: 1,
    borderColor: colors.green[600],
    backgroundColor: colors.green[50],
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  valeurChiffre: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text.green,
  },
  valeurDetail: { fontSize: fontSize.sm, color: colors.text.green },
  carte: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  titre: { fontSize: fontSize.lg, fontWeight: '800', color: colors.neutral[900] },
  vide: { fontSize: fontSize.sm, color: colors.neutral[500] },
  liste: { gap: spacing.sm },
  ligne: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  corridor: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  expiration: { fontSize: fontSize.sm, color: colors.neutral[500] },
  // Mesure a 124x21 dp en recette, sans aucun padding — et c'est la SEULE
  // porte d'entree de l'inventaire depuis l'Accueil.
  lien: {
    alignSelf: 'flex-start',
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  lienTexte: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.brand[600],
  },
});
