import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { appStorage } from '@/core/storage/appStorage';
import { Icon } from '@/shared/ui/icons';
import type { IconName } from '@/shared/ui/icons';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import { useAuthStore } from '@/core/auth/authStore';
import { useTransporterProfile } from '@/features/profiles/api/useTransporterProfile';
import { useTransporterStats } from '@/features/stats/api/useTransporterStats';
import { ServiceAreasPanel } from '@/features/profiles/components/ServiceAreasPanel';
import { TrustPanel } from '@/features/trust/components/TrustPanel';

/**
 * T0.4 — Le guide de démarrage du transporteur, sur l'Accueil.
 *
 * Le mobile n'avait AUCUN onboarding. Ce n'est donc pas une transposition du
 * web : c'est un écran neuf, aligné sur le comportement du web là où le mobile
 * a de quoi le tenir.
 *
 * **Règle qui gouverne tout ce fichier : une étape n'existe que si sa
 * destination existe.** Le défaut de T0.1 côté web était exactement l'inverse
 * — une étape qui nommait les zones de service et pointait vers un écran où ce
 * champ n'existe pas. Chaque destination ci-dessous a été vérifiée.
 *
 * Les trois étapes, et pourquoi celles-là :
 *
 * 1. `verifier` → panneau Confiance. Disparaît quand l'identité est vérifiée.
 * 2. `publier` → écran de publication (la destination du bouton central).
 *    Disparaît dès qu'un retour a été publié.
 * 3. `zones` → panneau Zones de service. Disparaît quand une zone est déclarée.
 *
 * **Un écart de comportement assumé avec le web, et il n'est pas cosmétique.**
 * Le web propose « Trouvez votre première mission », qui mène à la liste des
 * annonces ouvertes. Le transporteur mobile n'a pas cet écran : la charte lui
 * donne `home / requests / messages / gains` plus le bouton « publier », et
 * `search` appartient au client. Pointer vers `search` l'enverrait sur un écran
 * hors de sa navigation. L'étape est donc remplacée par « publiez votre premier
 * retour », ce qui est aussi l'action première du pivot pour un transporteur.
 * Aligner le web sur cette lecture est un chantier à part, à décider.
 *
 * **Présentation** : le web fait défiler une étape à la fois avec des points de
 * navigation ; ici les étapes restantes sont listées ensemble. La charte mobile
 * privilégie une carte compacte sur l'Accueil, et une liste évite un index
 * d'étape à conserver — donc un état de plus à désynchroniser. Les étapes
 * affichées et leurs conditions de disparition sont, elles, identiques.
 */

const PREFIXE_STOCKAGE = 'transporti_guide_transporteur_masque_';

type IdEtape = 'verifier' | 'publier' | 'zones';

interface Etape {
  id: IdEtape;
  icone: IconName;
}

const ETAPES: readonly Etape[] = [
  { id: 'verifier', icone: 'shield-check' },
  { id: 'publier', icone: 'circle-plus' },
  { id: 'zones', icone: 'map-pin' },
];

