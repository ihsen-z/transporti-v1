import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { AppScreen } from '@/shared/ui/AppScreen';
import { AppHeader } from '@/shared/ui/AppHeader';
import { BackButton } from '@/shared/ui/BackButton';
import { Pill } from '@/shared/ui/Pill';
import {
  TrustExplainer,
  type Parcours,
} from '@/features/onboarding/components/TrustExplainer';
import { spacing } from '@/shared/theme';

/**
 * P2 + P3 de la cartographie — « Comment ça marche » et « Confiance ».
 *
 * Ces deux pages y sont classées ➕ (à créer) depuis le 26/08, et l'audit du
 * 02/09 les a retrouvées manquantes : côté mobile, une cliente qui hésite à
 * confier sa marchandise n'avait rien à lire. `AboutPanel` ne porte que le
 * logo, la version et un copyright.
 *
 * Écran hors barre d'onglets : la charte impose 4 onglets plus le bouton
 * central. On y arrive depuis le menu du profil, et il est adressable pour
 * qu'un lien d'acquisition puisse y mener directement.
 *
 * Le parcours affiché par défaut est celui du rôle connecté, mais l'autre
 * reste accessible d'un tap : un client qui découvre qu'il pourrait publier ses
 * propres retours est exactement le chemin d'acquisition que la cartographie
 * appelle P4, et le masquer fermerait cette porte.
 */
export default function CommentCaMarcheScreen() {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);

  const [parcours, setParcours] = useState<Parcours>(
    role === 'TRANSPORTER' ? 'TRANSPORTER' : 'CLIENT',
  );

  const onglets: readonly { valeur: Parcours; cle: string }[] = [
    { valeur: 'CLIENT', cle: 'how_it_works.tab_client' },
    { valeur: 'TRANSPORTER', cle: 'how_it_works.tab_transporter' },
  ];

  return (
    <AppScreen
      testID="how-it-works-screen"
      header={
        <AppHeader
          leading={<BackButton testID="how-it-works-back" />}
          title={t('how_it_works.title')}
        />
      }
    >
      <View style={styles.onglets}>
        {onglets.map((onglet) => (
          <Pill
            key={onglet.valeur}
            testID={`how-it-works-tab-${onglet.valeur}`}
            label={t(onglet.cle)}
            selected={parcours === onglet.valeur}
            onPress={() => setParcours(onglet.valeur)}
            fill
          />
        ))}
      </View>

      <TrustExplainer parcours={parcours} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  onglets: { flexDirection: 'row', gap: spacing.sm },
});
