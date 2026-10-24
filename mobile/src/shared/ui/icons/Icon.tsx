import { I18nManager } from 'react-native';
import { PHOSPHOR, DIRECTIONAL } from './phosphor';
import { colors } from '@/shared/theme';

export type IconName = keyof typeof PHOSPHOR;

/**
 * Graisse du dessin. La charte n'en utilise que deux au quotidien :
 *
 *   `duotone` — l'état de repos. Le trait porte la forme, un remplissage
 *               translucide de la MÊME couleur l'habite. C'est ce qui sort le
 *               jeu du contour uniforme, sans ajouter de seconde couleur à
 *               tenir : le remplissage est la couleur du trait à 20 %.
 *   `fill`    — l'état actif. Charte, §Navigation basse : « Onglet actif =
 *               icône pleine ; inactif = icône contour. »
 *
 * `regular` et `bold` restent disponibles pour les cas où le duotone brouille
 * un dessin minuscule (une coche de 12 px, par exemple).
 */
export type IconWeight = 'duotone' | 'fill' | 'regular' | 'bold';

interface Props {
  name: IconName;
  /** Côté du carré de rendu. 20 = taille d'icône d'onglet de la charte. */
  size?: number;
  color?: string;
  weight?: IconWeight;
  /** Raccourci d'état actif — équivaut à `weight="fill"`. */
  filled?: boolean;
  testID?: string;
}

// Le remplissage duotone est le trait à 20 % : assez pour donner du corps au
// dessin, assez peu pour que le trait reste ce qu'on lit. Au-delà, l'icône se
// referme et devient une tache ; en dessous, le duotone ne se voit plus.
const DUOTONE_OPACITY = 0.2;

/**
 * Icône de la charte, jeu Phosphor.
 *
 * Le jeu précédent était une transcription À LA MAIN de chemins Lucide : 40
 * glyphes recopiés dans un fichier, c'est-à-dire exactement les « icônes
 * géométriques » que la charte demande de remplacer (§9). Il avait deux coûts
 * qui ne se voyaient pas : toute icône manquante demandait de recopier un
 * chemin SVG, et le jeu n'avait aucune variante — donc aucun état actif.
 *
 * Phosphor apporte les deux : 1512 dessins, et six graisses dont `duotone` et
 * `fill`. Le contrat de noms ne change pas (`inbox`, `route`, `shield-check`) :
 * les écrans décrivent un rôle, la correspondance vers un dessin vit dans
 * `phosphor.ts`.
 */
export function Icon({
  name,
  size = 20,
  color = colors.neutral[500],
  weight = 'duotone',
  filled = false,
  testID,
}: Props) {
  const Glyph = PHOSPHOR[name];

  return (
    <Glyph
      testID={testID}
      size={size}
      color={color}
      weight={filled ? 'fill' : weight}
      duotoneColor={color}
      duotoneOpacity={DUOTONE_OPACITY}
      // Les glyphes directionnels suivent le sens de lecture (chevron
      // « suivant », avion en papier qui part). Phosphor retourne le dessin
      // lui-même ; inutile d'appliquer une transformation par-dessus.
      mirrored={I18nManager.isRTL && DIRECTIONAL.has(name)}
    />
  );
}
