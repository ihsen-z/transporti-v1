import { useRef, useState, type ReactElement, type ReactNode } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type RefreshControlProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Halo } from '@/shared/ui/Halo';
import { SurfaceToneProvider } from '@/shared/ui/SurfaceTone';
import {
  colors,
  gradients,
  radii,
  spacing,
  BANNER_MIN,
  BANNER_OVERLAP,
  SCREEN_PADDING,
} from '@/shared/theme';

// Écran de la famille APPLICATIVE.
//
// Structure reprise de la maquette (`Transporti Verre - Écrans`, écran 2c) :
// un bandeau bleu en `position: absolute` — donc FIXE, hors du flux — et une
// couche de contenu qui défile PAR-DESSUS lui.
//
// C'est ce qui manquait. Le bandeau était un bloc dans le flux du ScrollView :
// il partait avec le contenu au premier geste, et au sur-défilement vers le
// haut c'était du blanc qui apparaissait au-dessus du bleu. Un fond qui défile
// n'est pas un fond, c'est un premier élément de liste.
//
// Le bandeau garde son rayon bas de 34 et ses deux halos ; la première carte du
// contenu vient mordre dessus — c'est le chevauchement que la charte appelle sa
// signature, « la carte commence dans le bleu et descend sur le fond clair ».
//
// Coût technique : deux interpolations d'une seule valeur animée, transform et
// opacity uniquement, `useNativeDriver` — le défilement ne repasse jamais par
// le thread JS. C'est la seule forme d'animation de défilement qui tient
// 60 images par seconde sur un Android d'entrée de gamme.
interface Props {
  /** Bandeau haut (AppHeader). Il porte lui-même son inset supérieur. */
  header?: ReactNode;
  children: ReactNode;
  /** Barre d'action fixe (ActionBar) : hors défilement, collée en bas. */
  footer?: ReactNode;
  /**
   * `false` quand l'écran défile DÉJÀ par lui-même — une FlatList, un fil de
   * messages. Imbriquer une liste virtualisée dans un ScrollView lui retire sa
   * virtualisation (avertissement RN) et casse son `onEndReached` : les écrans
   * paginés doivent garder la main sur leur propre défilement.
   *
   * L'en-tête ne défile alors pas du tout — il n'a donc pas de parallaxe, et
   * n'en a pas besoin.
   */
  scroll?: boolean;
  /** Passé au ScrollView interne (`scroll` seulement). */
  refreshControl?: ReactElement<RefreshControlProps>;
  /**
   * Marge basse réservée sous le contenu. Les écrans à onglets y passent
   * `useTabBarClearance()` : sans elle, leur dernier élément reste sous la
   * barre de navigation et son action devient inatteignable.
   *
   * `scroll` seulement. Avec `scroll={false}`, c'est la liste qui pose sa
   * marge sur son propre `contentContainerStyle` — la lui donner ici ne ferait
   * rien, et le silence coûterait un élément inatteignable de plus.
   */
  contentPaddingBottom?: number;
  testID?: string;
}

// `LinearGradient` n'accepte pas de valeur animée sur son style : il faut
// l'envelopper. Une seule fois, au niveau du module — le faire dans le composant
// recréerait le type à chaque rendu et démonterait le dégradé.
const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

// Fraction du défilement que l'en-tête suit. À 1 il partirait avec le contenu ;
// à 0 il resterait collé. 0,35 donne la profondeur sans que le titre paraisse
// décroché du bandeau qui, lui, ne bouge pas du tout.
const PARALLAXE = 0.35;

