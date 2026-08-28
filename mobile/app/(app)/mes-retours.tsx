import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import { ReturnTripRow } from '@/features/trips/components/ReturnTripRow';
import {
  useDuplicateReturnTrip,
  useExtendReturnTrip,
  useMyReturnTrips,
  useUnpublishReturnTrip,
} from '@/features/trips/api/useMyReturnTrips';
import type { ReturnTripDto } from '@/features/trips/api/dto';

/**
 * T1.3 — Mes retours publiés, l'inventaire du transporteur.
 *
 * Pendant mobile de `frontend/app/(app)/retours/page.tsx`.
 *
 * Écran hors barre d'onglets (`href: null`) : la charte impose 4 onglets plus
 * le bouton central, et un cinquième casserait cette mise en page. L'inventaire
 * est donc atteint depuis l'écran de publication et depuis l'Accueil — ce qui
 * correspond au parcours réel, puisqu'on y vient après avoir publié.
 */
export default function MesRetoursScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const trajets = useMyReturnTrips();
  const prolonger = useExtendReturnTrip();
  const dupliquer = useDuplicateReturnTrip();
  const depublier = useUnpublishReturnTrip();

  const [enCours, setEnCours] = useState<number | null>(null);

  const executer = async (trajet: ReturnTripDto, action: () => Promise<unknown>) => {
    setEnCours(trajet.id);
    try {
      await action();
    } catch {
      Alert.alert(t('trips.inventory.action_failed'));
    } finally {
      setEnCours(null);
    }
  };

  // Dépublier rejette et notifie les demandes en attente : la conséquence est
  // annoncée avant, pas découverte après.
  const confirmerDepublication = (trajet: ReturnTripDto) => {
    Alert.alert(
      t('trips.inventory.unpublish_title'),
      t('trips.inventory.unpublish_message', {
        from: trajet.pickup_governorate,
        to: trajet.dropoff_governorate,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('trips.inventory.unpublish'),
          style: 'destructive',
          onPress: () =>
            void executer(trajet, () => depublier.mutateAsync(trajet.id)),
        },
      ],
    );
  };

  const liste: ReturnTripDto[] = trajets.data ?? [];

  return (
    <ScrollView contentContainerStyle={s.contenu}>
      <Txt style={s.titre}>{t('trips.inventory.title')}</Txt>
      <Txt style={s.sousTitre}>{t('trips.inventory.subtitle')}</Txt>

      {trajets.isPending && (
        <Txt style={s.info}>{t('common.loading')}</Txt>
      )}

      {trajets.isError && (
        <View style={s.bloc}>
          <Txt style={s.info}>{t('trips.inventory.load_error')}</Txt>
          <Button
            label={t('common.retry')}
            onPress={() => void trajets.refetch()}
            variant="ghost"
          />
        </View>
      )}

      {/* État vide : jamais un cul-de-sac (IA-3). Publier est la seule action
          évidente à ce stade, donc la seule proposée. */}
      {!trajets.isPending && !trajets.isError && liste.length === 0 && (
        <View style={s.bloc} testID="retours-vide">
          <Txt style={s.videTitre}>{t('trips.inventory.empty_title')}</Txt>
          <Txt style={s.info}>{t('trips.inventory.empty_hint')}</Txt>
          <Button
            testID="retours-vide-publier"
            label={t('trips.inventory.publish_first')}
            onPress={() => router.push('/publish')}
            variant="cta"
          />
        </View>
      )}

      {liste.length > 0 && (
        <View style={s.liste} testID="retours-liste">
          {liste.map((trajet) => (
            <ReturnTripRow
              key={trajet.id}
              trajet={trajet}
              enCours={enCours === trajet.id}
              onProlonger={(tr: ReturnTripDto) =>
                void executer(tr, () => prolonger.mutateAsync({ trajet: tr }))
              }
              onDupliquer={(tr: ReturnTripDto) =>
                void executer(tr, () => dupliquer.mutateAsync({ trajet: tr }))
              }
              onDepublier={confirmerDepublication}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  contenu: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['2xl'] },
  titre: { fontSize: fontSize.xl, fontWeight: '800', color: colors.neutral[900] },
  sousTitre: { fontSize: fontSize.sm, color: colors.neutral[500] },
  info: { fontSize: fontSize.md, color: colors.neutral[500] },
  bloc: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  videTitre: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  liste: { gap: spacing.md },
});
