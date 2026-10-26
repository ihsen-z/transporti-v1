import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '@/shared/ui/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, spacing, radii, shadows } from '@/shared/theme';
import { FloatingTabItem } from '@/shared/ui/FloatingTabItem';
import { useConversations } from '@/features/messaging/api/useConversations';
import type { ConversationListDto } from '@/features/messaging/api/dto';
import { useUnreadCount } from '@/features/notifications/api/useUnreadCount';
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

  // Lot 7.4 — le compteur de notifications sur l'onglet Accueil (E-14).
  // La cloche ne vivait QUE sur l'Accueil : depuis « Mes demandes », une
  // conversation ou le profil, rien ne signalait qu'une decision attendait, et
  // il fallait revenir en arriere pour le decouvrir. IA-4 exige une boite de
  // reception unique ; elle existait, mais elle etait locale a un ecran. Le
  // compteur des messages, lui, etait deja porte par la barre : la solution
  // etait dans le code, appliquee a un seul des deux flux.
  //
  // La pastille se pose sur « home » parce que c'est la que la cloche ouvre la
  // liste. Elle dit « quelque chose t'attend, et voici ou aller ».
  const unreadNotifications = useUnreadCount();

  // Le bouton flottant s'enfonce à l'appui. C'est l'action primaire du rôle :
  // elle doit répondre au doigt, pas seulement changer d'écran.
  const echelleFab = useRef(new Animated.Value(1)).current;
  const presserFab = (vers: number) =>
    Animated.spring(echelleFab, {
      toValue: vers,
      useNativeDriver: true,
      friction: 8,
      tension: 220,
    }).start();

  const routeCourante = state.routes[state.index];
  const currentName = routeCourante?.name;

  // La barre ne se dessine QUE sur une section — pas sur un écran de détail.
  //
  // Les écrans de détail vivent dans le même navigateur à onglets (`href: null`
  // les retire de la barre mais pas du navigateur), et la barre continuait donc
  // de se dessiner par-dessus. Deux conséquences : le dernier élément de leurs
  // listes restait sous la pilule, et depuis que le détail de mission porte sa
  // barre d'action fixe, c'est le bouton de PAIEMENT qui passait dessous.
  //
  // La charte tranche : un écran de détail a une barre d'action, pas la
  // navigation basse. Deux cas à couvrir — une route de premier niveau hors
  // onglets (mission/[id], transporteur/[id], mes-retours, comment-ca-marche,
  // et le profil quand le transporteur l'atteint par son avatar), et une pile
  // imbriquée dépliée au-delà de sa racine (messages/[jobId] est bien DANS
  // l'onglet Messages, mais c'est un fil de conversation, pas la boîte).
  const pileImbriquee = routeCourante?.state;
  const surUnDetailImbrique =
    typeof pileImbriquee?.index === 'number' && pileImbriquee.index > 0;
  const surUneSection =
    currentName !== undefined &&
    (nav.tabs.includes(currentName) || currentName === nav.fab);

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
    // La charte donne #9AA3B2 à l'onglet inactif : c'est `neutral[400]`, mesuré
    // à 2,54:1 sur le blanc de la barre — très en dessous du seuil AA, et sur
    // un libellé de 11 px. `neutral[500]` monte à 4,83:1 sans changer la
    // hiérarchie : l'onglet actif reste le seul en bleu.
    const color = isFocused ? colors.brand[600] : colors.neutral[500];
    const badge =
      name === 'messages'
        ? unreadMessages
        : name === 'home'
          ? (unreadNotifications.data ?? 0)
          : 0;
    return (
      <FloatingTabItem
        key={name}
        testID={`tab-${name}`}
        // 20 px : taille d'icône d'onglet de la charte (.tab .ic). L'icône est
        // fournie par le layout, qui décide de sa graisse selon `focused`.
        icon={options.tabBarIcon?.({ focused: isFocused, color, size: 20 })}
        label={options.title}
        focused={isFocused}
        color={color}
        badge={badge}
        badgeAnnonce={badge > 0 ? t('a11y.unread', { count: badge }) : undefined}
        onPress={() => go(name)}
      />
    );
  };

  // Répartit les onglets de part et d'autre du FAB (surplus impair -> gauche).
  const mid = Math.ceil(nav.tabs.length / 2);
  const left = nav.tabs.slice(0, mid);
  const right = nav.tabs.slice(mid);

  // Décidé APRÈS les hooks : un `return` anticipé au-dessus les rendrait
  // conditionnels, ce que React interdit.
  if (!surUneSection || surUnDetailImbrique) return null;

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <View style={styles.rangee}>
        <View style={styles.group}>{left.map(renderTab)}</View>
        <Animated.View style={{ transform: [{ scale: echelleFab }] }}>
          <Pressable
            testID={`tab-${nav.fab}`}
            style={styles.fab}
            onPress={() => go(nav.fab)}
            onPressIn={() => presserFab(0.92)}
            onPressOut={() => presserFab(1)}
            accessibilityRole="button"
            accessibilityLabel={
              descriptors[state.routes.find((r) => r.name === nav.fab)?.key ?? '']
                ?.options.title
            }
          >
            <Icon name={nav.fabIcon} size={26} color={colors.neutral[0]} weight="bold" />
          </Pressable>
        </Animated.View>
        <View style={styles.group}>{right.map(renderTab)}</View>
      </View>
    </View>
  );
}

