import { render, screen } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) — Txt() en a besoin.
import { PasswordStrength, passwordScore } from './PasswordStrength';

/**
 * La jauge est le seul endroit de l'application qui parle de la force d'un mot
 * de passe AVANT l'envoi. Elle n'a pas le droit de mentir dans un sens ni dans
 * l'autre : afficher « Solide » sur un mot de passe que le serveur refusera
 * fait perdre la saisie, afficher « Faible » sur un mot de passe conforme fait
 * changer un mot de passe qui n'avait rien.
 */
describe('passwordScore', () => {
  it('ne compte rien sur une saisie vide', () => {
    expect(passwordScore('')).toBe(0);
  });

  it('reste à zéro tant qu aucun critère n est tenu', () => {
    // Trop court, une seule casse, ni chiffre ni symbole.
    expect(passwordScore('abc')).toBe(0);
  });

  it('monte avec chaque critère tenu', () => {
    // 8 caractères : le minimum du schéma zod, et rien de plus.
    expect(passwordScore('abcdefgh')).toBe(1);
    // + un chiffre
    expect(passwordScore('abcdefg1')).toBe(2);
    // + une majuscule
    expect(passwordScore('Abcdefg1')).toBe(3);
  });

  it('plafonne à 4 même quand les cinq critères sont tenus', () => {
    // 12 caractères, deux casses, un chiffre, un symbole : cinq critères pour
    // quatre segments. Le plafond évite un cinquième segment fantôme.
    expect(passwordScore('Abcdefgh1234!')).toBe(4);
  });
});

describe('rendu', () => {
  it('n affiche rien tant que le champ est vide', () => {
    render(<PasswordStrength value="" testID="jauge" />);
    expect(screen.queryByTestId('jauge')).toBeNull();
  });

  it('expose la progression aux lecteurs d écran, pas seulement la couleur', () => {
    // Quatre segments verts ne disent rien à qui ne voit pas la couleur : le
    // rôle et la valeur portent la même information que le remplissage.
    render(<PasswordStrength value="Abcdefgh1234!" testID="jauge" />);

    const jauge = screen.getByTestId('jauge');
    expect(jauge.props.accessibilityValue).toEqual({ min: 0, max: 4, now: 4 });
  });
});
