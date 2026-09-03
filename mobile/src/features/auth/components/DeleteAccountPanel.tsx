import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FormModalPanel } from '@/shared/ui/FormModalPanel';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Txt } from '@/shared/ui/Txt';
import { useAuthStore } from '@/core/auth/authStore';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import { useDeleteAccount } from '../api/useDeleteAccount';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Suppression de compte — exigence de recevabilité des stores.
 *
 * Deux garde-fous, dans cet ordre :
 *   1. les conséquences sont ANNONCÉES avant la saisie, pas découvertes après ;
 *   2. le mot de passe est redemandé, puis une confirmation système. Une
 *      session laissée ouverte sur un téléphone prêté ne doit pas suffire.
 *
 * C'est le motif déjà employé pour la dépublication d'un retour
 * (`app/(app)/mes-retours.tsx`), qui annonce ce qu'elle va casser avant d'agir.
 */
export function DeleteAccountPanel({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const logout = useAuthStore((s) => s.logout);
  const supprimer = useDeleteAccount();
  const [password, setPassword] = useState('');
  const [erreurLocale, setErreurLocale] = useState<string | null>(null);

  const fermer = () => {
    setPassword('');
    setErreurLocale(null);
    supprimer.reset();
    onClose();
  };

  const executer = () => {
    supprimer.mutate(password, {
      // Le compte n'existe plus : la session doit tomber immédiatement,
      // sinon l'app continuerait d'interroger l'API avec un jeton devenu
      // inutilisable et n'afficherait que des erreurs.
      onSuccess: () => {
        fermer();
        void logout();
      },
    });
  };

  const confirmer = () => {
    if (!password) {
      setErreurLocale(t('profile.delete_account.password_required'));
      return;
    }
    setErreurLocale(null);
    Alert.alert(
      t('profile.delete_account.confirm_title'),
      t('profile.delete_account.confirm_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.delete_account.confirm_cta'),
          style: 'destructive',
          onPress: executer,
        },
      ],
    );
  };

  const erreur = erreurLocale
    ?? (supprimer.error
      ? (supprimer.error.kind === 'network'
          ? t('profile.delete_account.errors.network')
          : (supprimer.error.serverMessage
              ?? t('profile.delete_account.errors.unknown')))
      : null);

  return (
    <FormModalPanel
      testID="delete-account-panel"
      visible={visible}
      title={t('profile.delete_account.title')}
      onClose={fermer}
    >
      {visible ? (
        <View style={s.corps}>
          {/* Les conséquences, avant la saisie. */}
          <View style={s.avertissement}>
            <Txt style={s.avertissementTitre}>
              {t('profile.delete_account.warning_title')}
            </Txt>
            <Txt style={s.avertissementTexte}>
              {t('profile.delete_account.warning_body')}
            </Txt>
          </View>

          <Txt style={s.conserve}>{t('profile.delete_account.kept')}</Txt>

          <TextField
            testID="delete-account-password"
            label={t('profile.delete_account.password_label')}
            placeholder={t('profile.delete_account.password_ph')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            error={erreur ?? undefined}
          />

          <Button
            testID="delete-account-submit"
            label={t('profile.delete_account.submit')}
            onPress={confirmer}
            variant="danger"
            loading={supprimer.isPending}
          />
          <Text style={s.reversible}>{t('profile.delete_account.irreversible')}</Text>
        </View>
      ) : null}
    </FormModalPanel>
  );
}

const s = StyleSheet.create({
  corps: { gap: spacing.lg, paddingTop: spacing.md },
  avertissement: {
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: '#fef2f2',
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  avertissementTitre: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.error,
  },
  avertissementTexte: { fontSize: fontSize.sm, color: colors.neutral[700] },
  conserve: { fontSize: fontSize.sm, color: colors.neutral[500] },
  reversible: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    textAlign: 'center',
  },
});