export function TransporterOnboardingGuide() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Le profil sert DEUX signaux : la vérification d'identité et les zones.
  //
  // `is_verified` vient d'ici et NON de `user.isVerified` du store, qui vaut
  // `is_phone_verified` — la confirmation du numéro, pas celle de l'identité.
  // S'en servir aurait masqué l'étape « vérifiez votre identité » à quiconque a
  // confirmé son téléphone, sans aucun signal.
  const profil = useTransporterProfile(user?.id ?? null);
  const stats = useTransporterStats(true);

  const [masqueLocalement, setMasqueLocalement] = useState(false);
  const [zonesOuvert, setZonesOuvert] = useState(false);
  const [confianceOuvert, setConfianceOuvert] = useState(false);

  const clef = user?.id ? `${PREFIXE_STOCKAGE}${user.id}` : null;
  // Lecture synchrone (MMKV) : la convention du projet. Un état intermédiaire
  // ferait clignoter le guide avant de le masquer.
  const dejaMasque = clef ? appStorage.getString(clef) === '1' : false;

  if (dejaMasque || masqueLocalement) return null;

  // Tant qu'on ne sait pas, on n'affiche RIEN. Afficher les trois étapes en
  // attendant les données ferait proposer à un transporteur déjà en règle de
  // refaire ce qu'il a fait — et un guide qui redemande l'acquis cesse d'être
  // lu. Mieux vaut apparaître une seconde plus tard que mentir une seconde.
  if (!profil.data) return null;

  const accomplies: Record<IdEtape, boolean> = {
    verifier: profil.data.is_verified,
    // `?? false` et non `?? true` : sans les stats, on ne sait pas si un retour
    // a été publié. Supposer que oui masquerait l'étape la plus importante du
    // pivot. Une étape proposée une fois de trop coûte moins qu'une absente.
    publier: (stats.data?.return_trips_published ?? 0) > 0,
    zones: profil.data.service_areas.length > 0,
  };

  const restantes = ETAPES.filter((etape) => !accomplies[etape.id]);
  if (restantes.length === 0) return null;

  const masquer = () => {
    setMasqueLocalement(true);
    if (clef) appStorage.setString(clef, '1');
  };

  const ouvrir = (id: IdEtape) => {
    if (id === 'verifier') setConfianceOuvert(true);
    else if (id === 'zones') setZonesOuvert(true);
    else router.push('/publish');
  };

  return (
    <>
      <View style={s.carte} testID="guide-transporteur">
        <View style={s.entete}>
          <Txt style={s.titre}>{t('onboarding.transporter.title')}</Txt>
          {/* Échappatoire obligatoire, comme pour l'amorce de retour : sans
              elle, le guide est perçu comme une relance et désactivé
              mentalement. */}
          <Pressable
            testID="guide-transporteur-masquer"
            onPress={masquer}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.transporter.dismiss')}
            hitSlop={10}
          >
            <Icon name="x" size={22} color={colors.neutral[400]} />
          </Pressable>
        </View>

        <Txt testID="guide-transporteur-reste" style={s.reste}>
          {t('onboarding.transporter.remaining', { count: restantes.length })}
        </Txt>

        {restantes.map((etape) => (
          <Pressable
            key={etape.id}
            testID={`guide-transporteur-etape-${etape.id}`}
            style={s.etape}
            onPress={() => ouvrir(etape.id)}
            accessibilityRole="button"
          >
            <Icon name={etape.icone} size={22} color={colors.brand[600]} />
            <View style={s.etapeTextes}>
              <Txt style={s.etapeTitre}>
                {t(`onboarding.transporter.steps.${etape.id}.title`)}
              </Txt>
              <Txt style={s.etapeCorps}>
                {t(`onboarding.transporter.steps.${etape.id}.body`)}
              </Txt>
            </View>
            <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
          </Pressable>
        ))}
      </View>

      {/* Les panneaux sont montés ICI et non atteints via le Profil : le web
          donne un accès direct depuis son guide, et passer par « allez dans
          Profil, puis ouvrez Zones » ajouterait deux gestes à une étape censée
          en économiser. Les mêmes panneaux restent accessibles depuis le Profil,
          leur emplacement établi. */}
      <ServiceAreasPanel
        visible={zonesOuvert}
        onClose={() => setZonesOuvert(false)}
        userId={user?.id ?? null}
      />
      <TrustPanel visible={confianceOuvert} onClose={() => setConfianceOuvert(false)} />
    </>
  );
}

const s = StyleSheet.create({
  carte: {
    backgroundColor: colors.neutral[0],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titre: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.neutral[900],
    flexShrink: 1,
  },
  reste: { fontSize: fontSize.sm, color: colors.neutral[500] },
  etape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  etapeTextes: { flex: 1, gap: 2 },
  etapeTitre: { fontSize: fontSize.base, fontWeight: '700', color: colors.neutral[900] },
  etapeCorps: { fontSize: fontSize.sm, color: colors.neutral[500], lineHeight: 18 },
});
