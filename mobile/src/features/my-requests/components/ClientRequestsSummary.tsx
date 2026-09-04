import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/icons';
import { colors, spacing, fontSize, TOUCH_TARGET } from '@/shared/theme';
import { useMyRequests } from '../api/useMyRequests';
import { compterParOnglet } from '../model/onglets';

/**
 * Lot 7.5 — ce qui attend la cliente, sur son écran d'arrivée (E-17).
 *
 * Volontairement un RÉSUMÉ et non la liste. `mes-demandes.tsx` porte déjà la
 * liste complète avec ses onglets et son rafraîchissement ; la dupliquer ici
 * ferait deux sources pour la même information, donc deux compteurs à tenir
 * d'accord — c'est l'objection que le code opposait déjà à « Demandes reçues »
 * sur l'accueil transporteur.
 *
 * Ce que le résumé apporte et que le bouton d'onglet n'apportait pas : savoir
 * qu'il y a quelque chose à regarder AVANT d'aller regarder.
 */
export function ClientRequestsSummary() {
  const { t } = useTranslation();
  const router = useRouter();
  const demandes = useMyRequests();

  // Rien tant qu'on ne sait pas : un « 0 en attente » affiché pendant le
  // chargement se lirait comme une reponse, et il serait faux.
  if (demandes.isLoading || !demandes.data) return null;

  const compteurs = compterParOnglet(demandes.data);
  const enCours = compteurs.attente + compteurs.negociation + compteurs['a-payer'];

  // Une cliente sans aucune demande n'a rien a suivre : le formulaire de
  // recherche au-dessus est alors le seul message utile de l'ecran.
  if (enCours === 0) return null;

  return (
    <Pressable
      testID="home-client-requests"
      onPress={() => router.push('/mes-demandes')}
      accessibilityRole="button"
      accessibilityLabel={t('home.client.requests_title')}
      accessibilityValue={{ text: t('home.client.requests_count', { nb: enCours }) }}
    >
      <Card style={s.carte}>
        <View style={s.rangee}>
          <View style={s.icone}>
            <Icon name="inbox" size={20} color={colors.brand[600]} />
          </View>
          <View style={s.texte}>
            <Txt style={s.titre}>{t('home.client.requests_title')}</Txt>
            <Txt style={s.detail}>{t('home.client.requests_count', { nb: enCours })}</Txt>
            {compteurs['a-payer'] > 0 ? (
              // Le paiement attend un geste d'elle : c'est la seule ligne qui
              // merite d'etre appelee par son nom.
              <Txt style={s.aPayer}>
                {t('home.client.requests_to_pay', { nb: compteurs['a-payer'] })}
              </Txt>
            ) : null}
          </View>
          <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
        </View>
      </Card>
    </Pressable>
  );
}

const s = StyleSheet.create({
  carte: { paddingVertical: spacing.md },
  rangee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET,
  },
  icone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand[50],
  },
  texte: { flex: 1, gap: 2 },
  titre: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  detail: { fontSize: fontSize.sm, color: colors.neutral[500] },
  aPayer: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text.cta },
});
