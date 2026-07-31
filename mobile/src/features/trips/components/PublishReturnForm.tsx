import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { usePublishTripForm } from './publish/usePublishTripForm';
import { RouteSection } from './publish/RouteSection';
import { ScheduleSection } from './publish/ScheduleSection';
import { DetailsSection } from './publish/DetailsSection';
import { publishStyles as s } from './publish/publishStyles';

// Formulaire de publication d'un retour à vide (TRANSPORTER). Ce composant se
// contente d'orchestrer : la logique vit dans usePublishTripForm, la validation
// dans publishSchema, et les champs dans les sections Route/Schedule/Details.
export function PublishReturnForm() {
  const { t } = useTranslation();
  const f = usePublishTripForm();

  // Succès : message + nombre de demandes ouvertes sur le corridor.
  if (f.isSuccess) {
    return (
      <View style={s.successBox}>
        <Text style={s.successText}>{t('trips.success', { count: f.successCount })}</Text>
      </View>
    );
  }

  return (
    <View style={s.form}>
      <RouteSection
        control={f.control}
        errors={f.errors}
        jobTypeOptions={f.jobTypeOptions}
        govOptions={f.govOptions}
      />
      <ScheduleSection
        control={f.control}
        errors={f.errors}
        dayOptions={f.dayOptions}
        timeOptions={f.timeOptions}
        onEstimate={f.onEstimate}
        estimatePending={f.estimatePending}
        estimateResult={f.estimateResult}
        routeHint={f.routeHint}
      />
      <DetailsSection control={f.control} />

      {f.publishError ? <Text style={s.error}>{f.publishError}</Text> : null}

      <Button
        label={f.publishPending ? t('trips.publish.submitting') : t('trips.publish.submit')}
        onPress={f.onSubmit}
        variant="cta"
        loading={f.publishPending}
        style={s.submit}
      />
    </View>
  );
}
