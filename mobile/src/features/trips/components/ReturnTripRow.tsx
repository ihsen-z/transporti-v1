import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import {
  daysUntilExpiry,
  isExpired,
} from '../api/useMyReturnTrips';
import type { ReturnTripDto } from '../api/dto';

// T1.3 — une ligne de l'inventaire. Pendant mobile de
// frontend/components/return-trips/ReturnTripRow.tsx.
//
// L'expiration est affichée en clair et non déduite par le lecteur : un trajet
// qui expire sans que le transporteur s'en aperçoive disparaît silencieusement
// de la recherche client.

interface Props {
  trajet: ReturnTripDto;
  onProlonger: (trajet: ReturnTripDto) => void;
  onDupliquer: (trajet: ReturnTripDto) => void;
  onDepublier: (trajet: ReturnTripDto) => void;
  enCours?: boolean;
}

function useExpiration(trajet: ReturnTripDto) {
  const { t } = useTranslation();
  if (isExpired(trajet)) {
    return { texte: t('trips.inventory.expired'), style: s.expire };
  }
  const jours = daysUntilExpiry(trajet);
  if (jours <= 3) {
    return {
      texte: t('trips.inventory.expires_in', { count: jours }),
      style: s.urgent,
    };
  }
  return {
    texte: t('trips.inventory.expires_in', { count: jours }),
    style: s.normal,
  };
}

export function ReturnTripRow({
  trajet,
  onProlonger,
  onDupliquer,
  onDepublier,
  enCours = false,
}: Props) {
  const { t, i18n } = useTranslation();
  const expiration = useExpiration(trajet);
  const date = new Date(trajet.scheduled_time).toLocaleDateString(
    i18n.language === 'ar' ? 'ar-TN' : 'fr-FR',
    { day: 'numeric', month: 'long' },
  );

  return (
    <View style={[s.carte, enCours && s.enCours]} testID="retours-ligne">
      <Txt style={s.corridor}>
        {trajet.pickup_governorate} → {trajet.dropoff_governorate}
      </Txt>

      <View style={s.metaRow}>
        <Txt style={s.meta}>{date}</Txt>
        {trajet.available_capacity ? (
          <Txt style={s.meta}>{trajet.available_capacity}</Txt>
        ) : null}
      </View>

      <Txt style={[s.expiration, expiration.style]} testID="retours-ligne-expiration">
        {expiration.texte}
      </Txt>

      <View style={s.actions}>
        <Pressable
          testID="retours-ligne-prolonger"
          disabled={enCours}
          onPress={() => onProlonger(trajet)}
          style={s.action}
        >
          <Text style={s.actionLabel}>{t('trips.inventory.extend')}</Text>
        </Pressable>

        <Pressable
          testID="retours-ligne-dupliquer"
          disabled={enCours}
          onPress={() => onDupliquer(trajet)}
          style={s.action}
        >
          <Text style={s.actionLabel}>{t('trips.inventory.duplicate')}</Text>
        </Pressable>

        {/* Dépublier est destructif et notifie les demandes en attente :
            présenté en dernier, sans bordure, jamais au même poids visuel. */}
        <Pressable
          testID="retours-ligne-depublier"
          disabled={enCours}
          onPress={() => onDepublier(trajet)}
          style={s.actionDanger}
        >
          <Text style={s.actionDangerLabel}>
            {t('trips.inventory.unpublish')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  carte: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: colors.neutral[0],
  },
  enCours: { opacity: 0.6 },
  corridor: { fontSize: fontSize.lg, fontWeight: '800', color: colors.neutral[900] },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  meta: { fontSize: fontSize.sm, color: colors.neutral[500] },
  expiration: { fontSize: fontSize.sm, marginTop: spacing.xs },
  normal: { color: colors.neutral[500] },
  urgent: { color: colors.warning, fontWeight: '700' },
  expire: { color: colors.error, fontWeight: '700' },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  action: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  actionDanger: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    marginStart: 'auto',
  },
  actionDangerLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.error,
  },
});
