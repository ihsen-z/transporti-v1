import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize } from '@/shared/theme';
import { useAddresses, type AdresseEnregistreeDto } from '../api/useAddresses';

interface Props {
  /** Appelé avec l'adresse choisie. L'appelant décide des champs à remplir. */
  onChoisir: (adresse: AdresseEnregistreeDto) => void;
  /** `pickup` ou `dropoff` — sert aux identifiants de test. */
  cible: string;
}

/**
 * C5.9 — le sélecteur du carnet, dans le formulaire de publication mobile.
 *
 * **C'est ici que le carnet sert.** Un panneau de gestion que rien ne consomme
 * serait un écran de plus à entretenir et zéro friction supprimée — le défaut
 * de la moitié prospective de T5.4, livrée puis inerte faute de zones
 * déclarées.
 *
 * Il ne rend RIEN quand le carnet est vide, ni pendant le chargement : sur un
 * écran de téléphone, un bloc « aucune adresse » au-dessus de chaque champ
 * coûterait de la hauteur sans rien apporter. Un échec de lecture est traité
 * comme un carnet vide — le formulaire reste intégralement utilisable à la
 * main, et une erreur sur un confort optionnel détournerait de la saisie en
 * cours. Le panneau de gestion, lui, remonte ses erreurs.
 */
export function SavedAddressPicker({ onChoisir, cible }: Props) {
  const { t } = useTranslation();
  const carnet = useAddresses(true);

  const adresses: AdresseEnregistreeDto[] = carnet.isError
    ? []
    : (carnet.data ?? []);

  if (adresses.length === 0) return null;

  return (
    <View testID={`carnet-selecteur-${cible}`} style={s.bloc}>
      <Txt style={s.titre}>{t('address_book.pick_title')}</Txt>
      <View style={s.pastilles}>
        {adresses.map((adresse) => (
          <Pressable
            key={adresse.id}
            testID={`carnet-choix-${cible}-${adresse.id}`}
            onPress={() => onChoisir(adresse)}
            accessibilityRole="button"
            // Le gouvernorat est dans le libellé d'accessibilité : deux lieux
            // peuvent porter des noms proches, et c'est lui qui les distingue.
            accessibilityLabel={`${adresse.label} — ${adresse.governorate}`}
            style={s.pastille}
          >
            <Txt style={s.pastilleTexte}>{adresse.label}</Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bloc: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  titre: { fontSize: fontSize.sm, color: colors.neutral[500] },
  pastilles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pastille: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
  },
  pastilleTexte: { fontSize: fontSize.sm, color: colors.neutral[700] },
});
