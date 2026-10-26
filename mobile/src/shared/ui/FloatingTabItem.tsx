import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { colors, fontSize, radii, TOUCH_TARGET } from '@/shared/theme';

// Un onglet de la barre flottante.
//
// Extrait de FloatingTabBar pour une raison précise : l'onglet a désormais un
// ÉTAT ANIMÉ, donc ses propres hooks. Rendu en boucle depuis le parent, il ne
// pouvait pas en avoir — les hooks ne se déclarent pas dans une fonction de
// rendu appelée n fois.
//
// L'icône se soulève et grossit légèrement quand l'onglet devient actif, et
// s'enfonce à l'appui. C'est ce qui répond à « les icônes sont statiques » :
// l'état actif ne se lit plus seulement à la couleur, il se lit au mouvement.
// Ressort et non durée fixe — un onglet doit répondre comme un objet, pas
// comme une transition CSS.
interface Props {
  /** Icône déjà colorée et dimensionnée par la barre. */
  icon: ReactNode;
  label?: string;
  focused: boolean;
  color: string;
  badge: number;
  /** Valeur annoncée aux lecteurs d'écran quand `badge > 0`. */
  badgeAnnonce?: string;
  onPress: () => void;
  testID: string;
}

export function FloatingTabItem({
  icon,
  label,
  focused,
  color,
  badge,
  badgeAnnonce,
  onPress,
  testID,
}: Props) {
  // Deux valeurs distinctes : l'état actif (durable) et l'appui (transitoire).
  // Fondues en une seule, relâcher le doigt effacerait le soulèvement de
  // l'onglet qu'on vient d'activer.
  const actif = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const appui = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(actif, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      // Amorti haut, tension moyenne : le mouvement se pose, il ne rebondit
      // pas. Une barre d'onglets qui rebondit fatigue au bout de dix taps.
      friction: 9,
      tension: 140,
    }).start();
  }, [focused, actif]);

  const presser = (vers: number) =>
    Animated.spring(appui, {
      toValue: vers,
      useNativeDriver: true,
      friction: 8,
      tension: 220,
    }).start();

  const animation = {
    transform: [
      {
        translateY: Animated.add(
          actif.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }),
          appui.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }),
        ),
      },
      {
        scale: Animated.multiply(
          actif.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }),
          appui.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }),
        ),
      },
    ],
  };

  return (
    <Pressable
      testID={testID}
      style={styles.tab}
      onPress={onPress}
      onPressIn={() => presser(1)}
      onPressOut={() => presser(0)}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      // Le compteur est une VALEUR de l'onglet : annonce « Messages, 3 non
      // lus » plutot que deux elements dont l'un ne dit qu'un nombre.
      accessibilityValue={badge > 0 && badgeAnnonce ? { text: badgeAnnonce } : undefined}
    >
      <Animated.View style={animation}>
        <View>
          {icon}
          {badge > 0 ? (
            <View testID={`${testID}-badge`} style={styles.badge}>
              {/* Au-dela de 1,3, le chiffre depasse la pastille sans rien
                  apporter : deux caracteres restent lisibles a cette echelle. */}
              <Txt style={styles.badgeText} maxFontSizeMultiplier={1.3}>
                {badge > 9 ? '9+' : badge}
              </Txt>
            </View>
          ) : null}
        </View>
      </Animated.View>
      {/* Libellé 11 px sous l'icône : exigé par la charte, il lève
          l'ambiguïté d'une barre qui n'affichait que des pictogrammes. La
          charte pose aussi un plancher — « jamais sous 11px ».
          Hors de la vue animée : un libellé qui grossit avec l'icône déborde
          sur ses voisins. */}
      <Txt numberOfLines={1} style={[styles.tabLabel, { color }]}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  // .tab font-size:11px — l'onglet actif prend la couleur de marque via `color`.
  tabLabel: { fontSize: fontSize.xs, fontWeight: '600' },
  // Pastille non-lus, ancrée en haut-droite de l'icône.
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    // `height` FIXE ecrasait la pastille des que l'utilisateur grossissait la
    // police : mesuree en recette a 30x12 dp a 150 % et 36x12 a 200 %, le
    // « 9+ » y devenait illisible. Or c'est le seul signal qui dit qu'une
    // decision attend, et il se degradait precisement chez ceux qui ont
    // grossi la police.
    minWidth: 18,
    minHeight: 18,
    borderRadius: radii.full,
    backgroundColor: colors.cta[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: colors.neutral[0],
  },
  badgeText: { color: colors.neutral[0], fontSize: fontSize.sm - 2, fontWeight: '800' },
});
