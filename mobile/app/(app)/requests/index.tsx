import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTabBarClearance } from '@/shared/ui/FloatingTabBar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fontSize, spacing, SCREEN_PADDING } from '@/shared/theme';
import { AppScreen } from '@/shared/ui/AppScreen';
import { AppHeader } from '@/shared/ui/AppHeader';
import { Txt } from '@/shared/ui/Txt';
import { Pill } from '@/shared/ui/Pill';
import { EmptyState } from '@/shared/ui/EmptyState';
import { SkeletonList } from '@/shared/ui/SkeletonList';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { RequestCard } from '@/features/requests/components/RequestCard';
import {
  useReceivedRequests,
  type OngletId,
} from '@/features/requests/api/useReceivedRequests';
import type { TripRequestDto } from '@/features/requests/api/dto';

/**
 * T2.1 — Demandes reçues, tous trajets confondus.
 *
 * Cet écran listait auparavant les **trajets** du transporteur : il fallait en
 * taper un pour voir ses demandes. Un transporteur avec trois retours en ligne
 * devait donc visiter trois écrans pour savoir ce qui attendait sa décision —
 * exactement ce que le principe IA-4 interdit.
 *
 * Le tri primaire est « qui doit agir maintenant » et non la date, d'où les
 * onglets par statut. Le détail par trajet reste adressable
 * (`requests/[jobId]`) : une notification de nouvelle demande y mène toujours
 * directement.
 */

const ORDRE: OngletId[] = ['a-decider', 'negociation', 'archivees'];

export default function RequestsScreen() {
  // Marge basse reservee sous le contenu : sans elle, le dernier element reste
  // sous la barre de navigation et son action devient inatteignable (defaut
  // mesure sur l'inventaire des retours, recette du 03/09).
  const margeBasse = useTabBarClearance();
  const { t } = useTranslation();
  const router = useRouter();

  const [onglet, setOnglet] = useState<OngletId>('a-decider');
  const demandes = useReceivedRequests(onglet);

  // `data ?? []` produit une union `TripRequestDto[] | never[]` : TypeScript ne
  // resout pas `.map` sur une union de types tableau. D'ou la variable typee.
  const liste: TripRequestDto[] = demandes.data ?? [];

  return (
    <AppScreen
      testID="requests-screen"
      scroll={false}
      header={
        <AppHeader title={t('requests.title')}>
          <Txt style={styles.subtitle}>{t('requests.inbox_subtitle')}</Txt>
        </AppHeader>
      }
    >
      <View style={styles.onglets}>
        {ORDRE.map((cle) => (
          <Pill
            key={cle}
            testID={`demandes-recues-onglet-${cle}`}
            label={t(`requests.tabs.${cle}`)}
            selected={onglet === cle}
            onPress={() => setOnglet(cle)}
          />
        ))}
      </View>

      {demandes.isLoading ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={liste}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: margeBasse }]}
          refreshControl={queryRefreshControl(demandes)}
          ListEmptyComponent={
            // État vide sans cul-de-sac (IA-3) : sans demande, la sortie utile
            // est de publier un retour de plus. Les autres onglets n'ont pas
            // d'action évidente, donc pas de bouton qui ne mènerait nulle part.
            onglet === 'a-decider' ? (
              <EmptyState
                icon="package"
                title={t('requests.inbox_empty')}
                subtitle={t('requests.inbox_empty_hint')}
                ctaLabel={t('requests.trips_empty_cta')}
                onCta={() => router.push('/publish')}
              />
            ) : (
              <EmptyState icon="package" title={t('requests.tab_empty')} />
            )
          }
          renderItem={({ item }) => (
            <RequestCard request={item} jobId={item.job} montrerCorridor />
          )}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  // Rendu DANS le bandeau bleu : le sous-titre y prend l'encre sur bleu.
  subtitle: { fontSize: fontSize.sm, lineHeight: 19.5, color: colors.text.onBlue },
  onglets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.lg,
  },
  list: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
});
