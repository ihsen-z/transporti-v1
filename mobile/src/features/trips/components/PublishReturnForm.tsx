import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { usePublishTripForm } from './publish/usePublishTripForm';
import { RouteSection } from './publish/RouteSection';
import { ScheduleSection } from './publish/ScheduleSection';
import { DetailsSection } from './publish/DetailsSection';
import { publishStyles as s } from './publish/publishStyles';
import { Txt } from '@/shared/ui/Txt';

// Formulaire de publication d'un retour à vide (TRANSPORTER). Ce composant se
// contente d'orchestrer : la logique vit dans usePublishTripForm, la validation
// dans publishSchema, et les champs dans les sections Route/Schedule/Details.
export function PublishReturnForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const f = usePublishTripForm();

  // Succès : message + nombre de demandes ouvertes sur le corridor, puis
  // renvoi vers l'inventaire (T1.3) pour que le transporteur voie son trajet
  // en ligne et puisse le gérer.
  if (f.isSuccess) {
    return (
      <View style={s.successBox}>
        <Txt style={s.successText}>{t('trips.success', { count: f.successCount })}</Txt>
        <Button
          testID="publish-voir-inventaire"
          label={t('trips.inventory.see_mine')}
          onPress={() => router.push('/mes-retours')}
          variant="ghost"
        />
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
        onChoisirAdresse={f.onChoisirAdresse}
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
      <DetailsSection
        control={f.control}
        vehicule={f.vehicule}
        partCapacite={f.partCapacite}
        onChoisirPart={f.onChoisirPart}
        onCapaciteLibre={f.onCapaciteLibre}
      />

      {f.publishError ? <Txt style={s.error}>{f.publishError}</Txt> : null}

      <Button
        testID="publish-submit"
        label={f.publishPending ? t('trips.publish.submitting') : t('trips.publish.submit')}
        onPress={f.onSubmit}
        variant="cta"
        loading={f.publishPending}
        style={s.submit}
      />
    </View>
  );
}
