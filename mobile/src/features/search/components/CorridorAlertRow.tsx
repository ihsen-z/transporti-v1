import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui/Card';
import { Txt } from '@/shared/ui/Txt';
import { RouteRow } from '@/shared/ui/RouteRow';
import { Icon } from '@/shared/ui/icons';
import { colors, spacing } from '@/shared/theme';
import type { CorridorAlertDto } from '../api/dto';
import { useDeleteCorridorAlert } from '../api/useDeleteCorridorAlert';

export function CorridorAlertRow({ alert }: { alert: CorridorAlertDto }) {
  const { t } = useTranslation();
  const remove = useDeleteCorridorAlert();

  const confirmDelete = () => {
    Alert.alert(t('search.alerts.delete_title'), t('search.alerts.delete_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.close'), style: 'destructive', onPress: () => remove.mutate(alert.id) },
    ]);
  };

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.route}>
          <RouteRow from={alert.pickup_governorate} to={alert.dropoff_governorate} />
        </View>
        <Pressable
          onPress={confirmDelete}
          accessibilityRole="button"
          accessibilityLabel={t('search.alerts.delete')}
          hitSlop={12}
        >
          <Icon name="x" size={20} color={colors.neutral[400]} />
        </Pressable>
      </View>
      {remove.isPending ? <Txt style={styles.pending}>{t('common.loading')}</Txt> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  route: { flex: 1 },
  pending: { marginTop: spacing.xs, color: colors.neutral[400] },
});
