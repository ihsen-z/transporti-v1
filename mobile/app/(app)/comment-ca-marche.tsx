import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { Icon } from '@/shared/ui/icons';
import { Txt } from '@/shared/ui/Txt';
import {
  TrustExplainer,
  type Parcours,
} from '@/features/onboarding/components/TrustExplainer';
import { useFloatingTabBarClearance } from '@/shared/ui/FloatingTabBar';
import { colors, spacing, fontSize, radii, TOUCH_TARGET } from '@/shared/theme';

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
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const margeBasse = useFloatingTabBarClearance();

  const [parcours, setParcours] = useState<Parcours>(
    role === 'TRANSPORTER' ? 'TRANSPORTER' : 'CLIENT',
  );

  const onglets: readonly { valeur: Parcours; cle: string }[] = [
    { valeur: 'CLIENT', cle: 'how_it_works.tab_client' },
    { valeur: 'TRANSPORTER', cle: 'how_it_works.tab_transporter' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.entete}>
        <Pressable
          testID="how-it-works-back"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
        >
          <Icon name="chevron-left" size={24} color={colors.neutral[900]} />
        </Pressable>
        <Txt style={s.titre}>{t('how_it_works.title')}</Txt>
      </View>

      <View style={s.onglets}>
        {onglets.map((onglet) => {
          const actif = parcours === onglet.valeur;
          return (
            <Pressable
              key={onglet.valeur}
              testID={`how-it-works-tab-${onglet.valeur}`}
              onPress={() => setParcours(onglet.valeur)}
              accessibilityRole="tab"
              accessibilityState={{ selected: actif }}
              style={[s.onglet, actif && s.ongletActif]}
            >
              <Text style={[s.ongletTexte, actif && s.ongletTexteActif]}>
                {t(onglet.cle)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[s.contenu, { paddingBottom: margeBasse }]}
      >
        <TrustExplainer parcours={parcours} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  titre: { flex: 1, fontSize: fontSize.xl, fontWeight: '800', color: colors.neutral[900] },
  onglets: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  onglet: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
  },
  ongletActif: { backgroundColor: colors.brand[600], borderColor: colors.brand[600] },
  ongletTexte: { fontSize: fontSize.sm, fontWeight: '700', color: colors.neutral[700] },
  ongletTexteActif: { color: colors.neutral[0] },
  contenu: { paddingHorizontal: spacing.xl, gap: spacing.lg },
});
