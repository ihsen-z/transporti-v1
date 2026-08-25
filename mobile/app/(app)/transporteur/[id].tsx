import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTransporterProfile } from '@/features/profiles/api/useTransporterProfile';
import { useTransporterReviews } from '@/features/profiles/api/useTransporterReviews';
import { ReviewRow } from '@/features/reviews/components/ReviewRow';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { StarRating } from '@/shared/ui/StarRating';
import { Icon } from '@/shared/ui/icons';
import { EmptyState } from '@/shared/ui/EmptyState';
import { SkeletonList } from '@/shared/ui/SkeletonList';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { ReviewDto } from '@/features/reviews/api/dto';

// Profil public d'un transporteur — consultable AVANT d'envoyer une demande.
// Les deux endpoints (profil, avis) répondaient déjà 200 ; rien côté mobile ne
// les reliait à un résultat de recherche (owner_id manquait côté liste,
// livré en 0.8 côté backend). L'écran compose ; toute la logique vit dans
// les hooks de `features/profiles`.
export default function TransporterProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = Number(id);
  const valid = Number.isFinite(userId) && userId > 0;

  const profile = useTransporterProfile(valid ? userId : null);
  const reviews = useTransporterReviews(valid ? userId : null);
  const p = profile.data;

  // rating vaut 0.0 (pas null) tant qu'aucun avis n'existe — ne s'affiche
  // qu'avec au moins un avis, sinon "0 étoile" se lirait comme un mauvais score.
  const hasRating = !!p && p.review_count > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          testID="transporter-detail-back"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
        >
          <Icon name="chevron-left" size={24} color={colors.neutral[900]} />
        </Pressable>
        <Txt style={styles.headerTitle}>{t('profiles.title')}</Txt>
      </View>

      {profile.isLoading || !p ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={reviews.data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          refreshControl={queryRefreshControl(reviews)}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <Card style={styles.identity}>
                <Avatar name={`${p.first_name} ${p.last_name}`} size={64} imageUrl={p.avatar_url || null} />
                <Txt style={styles.name}>{`${p.first_name} ${p.last_name}`}</Txt>
                <View style={styles.badges}>
                  {p.is_verified ? (
                    <Badge label={t('trust.status.VERIFIED')} variant="verified" icon="shield-check" />
                  ) : null}
                  {p.active_return_trips > 0 ? (
                    <Badge
                      label={t('profiles.active_trips', { count: p.active_return_trips })}
                      variant="brand"
                    />
                  ) : null}
                </View>
                {hasRating ? (
                  <View style={styles.ratingRow}>
                    <StarRating
                      testID="transporter-detail-rating"
                      value={Math.round(p.rating)}
                      size={20}
                    />
                    <Txt style={styles.ratingCount}>
                      {t('profiles.review_count', { count: p.review_count })}
                    </Txt>
                  </View>
                ) : (
                  <Txt style={styles.noRating}>{t('profiles.no_reviews_yet')}</Txt>
                )}
                {p.bio ? <Txt style={styles.bio}>{p.bio}</Txt> : null}
              </Card>

              <Card style={styles.statsCard}>
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Txt style={styles.statValue}>{p.total_jobs_completed}</Txt>
                    <Txt style={styles.statLabel}>{t('profiles.jobs_completed')}</Txt>
                  </View>
                  <View style={styles.stat}>
                    <Txt style={styles.statValue}>
                      {p.completion_rate !== null ? `${p.completion_rate}%` : t('home.kpi_unavailable')}
                    </Txt>
                    <Txt style={styles.statLabel}>{t('profiles.completion_rate')}</Txt>
                  </View>
                  <View style={styles.stat}>
                    <Txt style={styles.statValue}>
                      {p.avg_response_time_min !== null
                        ? t('profiles.minutes', { count: p.avg_response_time_min })
                        : t('home.kpi_unavailable')}
                    </Txt>
                    <Txt style={styles.statLabel}>{t('profiles.response_time')}</Txt>
                  </View>
                </View>
                {p.vehicle_type ? (
                  <Txt style={styles.vehicle}>
                    {t('profiles.vehicle', { type: p.vehicle_type })}
                  </Txt>
                ) : null}
              </Card>

              <Txt style={styles.sectionTitle}>{t('reviews.my_title')}</Txt>
            </View>
          }
          ListEmptyComponent={<EmptyState icon="star" title={t('reviews.empty')} />}
          renderItem={({ item }: { item: ReviewDto }) => <ReviewRow review={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.neutral[900] },
  content: { padding: spacing.xl, paddingTop: 0, gap: spacing.md },
  headerBlock: { gap: spacing.md, marginBottom: spacing.xs },
  identity: { alignItems: 'center', gap: spacing.sm },
  name: { fontSize: fontSize.xl, fontWeight: '800', color: colors.neutral[900] },
  badges: { flexDirection: 'row', gap: spacing.sm },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ratingCount: { fontSize: fontSize.sm, color: colors.neutral[500] },
  noRating: { fontSize: fontSize.sm, color: colors.neutral[400] },
  bio: { fontSize: fontSize.md, color: colors.neutral[700], textAlign: 'center', marginTop: spacing.xs },
  statsCard: { gap: spacing.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', gap: 2, flex: 1 },
  statValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.neutral[900] },
  statLabel: { fontSize: fontSize.xs, color: colors.neutral[500], textAlign: 'center' },
  vehicle: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingTop: spacing.sm,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.neutral[900] },
});
