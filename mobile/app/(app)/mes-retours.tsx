import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFloatingTabBarClearance } from '@/shared/ui/FloatingTabBar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { Button } from '@/shared/ui/Button';
import { showToast } from '@/shared/ui/toastStore';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
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
  // Marge basse reservee sous la liste : sans elle, le dernier element
  // reste sous la barre flottante et son action devient inatteignable
  // (defaut mesure sur l'inventaire des retours, recette du 03/09).
  const margeBasse = useFloatingTabBarClearance();

  const executer = async (trajet: ReturnTripDto, action: () => Promise<unknown>) => {
    setEnCours(trajet.id);
    try {
      await action();
    } catch {
      // `showToast` et non `Alert.alert` : c'est la convention de tous les
      // autres ecrans, et cet ecran etait le seul a en sortir.
      showToast(t('trips.inventory.action_failed'));
    } finally {
      setEnCours(null);
    }
  };

  // Dépublier rejette et notifie les demandes en attente : la conséquence est
  // annoncée avant, pas découverte après.
  const confirmerDepublication = (trajet: ReturnTripDto) => {
    // Ici l'Alert est volontaire : une action destructive doit bloquer et
    // annoncer ses consequences, pas glisser dans un toast.
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
    // E-11 — sans zone sure, le titre se superposait a l'horloge systeme.
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[s.contenu, { paddingBottom: margeBasse }]}
        refreshControl={queryRefreshControl(trajets)}
      >
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  contenu: { padding: spacing.lg, gap: spacing.md },
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
