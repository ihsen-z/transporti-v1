import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import { Txt } from '@/shared/ui/Txt';
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
  const { t } = useTranslation();
  const router = useRouter();

  const [onglet, setOnglet] = useState<OngletId>('a-decider');
  const demandes = useReceivedRequests(onglet);

  // `data ?? []` produit une union `TripRequestDto[] | never[]` : TypeScript ne
  // resout pas `.map` sur une union de types tableau. D'ou la variable typee.
  const liste: TripRequestDto[] = demandes.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Txt style={styles.title}>{t('requests.title')}</Txt>
        <Txt style={styles.subtitle}>{t('requests.inbox_subtitle')}</Txt>
      </View>

      <View style={styles.onglets}>
        {ORDRE.map((cle) => {
          const actif = onglet === cle;
          return (
            <Pressable
              key={cle}
              testID={`demandes-recues-onglet-${cle}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: actif }}
              onPress={() => setOnglet(cle)}
              style={[styles.onglet, actif && styles.ongletActif]}
            >
              <Text style={[styles.ongletLabel, actif && styles.ongletLabelActif]}>
                {t(`requests.tabs.${cle}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {demandes.isLoading ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={liste}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
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
              <EmptyState
                icon="package"
                title={t('requests.tab_empty')}
              />
            )
          }
          renderItem={({ item }) => (
            <RequestCard request={item} jobId={item.job} montrerCorridor />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.xs },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  subtitle: { fontSize: fontSize.sm, color: colors.neutral[500] },
  onglets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  onglet: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
  },
  ongletActif: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[600],
  },
  ongletLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  ongletLabelActif: { color: colors.neutral[0] },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
});
