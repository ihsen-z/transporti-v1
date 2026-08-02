import { StyleSheet, View } from 'react-native';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';
import { spacing } from '@/shared/theme';

// Placeholder de liste : quelques cartes « fantômes » (avatar + 2 lignes) en
// pulsation, affichées pendant le chargement à la place d'un spinner.
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} style={styles.card}>
          <Skeleton width={44} height={44} radius={14} />
          <View style={styles.lines}>
            <Skeleton width="65%" height={14} />
            <Skeleton width="40%" height={12} />
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingTop: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lines: { flex: 1, gap: spacing.sm },
});
