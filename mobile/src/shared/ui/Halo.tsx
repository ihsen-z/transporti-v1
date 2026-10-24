import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

// Halo de lumière du fond immersif.
//
// La charte l'écrit `filter: blur(60px)` sur un cercle plein. React Native n'a
// pas de filtre de flou : sans dépendance native, `blur` n'existe pas, et
// `expo-blur` floute l'ARRIÈRE-PLAN, pas la forme — il ne sait donc pas faire
// ça, en plus de coûter du GPU sur un écran que la charte veut statique.
//
// Un flou gaussien appliqué à un disque produit un profil d'opacité connu :
// plein au centre, décroissance douce vers le bord, et rien de net nulle part.
// C'est exactement ce qu'un dégradé radial sait dessiner — en une seule
// primitive SVG, sans passe de post-traitement. Les cinq arrêts ci-dessous
// approchent la courbe d'un `blur(60px)` sur un disque de 240–260 px.
interface Props {
  color: string;
  /** Opacité au centre. Le bord tombe toujours à zéro. */
  opacity: number;
  /** Diamètre visible. */
  size: number;
  /** Positionnement absolu — la charte veut le halo partiellement hors cadre. */
  style?: StyleProp<ViewStyle>;
  id: string;
}

// Profil d'opacité, en fractions de `opacity`. Le 0,72 à 35 % maintient un
// cœur lumineux ; la queue longue (0,14 à 80 %) évite l'anneau visible qu'on
// obtient avec un dégradé linéaire à deux arrêts.
const FALLOFF: readonly [number, number][] = [
  [0, 1],
  [0.35, 0.72],
  [0.6, 0.38],
  [0.8, 0.14],
  [1, 0],
];

export function Halo({ color, opacity, size, style, id }: Props) {
  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { width: size, height: size }, style]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            {FALLOFF.map(([offset, ratio]) => (
              <Stop
                key={offset}
                offset={offset}
                stopColor={color}
                stopOpacity={opacity * ratio}
              />
            ))}
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
});
