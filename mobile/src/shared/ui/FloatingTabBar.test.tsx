import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import '@/core/i18n'; // init i18n (effet de bord) — Txt() en a besoin (i18n.language).
import { FloatingTabBar } from './FloatingTabBar';

// 5.8 : verrouille la logique de rôle (quels onglets, quel FAB) et le
// comportement de tabPress — notamment le reset de pile au retap d'un onglet
// déjà actif (4.6), jamais testé jusqu'ici.

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUseConversations = jest.fn();
jest.mock('@/features/messaging/api/useConversations', () => ({
  useConversations: () => mockUseConversations(),
}));

const mockUseUnreadCount = jest.fn();
jest.mock('@/features/notifications/api/useUnreadCount', () => ({
  useUnreadCount: () => mockUseUnreadCount(),
}));

const TAB_NAMES = ['home', 'search', 'publish', 'requests', 'mes-demandes', 'messages', 'profile', 'gains'];

function makeProps(currentName: string) {
  const navigate = jest.fn();
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  const routes = TAB_NAMES.map((name) => ({ key: `${name}-key`, name }));

  const descriptors = Object.fromEntries(
    routes.map((r) => [
      r.key,
      { options: { title: r.name, tabBarIcon: () => null } },
    ]),
  );

  // Cast ciblé : BottomTabBarProps est un type de react-navigation avec
  // beaucoup de champs sans intérêt pour ce test (options d'écran complètes,
  // etc.) — seuls state/descriptors/navigation comptent ici.
  const props = {
    state: { routes, index: routes.findIndex((r) => r.name === currentName) },
    descriptors,
    navigation: { emit, navigate },
  } as unknown as BottomTabBarProps;

  return { props, navigate, emit };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseConversations.mockReturnValue({ data: { pages: [] } });
  mockUseUnreadCount.mockReturnValue({ data: 0 });
});

describe('navigation par rôle', () => {
  it('CLIENT : home / mes-demandes / messages / profile, FAB = search', () => {
    const { props } = makeProps('home');
    render(<FloatingTabBar {...props} role="CLIENT" />);

    expect(screen.getByLabelText('home')).toBeTruthy();
    expect(screen.getByLabelText('mes-demandes')).toBeTruthy();
    expect(screen.getByLabelText('messages')).toBeTruthy();
    expect(screen.getByLabelText('profile')).toBeTruthy();
    expect(screen.getByLabelText('search')).toBeTruthy(); // le FAB
    expect(screen.queryByLabelText('requests')).toBeNull();
    expect(screen.queryByLabelText('gains')).toBeNull();
  });

  it('TRANSPORTER : home / requests / messages / gains, FAB = publish', () => {
    const { props } = makeProps('home');
    render(<FloatingTabBar {...props} role="TRANSPORTER" />);

    expect(screen.getByLabelText('home')).toBeTruthy();
    expect(screen.getByLabelText('requests')).toBeTruthy();
    expect(screen.getByLabelText('messages')).toBeTruthy();
    expect(screen.getByLabelText('gains')).toBeTruthy();
    expect(screen.getByLabelText('publish')).toBeTruthy(); // le FAB
    expect(screen.queryByLabelText('mes-demandes')).toBeNull();
    expect(screen.queryByLabelText('profile')).toBeNull();
  });

  it('rôle inconnu (ADMIN/MODERATOR, absents du mobile) retombe sur la navigation CLIENT', () => {
    const { props } = makeProps('home');
    // ADMIN/MODERATOR font partie du type UserRole (le backend les connaît),
    // mais aucun des deux n'a de navigation mobile dédiée — repli CLIENT.
    render(<FloatingTabBar {...props} role="ADMIN" />);

    expect(screen.getByLabelText('mes-demandes')).toBeTruthy();
  });
});

