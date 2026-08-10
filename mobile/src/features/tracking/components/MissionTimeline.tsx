import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { JobEventDto } from '../api/dto';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

// Chronologie de la course (JobEvent côté serveur). Le client n'avait aucune
// visibilité sur l'avancement : une fois sa demande acceptée, plus rien ne lui
// disait si le transporteur était parti, ni quand la livraison avait eu lieu.
export function MissionTimeline({ events }: { events: JobEventDto[] }) {
  const { t } = useTranslation();

  if (events.length === 0) {
    return <Txt style={styles.empty}>{t('tracking.timeline_empty')}</Txt>;
  }

  return (
    <View style={styles.wrap}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        return (
          <View key={`${event.event}-${event.created_at}`} style={styles.row}>
            <View style={styles.gutter}>
              <View style={[styles.dot, isLast ? styles.dotCurrent : null]} />
              {!isLast ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.body}>
              <Txt style={styles.label}>
                {t(`tracking.events.${event.event}`, { defaultValue: event.event })}
              </Txt>
              <Txt style={styles.when}>{formatWhen(event.created_at)}</Txt>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  row: { flexDirection: 'row', gap: spacing.md },
  gutter: { alignItems: 'center', width: 16 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.neutral[300],
    marginTop: 6,
  },
  // Le dernier événement est l'état courant : il porte la couleur de valeur.
  dotCurrent: { backgroundColor: colors.green[600], width: 12, height: 12, borderRadius: 6 },
  line: { flex: 1, width: 2, backgroundColor: colors.neutral[200], marginVertical: 2 },
  body: { flex: 1, paddingBottom: spacing.lg },
  label: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  when: { fontSize: fontSize.sm, color: colors.neutral[500] },
  empty: { fontSize: fontSize.sm, color: colors.neutral[500] },
});
