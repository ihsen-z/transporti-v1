import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '@/shared/ui/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, spacing, radii, shadows, fontSize, TOUCH_TARGET } from '@/shared/theme';
import { Txt } from '@/shared/ui/Txt';
import { useConversations } from '@/features/messaging/api/useConversations';
import type { ConversationListDto } from '@/features/messaging/api/dto';
import type { UserRole } from '@/core/auth/authStore';

// Navigation par rôle : quels onglets afficher (dans l'ordre de la barre) et
// quel écran devient le FAB orange central (= l'action primaire du rôle).
// La visibilité est purement UI ; l'autorisation reste autoritative serveur.
interface RoleNav {
  tabs: string[];
  fab: string;
  fabIcon: IconName;
}

const ROLE_NAV: Record<'CLIENT' | 'TRANSPORTER', RoleNav> = {
  // Client : chercher un retour = l'action première du parcours. Le suivi des
  // demandes envoyées (mes-demandes) a désormais son propre onglet — il
  // n'était auparavant qu'une section noyée en bas de l'Accueil.
  CLIENT: {
    tabs: ['home', 'mes-demandes', 'messages', 'profile'],
    fab: 'search',
    fabIcon: 'search',
  },
  // Transporteur : publier un retour à vide. La charte place Gains en 5ᵉ onglet
  // à la place de Profil ; le profil reste atteignable par l'avatar de la barre
  // du haut (c'est déjà son emplacement dans la maquette du tableau de bord).
  TRANSPORTER: {
    tabs: ['home', 'requests', 'messages', 'gains'],
    fab: 'publish',
    fabIcon: 'plus',
  },
};

type Props = BottomTabBarProps & { role?: UserRole };

// Barre d'onglets flottante (pilule blanche ombrée) + FAB orange central.
export function FloatingTabBar({ state, descriptors, navigation, role }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // ADMIN/MODERATOR ne sont pas des rôles de l'app mobile -> repli client.
  const nav = role === 'TRANSPORTER' ? ROLE_NAV.TRANSPORTER : ROLE_NAV.CLIENT;

  // Nombre de conversations non lues -> pastille sur l'onglet Messages.
  // `useConversations` est une useInfiniteQuery (5.2) : `.data.pages` porte
  // une page DRF par entrée chargée, à aplatir avant de filtrer.
  const conversations = useConversations();
  const unreadMessages = (conversations.data?.pages ?? [])
    .flatMap((page) => page.results)
    .filter((c: ConversationListDto) => c.unread_count > 0).length;

  const currentName = state.routes[state.index]?.name;

  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    // 4.6 : `navigate` sur un onglet DÉJÀ actif reset sa pile imbriquée
    // (messages/, requests/) à sa racine — comportement par défaut de
    // react-navigation sur `tabPress`, que cette barre custom réimplémente
    // entièrement et court-circuitait en n'appelant `navigate` que si l'on
    // changeait d'onglet. Sans détail routé (avant 4.5) ça n'avait aucun
    // effet visible ; avec `[jobId]`, retaper Messages depuis un fil ouvert ne
    // ramenait nulle part.
    if (!event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const renderTab = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return null;
    const descriptor = descriptors[route.key];
    if (!descriptor) return null;
    const { options } = descriptor;
    const isFocused = currentName === name;
    // `neutral[400]` donnait 2,54:1 sur le blanc de la barre : très en dessous
    // du seuil AA de 4,5:1, et sur un libellé de 10 px. `neutral[500]` monte à
    // 4,83:1 sans changer la hiérarchie — l'onglet actif reste le seul en bleu.
    const color = isFocused ? colors.brand[600] : colors.neutral[500];
    const badge = name === 'messages' && unreadMessages > 0 ? unreadMessages : 0;
    return (
      <Pressable
        key={name}
        testID={`tab-${name}`}
        style={styles.tab}
        onPress={() => go(name)}
        accessibilityRole="button"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={options.title}
        // Le compteur est une VALEUR de l'onglet : annonce « Messages, 3 non
        // lus » plutot que deux elements dont l'un ne dit qu'un nombre.
        accessibilityValue={badge > 0 ? { text: t('a11y.unread', { count: badge }) } : undefined}
      >
        <View>
          {/* 20 px : taille d'icône d'onglet de la charte (.tab .ic). */}
          {options.tabBarIcon?.({ focused: isFocused, color, size: 20 })}
          {badge > 0 ? (
            <View testID={`tab-${name}-badge`} style={styles.badge}>
              {/* Au-dela de 1,3, le chiffre depasse la pastille sans rien
                  apporter : deux caracteres restent lisibles a cette echelle. */}
              <Txt style={styles.badgeText} maxFontSizeMultiplier={1.3}>
                {badge > 9 ? '9+' : badge}
              </Txt>
            </View>
          ) : null}
        </View>
        {/* Libellé 10 px sous l'icône : exigé par la charte, il lève
            l'ambiguïté d'une barre qui n'affichait que des pictogrammes. */}
        <Txt numberOfLines={1} style={[styles.tabLabel, { color }]}>
          {options.title}
        </Txt>
      </Pressable>
    );
  };

  // Répartit les onglets de part et d'autre du FAB (surplus impair -> gauche).
  const mid = Math.ceil(nav.tabs.length / 2);
  const left = nav.tabs.slice(0, mid);
  const right = nav.tabs.slice(mid);

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom || spacing.md }]}>
      <View style={styles.bar}>
        <View style={styles.group}>{left.map(renderTab)}</View>
        <Pressable
          testID={`tab-${nav.fab}`}
          style={styles.fab}
          onPress={() => go(nav.fab)}
          accessibilityRole="button"
          accessibilityLabel={descriptors[state.routes.find((r) => r.name === nav.fab)?.key ?? '']?.options.title}
        >
          <Icon name={nav.fabIcon} size={24} color={colors.neutral[0]} strokeWidth={2.5} />
        </Pressable>
        <View style={styles.group}>{right.map(renderTab)}</View>
      </View>
    </View>
  );
}

