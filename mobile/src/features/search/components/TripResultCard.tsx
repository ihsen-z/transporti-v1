import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { RouteRow } from '@/shared/ui/RouteRow';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { TripResultDto } from '../api/dto';

interface Props {
  trip: TripResultDto;
  onRequest: () => void;
}

export function TripResultCard({ trip, onRequest }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const km = trip.distance_km ? `≈ ${Math.round(Number(trip.distance_km))} km` : undefined;

  return (
    <Card>
      <Pressable
        testID={`trip-${trip.id}-owner`}
        style={styles.top}
        onPress={() => router.push({ pathname: '/transporteur/[id]', params: { id: String(trip.owner_id) } })}
        accessibilityRole="button"
      >
        <Avatar name={trip.owner_name} size={42} />
        <View style={styles.ownerBlock}>
          <Text style={styles.owner} numberOfLines={1}>{trip.owner_name}</Text>
          {trip.owner_rating !== null ? (
            <Text style={styles.rating}>
              ★ {trip.owner_rating.toFixed(1)} ({trip.owner_review_count})
            </Text>
          ) : null}
        </View>
        {trip.owner_verification_status === 'VERIFIED' ? (
          <Badge label={t('trust.status.VERIFIED')} variant="verified" icon="shield-check" />
        ) : null}
        {/* E-05 — badge RETIRÉ tant que `jobs/<id>/book-return/` n'est pas
            câblé. Il annonçait une immédiateté que l'étape suivante contredit :
            le seul bouton de la carte reste « Envoyer une demande », qui attend
            l'accord du transporteur. Sur une place de marché dont le premier
            produit est la confiance, un badge absent coûte moins qu'un badge
            qui ment. À réactiver avec la réservation immédiate (lot 6). */}
      </Pressable>

      <View style={styles.route}>
        <RouteRow from={trip.pickup_governorate} to={trip.dropoff_governorate} middle={km} />
      </View>

      <View style={styles.meta}>
        <Badge label={t('search.badge_return')} variant="brand" />
      </View>

      {/* C1.2 — l'argument de conversion du pivot : « vous payez moins parce
          que le camion roulait deja ». Sur sa PROPRE ligne, pleine largeur
          (IA-5), et jamais un montant nu : la base de comparaison
          l'accompagne, sans quoi le chiffre n'est pas verifiable.

          Il etait auparavant le troisieme element d'une rangee avec le prix et
          le bouton. Le commentaire disait « ligne dediee », la mise en page
          disait le contraire, et le defaut est reste invisible tant que le
          serveur ne renvoyait aucune economie. Des que le jeu de recette en a
          produit une (lot 5), la recette du 04/09 a montre le resultat : le
          bloc debordait la carte, le montant etait coupe en plein chiffre
          (« Vous economisez 7… ») et le bouton « Envoyer une demande » avait
          entierement disparu. La cliente ne pouvait plus agir depuis la carte
          qui devait la convaincre. */}
      {trip.estimated_savings !== null && trip.savings_basis !== null ? (
        <View style={styles.economie} testID="recherche-trajet-economie">
          <Text style={styles.economieMontant}>
            {t('search.savings', { amount: Math.round(trip.estimated_savings) })}
          </Text>
          <Text
            style={styles.economieBase}
            testID="recherche-trajet-economie-base"
          >
            {t('search.savings_basis', { amount: Math.round(trip.savings_basis) })}
          </Text>
        </View>
      ) : null}

      {/* Prix et action EMPILES, et non cote a cote. La fourchette fait 212 dp
          en 22 px gras, le bouton 162 : 386 dp pour une carte qui en offre 329.
          Les mettre en rangee tronquait le prix — « 100.00 – 140.… », soit le
          second chiffre le plus important de la carte ampute de sa devise.
          Empiles, les deux tiennent en entier, et le bouton pleine largeur est
          au passage une cible plus franche. */}
      <View style={styles.foot}>
        {/* VERT = valeur : fourchette de prix serveur.

            Repli quand la fourchette manque. Le formulaire de publication
            exige les deux prix, donc un retour publie par l'application en a
            toujours — mais la recette du 03/09 a trouve une ligne heritee sans
            prix, et la carte annoncait « – TND ». Un tiret suivi d'une devise
            ne veut rien dire ; « Prix a negocier » dit ce qu'il faut faire. */}
        <Text style={styles.price} numberOfLines={1}>
          {trip.price_tnd_min === null
            ? t('search.price_negotiable')
            : t('search.price_range', {
                min: trip.price_tnd_min,
                max: trip.price_tnd_max ?? trip.price_tnd_min,
              })}
        </Text>
        <Button
          testID={`trip-${trip.id}-request`}
          label={t('search.request.title')}
          onPress={onRequest}
          variant="cta"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ownerBlock: { flex: 1, gap: 2 },
  owner: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  rating: { fontSize: fontSize.sm, color: colors.neutral[500] },
  route: { marginTop: spacing.md },
  meta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  foot: { marginTop: spacing.lg, gap: spacing.md },
  price: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text.green,
  },
  economie: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.green[50],
    borderWidth: 1,
    borderColor: colors.green[600],
    gap: 2,
  },
  economieMontant: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text.green,
  },
  economieBase: { fontSize: fontSize.sm, color: colors.text.green },
});
