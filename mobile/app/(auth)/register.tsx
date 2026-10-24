import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { LanguageToggle } from '@/shared/ui/LanguageToggle';
import { AppScreen } from '@/shared/ui/AppScreen';
import { AppHeader } from '@/shared/ui/AppHeader';
import { BrandLockup } from '@/shared/ui/BrandLockup';
import { Card } from '@/shared/ui/Card';
import { Txt } from '@/shared/ui/Txt';
import { AuthLink } from '@/features/auth/components/AuthLink';
import { colors, fontSize } from '@/shared/theme';

// Route mince : composition uniquement. La logique vit dans RegisterForm.
//
// Famille APPLICATIVE, et c'est un choix de la charte (§7 : « Inscription —
// applicatif »), pas un oubli. L'inscription demande sept champs : sur un
// dégradé, cette hauteur de formulaire fatigue et le verre finit par se lire
// comme du bruit. Le bandeau bleu porte l'identité, le formulaire respire sur
// du clair.
//
// La case CGU que la charte liste sur cet écran n'est pas rendue : le
// formulaire ne collecte pas ce consentement aujourd'hui, et l'ajouter en
// façade — une case cochée qui n'est envoyée nulle part — donnerait une
// garantie juridique qui n'existe pas.
export default function RegisterScreen() {
  const { t } = useTranslation();

  return (
    <AppScreen
      testID="register-screen"
      header={
        <AppHeader
          leading={<BrandLockup />}
          trailing={<LanguageToggle />}
          title={t('auth.register.title')}
        >
          <Txt style={styles.subtitle}>{t('auth.register.subtitle')}</Txt>
        </AppHeader>
      }
    >
      <Card>
        <RegisterForm />
      </Card>

      <View style={styles.footer}>
        <Txt style={styles.footerText}>{t('auth.register.have_account')} </Txt>
        <AuthLink href="/login" label={t('auth.register.login_link')} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  // Rendu DANS le bandeau bleu : le sous-titre y prend l'encre sur bleu.
  subtitle: { fontSize: fontSize.md, lineHeight: fontSize.md * 1.5, color: colors.text.onBlue },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerText: { fontSize: fontSize.md, color: colors.neutral[500] },
});
