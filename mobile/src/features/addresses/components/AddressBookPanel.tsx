import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FormModalPanel } from '@/shared/ui/FormModalPanel';
import { Txt } from '@/shared/ui/Txt';
import { Button } from '@/shared/ui/Button';
import { TextField } from '@/shared/ui/TextField';
import { Select } from '@/shared/ui/Select';
import { Icon } from '@/shared/ui/icons';
import { colors, spacing, fontSize } from '@/shared/theme';
import { GOVERNORATES } from '@/features/trips/data/governorates';
import {
  useAddresses,
  useSaveAddress,
  useDeleteAddress,
  type AdresseEnregistreeDto,
} from '../api/useAddresses';

/** Doit rester égal à `SavedAddress.MAXIMUM_PAR_UTILISATEUR` côté backend. */
const MAXIMUM = 20;

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface Brouillon {
  id: number | null;
  label: string;
  address: string;
  governorate: string;
}

const BROUILLON_VIDE: Brouillon = {
  id: null,
  label: '',
  address: '',
  governorate: '',
};

/**
 * C5.9 — le carnet d'adresses sur mobile.
 *
 * Panneau ouvert depuis le Profil, sur le motif établi (avis, litiges,
 * confiance, favoris, portefeuille client, zones de service).
 *
 * Le formulaire ne demande PAS de coordonnées : personne ne connaît sa
 * latitude. Une adresse créée ici n'a que son gouvernorat, ce qui suffit —
 * l'estimation de prix retombe alors sur les centroïdes. C'est la même
 * décision que côté web.
 */
