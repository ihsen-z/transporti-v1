import { fireEvent, render, screen } from '@testing-library/react-native';
import { StarRating } from './StarRating';

// 6.5 : StarRating a DEUX rendus differents selon `onChange`. La saisie rend 5
// Pressable ; la lecture seule ne rend que des icones, sans aucun Pressable.
// Le testID etait pose uniquement sur les Pressable, donc en lecture seule il
// etait accepte par l'appelant puis perdu en silence — un testID absent ne
// leve rien, il fait juste echouer le futur E2E sans expliquer pourquoi.

describe('lecture seule', () => {
  it('expose son testID meme sans Pressable (regression 6.5)', () => {
    render(<StarRating testID="review-42-rating" value={4} />);

    expect(screen.getByTestId('review-42-rating')).toBeTruthy();
  });

  it('ne rend aucune etoile cliquable', () => {
    render(<StarRating testID="review-42-rating" value={4} />);

    expect(screen.queryByTestId('review-42-rating-star-1')).toBeNull();
  });

  it('une note masquee (double-aveugle) reste trouvable', () => {
    // value=null = note masquee tant que les deux parties n'ont pas note.
    // L'element doit exister pour qu'un test puisse affirmer qu'il est masque.
    render(<StarRating testID="review-42-rating" value={null} />);

    expect(screen.getByTestId('review-42-rating')).toBeTruthy();
  });
});

describe('saisie', () => {
  it('expose une etoile adressable par rang', () => {
    render(<StarRating testID="open-review-rating" value={0} onChange={jest.fn()} />);

    for (const rang of [1, 2, 3, 4, 5]) {
      expect(screen.getByTestId(`open-review-rating-star-${rang}`)).toBeTruthy();
    }
  });

  it('taper la 4e etoile remonte la note 4', () => {
    const onChange = jest.fn();
    render(<StarRating testID="open-review-rating" value={0} onChange={onChange} />);

    fireEvent.press(screen.getByTestId('open-review-rating-star-4'));

    expect(onChange).toHaveBeenCalledWith(4);
  });
});

describe('sans testID', () => {
  it("n'invente pas d'identifiant quand l'appelant n'en fournit pas", () => {
    // Garde-fou : un testID genere par defaut donnerait des collisions entre
    // les lignes d'une liste de reviews, ce que les tests indexes evitent.
    render(<StarRating value={3} />);

    expect(screen.queryByTestId('undefined')).toBeNull();
    expect(screen.queryByTestId('undefined-star-1')).toBeNull();
  });
});
