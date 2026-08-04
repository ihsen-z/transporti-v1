import { Pressable, StyleSheet, View } from 'react-native';
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
  // Client : chercher un retour = l'action première du parcours.
  CLIENT: { tabs: ['home', 'messages', 'profile'], fab: 'search', fabIcon: 'search' },
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
  const insets = useSafeAreaInsets();
  // ADMIN/MODERATOR ne sont pas des rôles de l'app mobile -> repli client.
  const nav = role === 'TRANSPORTER' ? ROLE_NAV.TRANSPORTER : ROLE_NAV.CLIENT;

  // Nombre de conversations non lues -> pastille sur l'onglet Messages.
  const conversations = useConversations();
  const unreadMessages = (conversations.data ?? []).filter(
    (c: ConversationListDto) => c.unread_count > 0,
  ).length;

  const currentName = state.routes[state.index]?.name;

  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const isFocused = currentName === name;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
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
    const color = isFocused ? colors.brand[600] : colors.neutral[400];
    const badge = name === 'messages' && unreadMessages > 0 ? unreadMessages : 0;
    return (
      <Pressable
        key={name}
        style={styles.tab}
        onPress={() => go(name)}
        accessibilityRole="button"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={options.title}
      >
        <View>
          {/* 20 px : taille d'icône d'onglet de la charte (.tab .ic). */}
          {options.tabBarIcon?.({ focused: isFocused, color, size: 20 })}
          {badge > 0 ? (
            <View style={styles.badge}>
              <Txt style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Txt>
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
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.cta[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
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
    transform: [{ translateY: -14 }],
    ...shadows.fab,
  },
});