describe('tabPress', () => {
  it("change d'onglet : navigue vers l'onglet tapé", () => {
    const { props, navigate } = makeProps('home');
    render(<FloatingTabBar {...props} role="TRANSPORTER" />);

    fireEvent.press(screen.getByLabelText('requests'));

    expect(navigate).toHaveBeenCalledWith('requests');
  });

  it("4.6 — retaper l'onglet DÉJÀ actif navigue quand même (reset de sa pile imbriquée)", () => {
    const { props, navigate } = makeProps('messages');
    render(<FloatingTabBar {...props} role="TRANSPORTER" />);

    fireEvent.press(screen.getByLabelText('messages'));

    expect(navigate).toHaveBeenCalledWith('messages');
  });

  it('emit(tabPress) avec defaultPrevented bloque la navigation', () => {
    const { props, navigate, emit } = makeProps('home');
    emit.mockReturnValue({ defaultPrevented: true });
    render(<FloatingTabBar {...props} role="TRANSPORTER" />);

    fireEvent.press(screen.getByLabelText('requests'));

    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('pastille messages non lus', () => {
  it('compte le nombre de conversations non lues (pas la somme de leurs unread_count)', () => {
    mockUseConversations.mockReturnValue({
      data: {
        pages: [
          { results: [{ id: 1, unread_count: 5 }, { id: 2, unread_count: 3 }, { id: 3, unread_count: 0 }] },
        ],
      },
    });
    const { props } = makeProps('home');
    render(<FloatingTabBar {...props} role="TRANSPORTER" />);

    // 2 conversations non lues (id 1 et 2), pas 8 (5+3) ni 5.
    expect(screen.getByTestId('tab-messages-badge')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('ne s\'affiche pas sans conversation non lue', () => {
    mockUseConversations.mockReturnValue({
      data: { pages: [{ results: [{ id: 1, unread_count: 0 }] }] },
    });
    const { props } = makeProps('home');
    render(<FloatingTabBar {...props} role="TRANSPORTER" />);

    expect(screen.queryByTestId('tab-messages-badge')).toBeNull();
  });
});


// Lot 7.4 (E-14) — la cloche ne vivait QUE sur l'Accueil : depuis « Mes
// demandes », une conversation ou le profil, rien ne signalait qu'une décision
// attendait. IA-4 exige une boîte de réception unique ; le compteur des
// messages était déjà porté par la barre, celui des notifications non.
describe('7.4 — compteur de notifications sur la barre', () => {
  it("pose la pastille sur l'onglet Accueil, ou la cloche ouvre la liste", () => {
    mockUseUnreadCount.mockReturnValue({ data: 3 });
    const { props } = makeProps('messages');
    render(<FloatingTabBar {...props} role="CLIENT" />);
    expect(screen.getByTestId('tab-home-badge')).toBeTruthy();
  });

  it('reste visible depuis un AUTRE onglet — c est tout l interet', () => {
    mockUseUnreadCount.mockReturnValue({ data: 7 });
    const { props } = makeProps('profile');
    render(<FloatingTabBar {...props} role="CLIENT" />);
    expect(screen.getByTestId('tab-home-badge')).toBeTruthy();
  });

  it("n'affiche rien quand il n'y a aucune notification non lue", () => {
    mockUseUnreadCount.mockReturnValue({ data: 0 });
    const { props } = makeProps('home');
    render(<FloatingTabBar {...props} role="CLIENT" />);
    expect(screen.queryByTestId('tab-home-badge')).toBeNull();
  });

  it('survit a une reponse absente sans afficher de pastille vide', () => {
    // Premier rendu, requete en vol : `data` est undefined.
    mockUseUnreadCount.mockReturnValue({ data: undefined });
    const { props } = makeProps('home');
    render(<FloatingTabBar {...props} role="CLIENT" />);
    expect(screen.queryByTestId('tab-home-badge')).toBeNull();
  });

  it('vaut pour le transporteur aussi', () => {
    mockUseUnreadCount.mockReturnValue({ data: 2 });
    const { props } = makeProps('gains');
    render(<FloatingTabBar {...props} role="TRANSPORTER" />);
    expect(screen.getByTestId('tab-home-badge')).toBeTruthy();
  });
});