// La barre doit loger une icône de 20 + un libellé de 10 sans tasser : 66 px.
const BAR_HEIGHT = 66;
// Charte : 48×48, rayon 16 — un carré arrondi, pas un cercle.
const FAB = 48;
const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
  },
  // Charte (.tabbar) : rayon 20, bordure 1 px #e5e7eb, padding 10/8.
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
    backgroundColor: colors.neutral[0],
    borderRadius: radii.tabbar,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    paddingHorizontal: spacing.sm,
    ...shadows.card,
  },
  group: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  // .tab font-size:10px — l'onglet actif prend la couleur de marque via `color`.
  tabLabel: { fontSize: fontSize.xs, fontWeight: '600' },
  // Pastille non-lus, ancrée en haut-droite de l'icône.
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    // `height` FIXE ecrasait la pastille des que l'utilisateur grossissait la
    // police : mesuree en recette a 30x12 dp a 150 % et 36x12 a 200 %, le
    // « 9+ » y devenait illisible. Or c'est le seul signal qui dit qu'une
    // decision attend — le pilier d'IA-4 — et il se degradait precisement chez
    // ceux qui ont grossi la police.
    minWidth: 18,
    minHeight: 18,
    borderRadius: 9,
    backgroundColor: colors.cta[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: colors.neutral[0],
  },
  badgeText: { color: colors.neutral[0], fontSize: fontSize.sm - 2, fontWeight: '800' },
  // FAB orange (CTA unique) surélevé au centre. Carré arrondi de rayon 16 :
  // c'est ce qui le distingue d'un bouton flottant générique.
  fab: {
    width: FAB,
    height: FAB,
    borderRadius: radii.fab,
    backgroundColor: colors.cta[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
    // -14 faisait dépasser le FAB de 5 dp au-dessus de la barre : (66−48)/2−14
    // = −5. Android rogne alors la partie qui sort, ET la zone tactile avec —
    // d'où les 43 dp mesurés en recette sur l'action primaire de chaque rôle.
    // `minHeight` n'y pouvait rien : `height: 48` le neutralise, le défaut
    // n'était pas dans la mise en page mais dans le débordement.
    //
    // -9 est le décalage maximal qui garde le FAB entièrement dans la barre.
    // Le relief reste lisible, et les 48 dp deviennent tous cliquables.
    transform: [{ translateY: -9 }],
    ...shadows.fab,
  },
});

/**
 * Hauteur totale occupee par la barre flottante, insets compris.
 *
 * `useBottomTabBarHeight` de react-navigation mesure la barre rendue et
 * sous-estime celle-ci : son enveloppe porte ses propres paddings et le FAB
 * deborde. Un ecran a liste defilante qui s'y fiait laissait encore son
 * dernier element rogne (mesure : 53 dp manquants sur l'inventaire des
 * retours, recette du 03/09).
 *
 * Cette fonction est la SOURCE UNIQUE : la barre et les écrans lisent les
 * mêmes constantes, donc ils ne peuvent plus diverger après un changement de
 * gabarit.
 */
export function useFloatingTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return spacing.sm + BAR_HEIGHT + (insets.bottom || spacing.md);
}

/**
 * Marge basse à réserver sous une liste défilante pour que son DERNIER élément
 * reste entièrement atteignable.
 *
 * C'est cette valeur, et non `useFloatingTabBarHeight`, que doivent utiliser
 * les écrans : la hauteur seule ne suffit pas.
 *
 * Mesuré sur Pixel 7 API 35 le 03/09 : avec la hauteur théorique (98 dp) plus
 * un intervalle de 24 dp, la dernière action de l'inventaire des retours
 * restait rognée d'environ 17 dp au défilement maximal — « Dépublier »
 * n'affichait que 11 dp de haut sur 44. L'origine de l'écart n'est pas
 * établie (ombre portée de la barre, arrondi de l'inset système, hauteur de
 * fenêtre de défilement) : on le COUVRE au lieu de le deviner, et on le dit.
 *
 * Vérifié à cette valeur : la dernière ligne mesure ses 230 dp et son action
 * destructive ses 44 dp.
 */
export function useFloatingTabBarClearance(): number {
  return useFloatingTabBarHeight() + spacing['2xl'] + spacing.lg;
}
