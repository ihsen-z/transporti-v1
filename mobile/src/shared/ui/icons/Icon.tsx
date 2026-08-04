import { I18nManager } from 'react-native';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';
import { GLYPHS, DIRECTIONAL, type IconName, type Shape } from './glyphs';
import { colors } from '@/shared/theme';

export type { IconName };

interface Props {
  name: IconName;
  /** Côté du carré de rendu. 20 = taille d'icône d'onglet de la charte. */
  size?: number;
  color?: string;
  /** Épaisseur du trait. 2 = valeur Lucide ; 2.25 pour appuyer un état actif. */
  strokeWidth?: number;
  /** Remplit le glyphe (étoile pleine d'une note, par exemple). */
  filled?: boolean;
}

// Rend une forme du glyphe. Le `key` est l'index : la liste d'un glyphe est
// figée à la compilation, donc l'ordre ne peut pas changer au fil des rendus.
function renderShape(shape: Shape, i: number) {
  if ('path' in shape) return <Path key={i} d={shape.path} />;
  if ('polyline' in shape) return <Polyline key={i} points={shape.polyline} />;
  if ('circle' in shape) {
    const [cx, cy, r] = shape.circle;
    return <Circle key={i} cx={cx} cy={cy} r={r} />;
  }
  const [x, y, w, h, rx] = shape.rect;
  return <Rect key={i} x={x} y={y} width={w} height={h} rx={rx} />;
}

/**
 * Icône vectorielle de la charte (famille Lucide, rendue en SVG).
 *
 * Remplace `@expo/vector-icons` : celui-ci dépend de polices .ttf qui doivent
 * être embarquées dans l'APK. Elles ne l'étaient pas, et toutes les icônes
 * étaient donc invisibles. Le SVG voyage dans le bundle JS — la panne devient
 * structurellement impossible.
 */
export function Icon({
  name,
  size = 20,
  color = colors.neutral[500],
  strokeWidth = 2,
  filled = false,
}: Props) {
  const shapes = GLYPHS[name] as readonly Shape[];

  // Les glyphes directionnels suivent le sens de lecture (chevron « suivant »).
  const mirror = I18nManager.isRTL && DIRECTIONAL.has(name);

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={mirror ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      {shapes.map(renderShape)}
    </Svg>
  );
}