export function AddressBookPanel({ visible, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const estArabe = i18n.language?.startsWith('ar') ?? false;

  const carnet = useAddresses(visible);
  const enregistrer = useSaveAddress();
  const supprimer = useDeleteAddress();

  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);

  // Repart d'un état propre à chaque ouverture : un brouillon abandonné ne doit
  // pas réapparaître comme s'il avait été gardé.
  useEffect(() => {
    if (!visible) setBrouillon(null);
  }, [visible]);

  useEffect(() => {
    if (enregistrer.isSuccess) setBrouillon(null);
  }, [enregistrer.isSuccess]);

  const optionsGouvernorat = useMemo(
    () =>
      GOVERNORATES.map((g) => ({
        value: g.code,
        label: estArabe ? g.nameAr : g.nameFr,
      })),
    [estArabe],
  );

  // Type explicite : `?? []` elargit sinon en `never[]` et le parametre de
  // `map` retombe en `any`, ce que le projet interdit.
  const adresses: AdresseEnregistreeDto[] = carnet.data ?? [];
  const plein = adresses.length >= MAXIMUM;

  const confirmerSuppression = (adresse: AdresseEnregistreeDto) => {
    Alert.alert(
      t('address_book.confirm_remove', { label: adresse.label }),
      t('address_book.confirm_remove_hint'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('address_book.remove'),
          style: 'destructive',
          onPress: () => supprimer.mutate(adresse.id),
        },
      ],
    );
  };

  const messageErreur = enregistrer.error
    ? t(
        enregistrer.error.kind === 'network'
          ? 'auth.errors.network'
          : 'address_book.save_error',
      )
    : null;

  return (
    <FormModalPanel
      testID="carnet-panel"
      visible={visible}
      title={t('address_book.title')}
      onClose={onClose}
    >
      <Txt style={s.explication}>{t('address_book.subtitle')}</Txt>

      {/* L'ERREUR DE LECTURE SE TESTE EN PREMIER : rendre une liste vide ferait
          lire « carnet vide » à quelqu'un qui a des adresses, et il les
          recréerait. Même ordre que le panneau des zones de service, où
          l'inverse produisait un chargement infini. */}
      {carnet.isError ? (
        <View testID="carnet-erreur">
          <Txt style={s.erreur}>{t('address_book.load_error')}</Txt>
          <Button
            testID="carnet-reessayer"
            variant="ghost"
            label={t('common.retry')}
            onPress={() => void carnet.refetch()}
          />
        </View>
      ) : carnet.isLoading ? (
        <ActivityIndicator
          testID="carnet-chargement"
          color={colors.brand[600]}
          style={s.chargement}
        />
      ) : (
        <>
          {adresses.length === 0 ? (
            <View testID="carnet-vide" style={s.vide}>
              <Icon name="map-pin" size={28} color={colors.neutral[300]} />
              <Txt style={s.videTitre}>{t('address_book.empty')}</Txt>
              <Txt style={s.videAide}>{t('address_book.empty_hint')}</Txt>
            </View>
          ) : (
            adresses.map((adresse) => (
              <View
                key={adresse.id}
                testID={`carnet-ligne-${adresse.id}`}
                style={s.ligne}
              >
                <Icon name="map-pin" size={20} color={colors.brand[600]} />
                <View style={s.ligneTextes}>
                  <Txt style={s.ligneTitre}>{adresse.label}</Txt>
                  <Txt style={s.ligneSous}>
                    {adresse.address} · {adresse.governorate}
                  </Txt>
                </View>
                <Pressable
                  testID={`carnet-modifier-${adresse.id}`}
                  onPress={() =>
                    setBrouillon({
                      id: adresse.id,
                      label: adresse.label,
                      address: adresse.address,
                      governorate: adresse.governorate,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={t('address_book.edit')}
                  hitSlop={8}
                >
                  <Icon name="pencil" size={18} color={colors.neutral[400]} />
                </Pressable>
                <Pressable
                  testID={`carnet-supprimer-${adresse.id}`}
                  onPress={() => confirmerSuppression(adresse)}
                  accessibilityRole="button"
                  accessibilityLabel={t('address_book.remove')}
                  hitSlop={8}
                >
                  <Icon name="x" size={20} color={colors.neutral[400]} />
                </Pressable>
              </View>
            ))
          )}

          {/* Le plafond est ANNONCE avant d'être atteint, et non découvert par
              un refus au moment d'enregistrer. */}
          {plein ? (
            <Txt testID="carnet-plein" style={s.avertissement}>
              {t('address_book.limit_reached', { max: MAXIMUM })}
            </Txt>
          ) : brouillon === null ? (
            <Button
              testID="carnet-ajouter"
              label={t('address_book.add')}
              onPress={() => setBrouillon(BROUILLON_VIDE)}
              style={s.ajouter}
            />
          ) : null}

          {brouillon !== null ? (
            <View style={s.formulaire}>
              <TextField
                testID="carnet-champ-nom"
                label={t('address_book.label_field')}
                placeholder={t('address_book.label_placeholder')}
                value={brouillon.label}
                onChangeText={(v) => setBrouillon({ ...brouillon, label: v })}
              />
              <TextField
                testID="carnet-champ-adresse"
                label={t('address_book.address_field')}
                placeholder={t('address_book.address_placeholder')}
                value={brouillon.address}
                onChangeText={(v) => setBrouillon({ ...brouillon, address: v })}
              />
              <Select
                testID="carnet-champ-gouvernorat"
                label={t('address_book.governorate_field')}
                placeholder={t('address_book.governorate_placeholder')}
                options={optionsGouvernorat}
                // `|| null` : `Select` distingue « rien de choisi » (null, qui
                // affiche le placeholder) d'une valeur vide.
                value={brouillon.governorate || null}
                onChange={(v) => setBrouillon({ ...brouillon, governorate: v })}
              />

              {messageErreur ? (
                <Txt testID="carnet-erreur-ecriture" style={s.erreur}>
                  {messageErreur}
                </Txt>
              ) : null}

              <Button
                testID="carnet-enregistrer"
                label={
                  enregistrer.isPending
                    ? t('profile.saving')
                    : t('profile.save')
                }
                loading={enregistrer.isPending}
                disabled={
                  !brouillon.label.trim() ||
                  !brouillon.address.trim() ||
                  !brouillon.governorate
                }
                onPress={() =>
                  enregistrer.mutate({
                    id: brouillon.id,
                    champs: {
                      label: brouillon.label.trim(),
                      address: brouillon.address.trim(),
                      governorate: brouillon.governorate,
                    },
                  })
                }
              />
              <Button
                testID="carnet-annuler"
                variant="ghost"
                label={t('address_book.cancel')}
                onPress={() => setBrouillon(null)}
              />
            </View>
          ) : null}
        </>
      )}
    </FormModalPanel>
  );
}

const s = StyleSheet.create({
  explication: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  chargement: { marginVertical: spacing['2xl'] },
  vide: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['2xl'],
  },
  videTitre: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  videAide: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  ligneTextes: { flex: 1, gap: 2 },
  ligneTitre: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  ligneSous: { fontSize: fontSize.sm, color: colors.neutral[500] },
  ajouter: { marginTop: spacing.lg },
  formulaire: { marginTop: spacing.lg, gap: spacing.md },
  avertissement: {
    fontSize: fontSize.sm,
    color: colors.text.warning,
    marginTop: spacing.lg,
  },
  erreur: {
    fontSize: fontSize.sm,
    color: colors.text.error,
    marginBottom: spacing.sm,
  },
});
