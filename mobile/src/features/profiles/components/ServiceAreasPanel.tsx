import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FormModalPanel } from '@/shared/ui/FormModalPanel';
import { Txt } from '@/shared/ui/Txt';
import { Button } from '@/shared/ui/Button';
import { TOUCH_TARGET, colors, fontSize, spacing } from '@/shared/theme';
import { showToast } from '@/shared/ui/toastStore';
import { GOVERNORATES } from '@/features/trips/data/governorates';
import { useTransporterProfile } from '../api/useTransporterProfile';
import { useUpdateServiceAreas } from '../api/useUpdateServiceAreas';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Le transporteur connecté. Le panneau édite SES zones, jamais d'autres. */
  userId: number | null;
}

/**
 * Zones de service du transporteur — les gouvernorats qu'il dessert.
 *
 * Pourquoi cet écran existe. Le mobile lisait `service_areas` (DTO du profil
 * public) mais n'avait AUCUN moyen de l'écrire : seul le web le permettait.
 * Or c'est la seule donnée qui alimente `underserved_corridors`, donc les
 * opportunités de corridor. Sans zones déclarées, cette liste est vide *par
 * construction* — et un transporteur mobile n'avait aucun moyen d'y remédier.
 *
 * C'est aussi le prérequis de l'étape « zones » du guide de démarrage : sans
 * cet écran, le guide aurait pointé vers un endroit où le champ qu'il nomme
 * n'existe pas. C'est exactement le défaut corrigé côté web en T0.1, et le
 * reproduire ici aurait été le réintroduire.
 */
export function ServiceAreasPanel({ visible, onClose, userId }: Props) {
  const { t, i18n } = useTranslation();
  const estArabe = i18n.language?.startsWith('ar') ?? false;

  const profil = useTransporterProfile(visible ? userId : null);
  const enregistrer = useUpdateServiceAreas(userId);

  // `null` = pas encore chargé. Distinct de `[]`, qui veut dire « chargé, et
  // aucune zone déclarée » — les deux états n'affichent pas la même chose.
  const [selection, setSelection] = useState<string[] | null>(null);

  // Repart de la valeur du serveur à chaque ouverture : une sélection abandonnée
  // ne doit pas réapparaître à la réouverture comme si elle avait été gardée.
  useEffect(() => {
    if (!visible) {
      setSelection(null);
      return;
    }
    if (profil.data) setSelection([...profil.data.service_areas]);
  }, [visible, profil.data]);

  useEffect(() => {
    if (enregistrer.isSuccess) {
      showToast(t('common.saved'));
      onClose();
    }
  }, [enregistrer.isSuccess, onClose, t]);

  const options = useMemo(
    () =>
      GOVERNORATES.map((g) => ({ code: g.code, label: estArabe ? g.nameAr : g.nameFr })),
    [estArabe],
  );

  const basculer = (code: string) => {
    setSelection((actuelle) => {
      if (actuelle === null) return actuelle;
      return actuelle.includes(code)
        ? actuelle.filter((c) => c !== code)
        : [...actuelle, code];
    });
  };

  const messageErreur = enregistrer.error
    ? t(
        enregistrer.error.kind === 'network'
          ? 'auth.errors.network'
          : 'auth.errors.validation',
      )
    : null;

  return (
    <FormModalPanel
      testID="service-areas-panel"
      visible={visible}
      title={t('profiles.service_areas.title')}
      onClose={onClose}
    >
      <Txt style={styles.explication}>{t('profiles.service_areas.why')}</Txt>

      {/* L'ERREUR SE TESTE EN PREMIER. En cas d'échec de lecture, `selection`
          reste `null` : mettre le chargement d'abord faisait tourner l'écran
          indéfiniment sans jamais dire qu'il avait échoué. Un test le
          verrouille — c'est lui qui a révélé l'ordre fautif. */}
      {profil.isError ? (
        // Erreur remontée, jamais une liste vide qui laisserait croire
        // qu'aucune zone n'est déclarée.
        <View testID="service-areas-erreur">
          <Txt style={styles.erreur}>{t('profiles.service_areas.load_error')}</Txt>
          <Button
            testID="service-areas-reessayer"
            variant="ghost"
            label={t('common.retry')}
            onPress={() => void profil.refetch()}
          />
        </View>
      ) : profil.isLoading || selection === null ? (
        <ActivityIndicator
          testID="service-areas-chargement"
          color={colors.brand[600]}
          style={styles.chargement}
        />
      ) : (
        <>
          <View style={styles.pastilles}>
            {options.map((option) => {
              const choisie = selection.includes(option.code);
              return (
                <Pressable
                  key={option.code}
                  testID={`service-areas-zone-${option.code}`}
                  onPress={() => basculer(option.code)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: choisie }}
                  accessibilityLabel={option.label}
                  style={[styles.pastille, choisie && styles.pastilleChoisie]}
                >
                  <Txt
                    style={[styles.pastilleTexte, choisie && styles.pastilleTexteChoisi]}
                  >
                    {option.label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>

          <Txt testID="service-areas-compte" style={styles.compte}>
            {t('profiles.service_areas.count', { count: selection.length })}
          </Txt>

          {/* Zéro zone est un état LÉGITIME (le transporteur retire tout), mais
              il a une conséquence qu'il faut annoncer avant d'enregistrer. */}
          {selection.length === 0 ? (
            <Txt testID="service-areas-avertissement" style={styles.avertissement}>
              {t('profiles.service_areas.none_warning')}
            </Txt>
          ) : null}

          {messageErreur ? (
            <Txt testID="service-areas-erreur-enregistrement" style={styles.erreur}>
              {messageErreur}
            </Txt>
          ) : null}

          <Button
            testID="service-areas-enregistrer"
            label={enregistrer.isPending ? t('profile.saving') : t('profile.save')}
            loading={enregistrer.isPending}
            onPress={() => enregistrer.mutate(selection)}
          />
        </>
      )}
    </FormModalPanel>
  );
}

const styles = StyleSheet.create({
  explication: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  chargement: { marginVertical: spacing['2xl'] },
  pastilles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pastille: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
  },
  pastilleChoisie: {
    borderColor: colors.brand[600],
    backgroundColor: colors.brand[600],
  },
  pastilleTexte: { fontSize: fontSize.sm, color: colors.neutral[700] },
  pastilleTexteChoisi: { color: colors.neutral[0], fontWeight: '700' },
  compte: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    marginTop: spacing.lg,
  },
  avertissement: {
    fontSize: fontSize.sm,
    color: colors.text.warning,
    marginTop: spacing.sm,
  },
  erreur: {
    fontSize: fontSize.sm,
    color: colors.text.error,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
});
