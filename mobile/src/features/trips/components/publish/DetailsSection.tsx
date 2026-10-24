import { Pressable, Switch, View } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { colors } from '@/shared/theme';
import { publishStyles as s } from './publishStyles';
import type { PublishFormValues } from './publishSchema';
import {
  libelleCapacite,
  type PartCapacite,
  type VehiculeProfil,
} from './useVehiclePrefill';
import { Txt } from '@/shared/ui/Txt';

interface Props {
  control: Control<PublishFormValues>;
  // T1.2 — pré-remplissage du véhicule et choix tactile de la part de capacité.
  vehicule: VehiculeProfil;
  partCapacite: PartCapacite;
  onChoisirPart: (part: Exclude<PartCapacite, null>) => void;
  onCapaciteLibre: () => void;
}

// Capacité, description libre et réservation immédiate (D11 : off par défaut).
export function DetailsSection({
  control,
  vehicule,
  partCapacite,
  onChoisirPart,
  onCapaciteLibre,
}: Props) {
  const { t } = useTranslation();

  return (
    <>
      {/* T1.2 — le véhicule vient du profil : présenté comme un fait acquis,
          pas comme un champ à remplir. */}
      {vehicule.disponible && (
        <View style={s.prefillBanner} testID="publish-vehicule-prerempli">
          <Txt style={s.prefillText}>{libelleCapacite(vehicule)}</Txt>
          <Txt style={s.hint}>{t('trips.prefill_from_profile')}</Txt>
        </View>
      )}

      {/* Saisie tactile de la part restante : évite de calculer un tonnage de
          tête. Le champ libre ci-dessous reste disponible pour préciser. */}
      {vehicule.disponible && (
        <View style={s.partRow}>
          {(['tout', 'moitie'] as const).map((part) => (
            <Pressable
              key={part}
              testID={`publish-capacite-${part}`}
              onPress={() => onChoisirPart(part)}
              style={[
                s.partChoice,
                partCapacite === part && s.partChoiceActive,
              ]}
            >
              <Txt
                style={[
                  s.partLabel,
                  partCapacite === part && s.partLabelActive,
                ]}
              >
                {t(`trips.capacity_share_${part}`)}
              </Txt>
            </Pressable>
          ))}
        </View>
      )}

      <Controller
        control={control}
        name="capacity"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="publish-capacity"
            label={t('trips.capacity')}
            placeholder={t('trips.capacity_ph')}
            value={value}
            onChangeText={(texte) => {
              // Une saisie libre annule la déduction structurée : on ne sait
              // pas lire un texte arbitraire.
              onCapaciteLibre();
              onChange(texte);
            }}
            onBlur={onBlur}
            autoCapitalize="sentences"
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="publish-description"
            label={t('trips.description')}
            placeholder={t('trips.description_ph')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="sentences"
          />
        )}
      />

      {/* Réservation immédiate (D11 : off par défaut) */}
      <Controller
        control={control}
        name="instantBooking"
        render={({ field: { value, onChange } }) => (
          <View style={s.switchRow}>
            <View style={s.flex}>
              <Txt style={s.switchLabel}>{t('trips.instant_booking')}</Txt>
              <Txt style={s.hint}>{t('trips.instant_booking_hint')}</Txt>
            </View>
            <Switch
              value={value}
              onValueChange={onChange}
              trackColor={{ true: colors.brand[500], false: colors.neutral[200] }}
            />
          </View>
        )}
      />
    </>
  );
}
