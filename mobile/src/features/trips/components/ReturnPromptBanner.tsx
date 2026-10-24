import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { appStorage } from '@/core/storage/appStorage';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize, radii, TOUCH_TARGET } from '@/shared/theme';
import { useCompletedMissions } from '@/features/missions/api/useCompletedMissions';

/**
 * T4.4 — L'amorce de retour à vide, sur l'Accueil du transporteur.
 *
 * **L'écran de priorité 1 du plan.** Sans lui, l'inventaire de trajets retour
 * ne s'alimente que volontairement : un transporteur qui vient de livrer et
 * rentre à vide n'a aucune raison de penser à la plateforme à cet instant — le
 * seul où la publication lui est évidente.
 *
 * Différence assumée avec le web : là-bas, l'amorce vit sur le détail de la
 * mission livrée. Sur mobile, `mission/[id]` est un écran **client** (payer,
 * confirmer la réception, noter) atteint depuis les demandes du client ; le
 * transporteur n'a pas de détail de mission. L'Accueil est donc son seul point
 * de passage après une livraison, et c'est là que l'amorce doit vivre.
 *
 * Deux garde-fous, identiques au web :
 * 1. Une échappatoire obligatoire, sans quoi l'amorce serait perçue comme une
 *    relance publicitaire et désactivée mentalement.
 * 2. Une règle de non-répétition par mission. Préférence d'affichage locale,
 *    pas une donnée métier : une perte de stockage ne coûte qu'une
 *    réapparition.
 */

const PREFIXE_STOCKAGE = 'transporti_amorce_retour_refusee_';

export function ReturnPromptBanner() {
  const { t } = useTranslation();
  const router = useRouter();
  const completed = useCompletedMissions();

  // La mission la plus récemment livrée : c'est celle dont on rentre.
  const derniere = completed.data?.[0];

  // Lecture synchrone via MMKV (`appStorage`), la convention du projet : pas de
  // dependance supplementaire, et pas d'etat intermediaire ou l'amorce
  // clignoterait avant de se masquer.
  const [refuseeLocalement, setRefuseeLocalement] = useState(false);

  const clef = derniere ? `${PREFIXE_STOCKAGE}${derniere.id}` : null;
  const dejaRefusee = clef ? appStorage.getString(clef) === '1' : false;

  if (!derniere || dejaRefusee || refuseeLocalement) return null;

  // Le corridor est inversé : le transporteur a livré à l'arrivée de la
  // mission, il rentre vers son point de départ.
  const depuis = derniere.dropoff_governorate;
  const vers = derniere.pickup_governorate;

  // Constat de la recette du 27/08 : certaines missions ne portent pas de
  // gouvernorat. Un repli sur l'adresse produisait une phrase absurde et
  // menait a un formulaire VIDE, l'adresse ne correspondant a aucun
  // gouvernorat. Une amorce qui n'economise aucune saisie est pire qu'une
  // absence d'amorce : elle promet 30 secondes et n'en tient rien.
  if (!depuis || !vers) return null;

  const publier = () => {
    router.push({
      pathname: '/publish',
      params: { depuis, vers, quand: 'aujourdhui' },
    });
  };

  const plusTard = () => {
    setRefuseeLocalement(true);
    if (clef) appStorage.setString(clef, '1');
  };

  return (
    <View style={s.bandeau} testID="mission-amorce-retour">
      <Txt style={s.titre}>{t('trips.prompt.title', { vers })}</Txt>
      <Txt style={s.corps}>{t('trips.prompt.body')}</Txt>

      <View style={s.corridor}>
        <Txt style={s.corridorTexte}>
          {depuis} → {vers}
        </Txt>
      </View>

      <Button
        testID="mission-amorce-publier"
        label={t('trips.prompt.publish')}
        onPress={publier}
        variant="cta"
      />

      {/* Échappatoire : discrète mais toujours présente. */}
      <Pressable
        testID="mission-amorce-plus-tard"
        onPress={plusTard}
        accessibilityRole="button"
        style={s.plusTard}
      >
        <Txt style={s.plusTardTexte}>{t('trips.prompt.later')}</Txt>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  // Gabarit de carte de la charte (rayon 22, padding 16), teinté chaud parce
  // que c'est l'amorce commerciale — mais SANS le liseré orange de 2 px qu'il
  // portait. Ce liseré redoublait un CTA orange déjà présent à l'intérieur :
  // le bloc criait deux fois la même chose, et sur un écran où la charte
  // n'autorise qu'un orange, c'est le bouton qui doit le porter.
  bandeau: {
    backgroundColor: colors.cta[50],
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  titre: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text.cta },
  corps: { fontSize: fontSize.sm, color: colors.text.cta },
  corridor: {
    alignSelf: 'flex-start',
    backgroundColor: colors.neutral[0],
    borderRadius: radii.tag,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  corridorTexte: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  // Mesure a 29 dp : c'est l'echappatoire obligatoire du bandeau, la rater
  // fait taper sur le CTA juste au-dessus.
  plusTard: {
    alignSelf: 'center',
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  plusTardTexte: { fontSize: fontSize.sm, color: colors.neutral[500] },
});
