import { render } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) — useTranslation() en a besoin.
// Import APRÈS les jest.mock plus bas (hissés par Babel de toute façon, mais
// gardé dans cet ordre pour la lisibilité — les layouts en dépendent tous).
import AuthLayout from '../(auth)/_layout';
import AppLayout from '../(app)/_layout';

// 5.8 : verrouille la garde qui a régressé au commit d3bb922 — la connexion
// aboutissait (200 + session ouverte) mais l'app restait sur /login, faute de
// garde symétrique dans (auth)/_layout. Les deux layouts sont testés ici pour
// qu'une régression future sur L'UN OU L'AUTRE fasse échouer la suite.

const mockRedirect = jest.fn((_props: { href: string }) => null);
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => mockRedirect(props),
  Stack: Object.assign((props: { children?: React.ReactNode }) => props.children ?? null, {
    Screen: () => null,
  }),
  Tabs: Object.assign((props: { children?: React.ReactNode }) => props.children ?? null, {
    Screen: () => null,
  }),
}));

interface FakeAuthState {
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  user: { role: 'CLIENT' | 'TRANSPORTER' } | null;
}
let mockAuthState: FakeAuthState;
jest.mock('@/core/auth/authStore', () => ({
  useAuthStore: (selector: (s: FakeAuthState) => unknown) => selector(mockAuthState),
}));

jest.mock('@/features/auth/api/useProfile', () => ({
  useProfile: () => ({ isLoading: false }),
}));

jest.mock('@/core/push/usePushNotifications', () => ({
  usePushNotifications: () => undefined,
}));

jest.mock('@/shared/ui/FloatingTabBar', () => ({
  FloatingTabBar: () => null,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('(auth)/_layout', () => {
  it('laisse la pile auth affichée sans session (pas de redirection)', () => {
    mockAuthState = { status: 'unauthenticated', user: null };
    render(<AuthLayout />);

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('régression d3bb922 — redirige vers /home dès la session ouverte, pour ne pas rester bloqué sur /login', () => {
    mockAuthState = { status: 'authenticated', user: { role: 'CLIENT' } };
    render(<AuthLayout />);

    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/home' }));
  });
});

describe('(app)/_layout', () => {
  it('redirige vers /login sans session (garde symétrique de (auth)/_layout)', () => {
    mockAuthState = { status: 'unauthenticated', user: null };
    render(<AppLayout />);

    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/login' }));
  });

  it('ne redirige nulle part une fois authentifié', () => {
    mockAuthState = { status: 'authenticated', user: { role: 'TRANSPORTER' } };
    render(<AppLayout />);

    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
