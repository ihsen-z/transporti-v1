import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import i18n from '@/core/i18n'; // init i18n (effet de bord) — Txt() en a besoin (i18n.language).
import { LoginForm } from './LoginForm';

// 6.5 : premier test qui pilote un ecran REEL par ses testID, et pas par le
// texte affiche. Le texte est traduit (FR/AR) et change avec la charte ; le
// testID est un contrat stable. Ce test verrouille donc les deux : le
// comportement du formulaire ET les identifiants sur lesquels le futur E2E
// (Maestro/Detox) va s'appuyer.

const mockMutate = jest.fn();
let mockError: { kind: string } | null = null;

jest.mock('../api/useLogin', () => ({
  useLogin: () => ({ mutate: mockMutate, isPending: false, error: mockError }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockError = null;
});

describe('rendu', () => {
  it('expose email, mot de passe et soumission par testID', () => {
    render(<LoginForm />);

    expect(screen.getByTestId('login-email')).toBeTruthy();
    expect(screen.getByTestId('login-password')).toBeTruthy();
    expect(screen.getByTestId('login-submit')).toBeTruthy();
  });

  it("n'affiche pas d'erreur serveur tant que la mutation n'a pas echoue", () => {
    render(<LoginForm />);

    expect(screen.queryByTestId('login-server-error')).toBeNull();
  });
});

describe('validation', () => {
  it('un envoi a vide bloque la mutation et affiche les deux erreurs de champ', async () => {
    render(<LoginForm />);

    fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('login-email-error')).toBeTruthy();
    });
    expect(screen.getByTestId('login-password-error')).toBeTruthy();
    // Le point qui compte : rien ne part au reseau tant que zod n'a pas valide.
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('un email malforme est refuse avant tout appel reseau', async () => {
    render(<LoginForm />);

    fireEvent.changeText(screen.getByTestId('login-email'), 'pas-un-email');
    fireEvent.changeText(screen.getByTestId('login-password'), 'motdepasse');
    fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('login-email-error')).toBeTruthy();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });
});

describe('soumission', () => {
  it('des identifiants valides sont transmis tels quels a la mutation', async () => {
    render(<LoginForm />);

    fireEvent.changeText(screen.getByTestId('login-email'), 'client@transporti.tn');
    fireEvent.changeText(screen.getByTestId('login-password'), 'motdepasse');
    fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        email: 'client@transporti.tn',
        password: 'motdepasse',
      });
    });
  });
});

describe('erreur serveur', () => {
  it('des identifiants refuses affichent le message dedie', () => {
    mockError = { kind: 'invalid_credentials' };
    render(<LoginForm />);

    expect(screen.getByTestId('login-server-error')).toBeTruthy();
    expect(screen.getByText(i18n.t('auth.errors.invalid_credentials'))).toBeTruthy();
  });

  it("une panne d'infrastructure n'accuse PAS les identifiants (regression 746635d)", () => {
    // Un 400 d'infrastructure doit donner le message reseau, jamais
    // « identifiants invalides » : accuser l'utilisateur d'une faute qu'il n'a
    // pas commise l'envoie reinitialiser un mot de passe pourtant correct.
    // On compare aux chaines resolues par i18n plutot qu'a du texte en dur :
    // une retouche de copy ne doit pas casser ce test, seule l'INVERSION des
    // deux messages doit le casser.
    mockError = { kind: 'network' };
    render(<LoginForm />);

    expect(screen.getByTestId('login-server-error')).toBeTruthy();
    expect(screen.getByText(i18n.t('auth.errors.network'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('auth.errors.invalid_credentials'))).toBeNull();
  });
});