export function AppScreen({
  header,
  children,
  footer,
  scroll = true,
  refreshControl,
  contentPaddingBottom,
  testID,
}: Props) {
  const bas = contentPaddingBottom ?? spacing.xl;
  const defilement = useRef(new Animated.Value(0)).current;
  // Hauteur mesurée de l'en-tête. Elle donne DEUX choses : la hauteur du
  // bandeau bleu (l'en-tête plus le chevauchement) et la borne des
  // interpolations. Une constante aurait été démentie par le premier titre sur
  // deux lignes.
  const mesure = useRef(0);
  const [hauteurEntete, setHauteurEntete] = useState(0);

  const onLayoutEntete = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - mesure.current) > 1) {
      mesure.current = h;
      setHauteurEntete(h);
    }
  };

  const hauteurBandeau = Math.max(BANNER_MIN, hauteurEntete + BANNER_OVERLAP);

  // Le bandeau ne bouge pas, mais il s'efface une fois qu'on l'a dépassé.
  //
  // Il ne s'agit pas d'un effet : sans ça, tout ce qui défile par-dessus le
  // traverse, et un titre de section en bleu de marque devient illisible sur du
  // bleu — vu à l'écran le 08/09, « Mes missions » disparaissait au défilement.
  // Un fond a une raison d'être tant que ce qu'il porte est visible ; passé sa
  // hauteur, il n'en a plus, et il rend la place au fond clair.
  const opaciteBandeau = defilement.interpolate({
    inputRange: [0, Math.max(1, hauteurBandeau * 0.8)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  // `Math.max(1, …)` : une plage d'interpolation nulle fait lever RN.
  const plage = Math.max(1, hauteurEntete);
  const entete = {
    transform: [
      {
        translateY: defilement.interpolate({
          inputRange: [0, plage],
          outputRange: [0, plage * PARALLAXE],
          // `clamp` en tête : au sur-défilement vers le haut, l'en-tête ne doit
          // pas descendre plus bas que sa place — le bandeau, lui, ne bouge pas.
          extrapolateLeft: 'clamp',
        }),
      },
    ],
    opacity: defilement.interpolate({
      inputRange: [0, plage * 0.8],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    }),
  };

  return (
    <SurfaceToneProvider tone="light">
      <View testID={testID} style={styles.root}>
        {/* Le bandeau, hors du flux et hors du défilement. `overflow: hidden`
            fait suivre ses coins arrondis par les deux halos, qui sinon
            déborderaient en rectangle et effaceraient le rayon. */}
        <AnimatedGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bandeau, { height: hauteurBandeau, opacity: opaciteBandeau }]}
        >
          {/* Lumière blanche diffuse en haut, halo vert en bas : les deux de la
              maquette. `end`/`start` et non `right`/`left` — l'écran se miroite
              en arabe, les halos suivent. */}
          <View style={styles.lueur} />
          <Halo
            id="halo-app"
            color={halosVert.color}
            opacity={halosVert.opacity}
            size={halosVert.size}
            style={{ start: -40, bottom: -70 }}
          />
        </AnimatedGradient>

        {/* Le bandeau est bleu foncé : l'heure et la batterie doivent passer en
            blanc, sinon elles disparaissent dedans. */}
        <StatusBar style="light" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          {scroll ? (
            <Animated.ScrollView
              contentContainerStyle={[styles.scroll, { paddingBottom: bas }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              refreshControl={refreshControl}
              scrollEventThrottle={16}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: defilement } } }],
                { useNativeDriver: true },
              )}
            >
              <Animated.View onLayout={onLayoutEntete} style={entete}>
                {header}
              </Animated.View>
              <View style={styles.corps}>{children}</View>
            </Animated.ScrollView>
          ) : (
            <>
              <View onLayout={onLayoutEntete}>{header}</View>
              {/* Pas de padding ici : une liste pose le sien sur son propre
                  `contentContainerStyle`, sinon ses séparateurs et son
                  indicateur de défilement se retrouvent encastrés. */}
              <View style={styles.flex}>{children}</View>
            </>
          )}
          {footer}
        </KeyboardAvoidingView>
      </View>
    </SurfaceToneProvider>
  );
}

// Halo vert du bandeau applicatif : plus petit et plus discret que ceux de la
// famille immersive, parce qu'un écran applicatif a déjà son contenu pour
// porter le regard.
const halosVert = { color: '#2FAC55', opacity: 0.22, size: 180 } as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutral[50] },
  flex: { flex: 1 },
  bandeau: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: radii.header,
    borderBottomRightRadius: radii.header,
    overflow: 'hidden',
  },
  // Lueur blanche du coin haut : un simple disque à 8 %, sans flou. C'est ce
  // que fait la maquette — à cette opacité, le flou ne se verrait pas et
  // coûterait une passe de rendu.
  lueur: {
    position: 'absolute',
    end: -50,
    top: -40,
    width: 200,
    height: 200,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  scroll: { flexGrow: 1 },
  // Gap 16 : la charte espace plus serré en applicatif qu'en immersif (24).
  corps: {
    flexGrow: 1,
    paddingHorizontal: SCREEN_PADDING,
    gap: spacing.lg,
  },
});
