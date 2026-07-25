import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { MissionDto } from '@/features/missions/api/dto';
import { useCompletedMissions } from '@/features/missions/api/useCompletedMissions';
import { OpenReviewSheet } from './OpenReviewSheet';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

// Section « Missions terminées » (transporteur) : point d'entrée pour noter.
export function CompletedMissionsList() {
  const { t } = useTranslation();
  const completed = useCompletedMissions();
  const [reviewJob, setReviewJob] = useState<number | null>(null);
  const data = completed.data ?? [];

  // Section masquée s'il n'y a rien à noter (garde l'Accueil épuré).
  if (!completed.isLoading && data.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('reviews.completed_title')}</Text>

      {completed.isLoading ? (
        <ActivityIndicator color={colors.brand[500]} />
      ) : (
        data.map((m: MissionDto) => (
          <View key={m.id} style={styles.card}>
            <Text style={styles.route} numberOfLines={1}>
              {m.pickup_governorate} → {m.dropoff_governorate}
            </Text>
            <Text style={styles.when}>{formatWhen(m.scheduled_time)}</Text>
            <Button
              label={t('reviews.open')}
              onPress={() => setReviewJob(m.id)}
              variant="primary"
            />
          </View>
        ))
      )}

      <OpenReviewSheet jobId={reviewJob} onClose={() => setReviewJob(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.brand[600] },
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radii.lg,
    backgroundColor: colors.neutral[0],
    gap: spacing.xs,
  },
  route: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  when: { fontSize: fontSize.sm, color: colors.neutral[500] },
});