// Barre de navigation ANCRÉE, bord à bord, telle que la maquette la dessine
// (écran 2c) : 86 de haut, blanc à 94 %, liseré haut --border, cinq
// emplacements dont le centre vide, et le bouton flottant qui la chevauche de 6.
//
// Elle était une pilule flottante. C'était une lecture de la charte, pas la
// charte : le document décrit une barre ancrée, et la maquette la confirme. La
// pilule avait en plus un coût caché — ses marges latérales et son ombre
// obligeaient chaque écran à réserver une marge basse calculée, d'où les deux
// fonctions de garde ci-dessous et les défauts de recette qui les ont fait
// naître. Une barre ancrée n'a qu'une hauteur, et l'inset système sous elle.
const BAR_HEIGHT = 86;
// Maquette : 58×58, rayon 19, `top: -6` — un carré arrondi, pas un cercle.
const FAB = 58;
const styles = StyleSheet.create({
  bar: {
    // Charte : rgba(255,255,255,0.94) — la barre laisse deviner ce qui passe
    // dessous au défilement, sans le montrer.
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  rangee: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
    paddingHorizontal: spacing.md,
  },
  group: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  // FAB orange (CTA unique) surélevé au centre. Carré arrondi de rayon 19 :
  // c'est ce qui le distingue d'un bouton flottant générique.
  fab: {
    width: FAB,
    height: FAB,
    borderRadius: radii.fab,
    backgroundColor: colors.cta[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
    // La maquette demande `top: -6`. Marge disponible dans une barre de 86
    // pour un bouton de 58 : (86 − 58)/2 = 14. Les 6 tiennent largement.
    //
    // Ce calcul n'est pas décoratif : un bouton qui dépasse de sa barre se fait
    // rogner par Android, ET sa zone tactile avec — c'est ainsi que l'action
    // primaire de chaque rôle s'était retrouvée à 43 dp en recette.
    transform: [{ translateY: -6 }],
    ...shadows.fab,
  },
});

/**
 * Marge basse à réserver sous le contenu d'un écran à onglets, pour que son
 * DERNIER élément reste entièrement atteignable.
 *
 * La barre est ancrée : sa hauteur est fixe et l'inset système passe dessous.
 * Il n'y a donc plus rien à deviner — c'était l'inverse avec la pilule
 * flottante, dont les marges, l'ombre et le débordement du bouton central
 * obligeaient à couvrir un écart mesuré mais inexpliqué (17 dp manquants sur
 * l'inventaire des retours, recette du 03/09).
 *
 * `spacing.lg` en plus de la hauteur : un dernier élément qui affleure la
 * barre se lit comme collé dessous.
 */
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + insets.bottom + spacing.lg;
}
