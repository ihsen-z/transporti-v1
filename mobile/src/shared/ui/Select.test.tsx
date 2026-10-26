import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '@/core/i18n'; // init i18n (effet de bord) — Txt() en a besoin.
import { Select } from './Select';

/**
 * La recherche dans la liste des gouvernorats (défaut m-03 de l'audit du
 * 06/09) : la cliente tape trois lettres au lieu de faire défiler vingt lignes.
 * Elle ne doit ni rater une ville à cause d'un accent, ni garder un filtre
 * d'une ouverture à l'autre.
 */
const OPTIONS = [
  { value: 'TUN', label: 'Tunis' },
  { value: 'BEJ', label: 'Béja' },
  { value: 'GAB', label: 'Gabès' },
  { value: 'MED', label: 'Médenine' },
];

function rendre(onChange = jest.fn(), searchable = true) {
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <Select
        testID="gov"
        label="Départ"
        placeholder="Choisir"
        value={null}
        options={OPTIONS}
        onChange={onChange}
        searchable={searchable}
      />
    </SafeAreaProvider>,
  );
  fireEvent.press(screen.getByTestId('gov'));
}

describe('Select avec recherche', () => {
  it('filtre sans tenir compte des accents ni des majuscules', () => {
    rendre();
    fireEvent.changeText(screen.getByTestId('gov-search'), 'BEJA');

    expect(screen.getByTestId('gov-option-BEJ')).toBeTruthy();
    expect(screen.queryByTestId('gov-option-TUN')).toBeNull();
  });

  it('trouve une ville par le début de son nom', () => {
    rendre();
    fireEvent.changeText(screen.getByTestId('gov-search'), 'gab');

    expect(screen.getByTestId('gov-option-GAB')).toBeTruthy();
    expect(screen.queryByTestId('gov-option-MED')).toBeNull();
  });

  it("dit qu'il n'y a rien plutôt que d'afficher une liste vide", () => {
    rendre();
    fireEvent.changeText(screen.getByTestId('gov-search'), 'zzz');

    expect(screen.queryByTestId('gov-option-TUN')).toBeNull();
    expect(screen.getByText('Aucun résultat')).toBeTruthy();
  });

  it('choisit une ville filtrée et oublie la recherche à la fermeture', () => {
    const onChange = jest.fn();
    rendre(onChange);
    fireEvent.changeText(screen.getByTestId('gov-search'), 'tun');
    fireEvent.press(screen.getByTestId('gov-option-TUN'));

    expect(onChange).toHaveBeenCalledWith('TUN');
    fireEvent.press(screen.getByTestId('gov'));
    expect(screen.getByTestId('gov-option-MED')).toBeTruthy();
  });

  it("n'affiche pas de champ de recherche quand l'option est absente", () => {
    rendre(jest.fn(), false);
    expect(screen.queryByTestId('gov-search')).toBeNull();
  });
});
