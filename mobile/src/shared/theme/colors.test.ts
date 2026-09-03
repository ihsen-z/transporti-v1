import { colors } from './colors';

/**
 * Garde-fou de contraste (lot 4, tâche 4.6).
 *
 * La recette du 03/09 a mesuré cinq combinaisons sous le seuil AA de WCAG 2.1,
 * et c'étaient exactement les blocs qui portent la promesse commerciale :
 * l'amorce de retour à vide, l'économie estimée, les km valorisés, l'alerte
 * d'expiration et l'action destructive de l'inventaire.
 *
 * Le défaut n'était pas une faute de goût mais une régression invisible : rien
 * ne la signalait. Ce test la rend visible en CI, pour que la prochaine
 * couleur ajoutée à la charte se heurte à une suite rouge plutôt qu'à une
 * campagne de recette six semaines plus tard.
 */

// Luminance relative WCAG 2.1, §Relative luminance.
function canal(hex: string, position: number): number {
  const brut = parseInt(hex.slice(position, position + 2), 16) / 255;
  return brut <= 0.03928 ? brut / 12.92 : ((brut + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return (
    0.2126 * canal(hex, 1) + 0.7152 * canal(hex, 3) + 0.0722 * canal(hex, 5)
  );
}

function contraste(avant: string, arriere: string): number {
  const a = luminance(avant);
  const b = luminance(arriere);
  const [haut, bas] = a > b ? [a, b] : [b, a];
  return (haut + 0.05) / (bas + 0.05);
}

/** Seuil AA pour du texte sous 18 px — la taille de tous les cas ci-dessous. */
const AA = 4.5;

describe('contraste des couleurs de texte', () => {
  // Chaque ligne cite l'écran et le ratio mesuré AVANT correction, pour que la
  // raison d'être du token reste lisible dans le test.
  const CAS: readonly [string, string, string][] = [
    ['économie estimée (TripResultCard, 13 px) — était 3,60', colors.text.green, colors.green[50]],
    ['km à vide valorisés (ReturnsHubSection, 13 px) — était 3,60', colors.text.green, colors.green[50]],
    ['message de succès (13-17 px sur blanc)', colors.text.green, colors.neutral[0]],
    ['amorce de retour à vide (ReturnPromptBanner, 13 px) — était 3,35', colors.text.cta, colors.cta[50]],
    ['expiration urgente (ReturnTripRow, 13 px) — était 2,15', colors.text.warning, colors.neutral[0]],
    ['« Expiré », « Dépublier » (13-14 px) — était 3,76', colors.text.error, colors.neutral[0]],
    ['erreur sur fond d écran (13 px)', colors.text.error, colors.neutral[50]],
    ['libellé d onglet inactif (FloatingTabBar, 10 px) — était 2,54', colors.neutral[500], colors.neutral[0]],
    ['texte doux, métadonnées', colors.neutral[500], colors.neutral[0]],
    ['encre principale', colors.neutral[900], colors.neutral[50]],
    ['lien de marque', colors.brand[600], colors.neutral[0]],
  ];

  it.each(CAS)('%s atteint AA', (_nom, avant, arriere) => {
    expect(contraste(avant, arriere)).toBeGreaterThanOrEqual(AA);
  });

  it('le blanc sur le bleu de marque reste lisible', () => {
    // Hero, en-têtes, bouton `primary` : le bleu royal est très au-dessus.
    expect(contraste(colors.neutral[0], colors.brand[600])).toBeGreaterThanOrEqual(AA);
    expect(contraste(colors.neutral[0], colors.brand[900])).toBeGreaterThanOrEqual(AA);
  });

  /**
   * Écart CONNU et NON corrigé, en attente d'un arbitrage produit.
   *
   * Le libellé des boutons `cta` (orange) et `accent` (vert) est blanc sur un
   * fond saturé, en 14 px gras. WCAG ne compte « texte large » qu'à partir de
   * 18,66 px gras : ces libellés relèvent donc du seuil de 4,5:1, et ils en
   * sont loin.
   *
   *   blanc sur cta[500]   #f97316   2,80:1
   *   blanc sur green[600] #10b981   2,54:1
   *
   * Pourquoi ce n'est pas corrigé ici. Le lot 4 tenait à ne pas changer
   * l'identité de la charte : les variantes ci-dessus ne touchent que du
   * texte sur fond clair. Rendre ces deux boutons conformes exige un choix
   * qui, lui, se voit sur tous les écrans :
   *
   *   a) garder l'orange exact et passer le libellé à l'encre
   *      (#111827 sur #f97316 = 6,33:1 — l'orange de marque est préservé) ;
   *   b) foncer le fond jusqu'à text.cta
   *      (blanc sur #c2410c = 5,18:1 — orange plus brique, identité modifiée) ;
   *   c) assumer l'écart pour une cible tactile de 44 dp très détachée de son
   *      environnement, et le documenter dans la déclaration d'accessibilité.
   *
   * Le vert `accent` pose la même question (encre sur #10b981 = 6,99:1).
   *
   * Ce test PIN les valeurs mesurées : il ne valide pas l'écart, il empêche
   * qu'il s'aggrave sans qu'on le voie, et il tombera dès qu'un arbitrage
   * changera l'une des deux couleurs — moment où il faudra le réécrire en
   * assertion AA.
   */
  it('documente l écart de contraste des boutons pleins', () => {
    expect(contraste(colors.neutral[0], colors.cta[500])).toBeCloseTo(2.8, 1);
    expect(contraste(colors.neutral[0], colors.green[600])).toBeCloseTo(2.54, 1);
    // Les deux replis mesurés, pour que l'arbitrage se fasse sur des chiffres.
    expect(contraste(colors.neutral[900], colors.cta[500])).toBeGreaterThanOrEqual(AA);
    expect(contraste(colors.neutral[900], colors.green[600])).toBeGreaterThanOrEqual(AA);
  });

  it("les variantes texte gardent la teinte de leur couleur d'origine", () => {
    // Ce qui autorise à dire que l'identité de la charte ne change pas : même
    // canal dominant, simplement plus foncé. Un token « corrigé » vers une
    // autre teinte serait un changement de charte déguisé en accessibilité.
    const dominant = (hex: string): number => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b].indexOf(Math.max(r, g, b));
    };
    expect(dominant(colors.text.green)).toBe(dominant(colors.green[700]));
    expect(dominant(colors.text.cta)).toBe(dominant(colors.cta[600]));
    expect(dominant(colors.text.warning)).toBe(dominant(colors.warning));
    expect(dominant(colors.text.error)).toBe(dominant(colors.error));

    const plusFonce = (a: string, b: string) => luminance(a) < luminance(b);
    expect(plusFonce(colors.text.green, colors.green[700])).toBe(true);
    expect(plusFonce(colors.text.cta, colors.cta[600])).toBe(true);
    expect(plusFonce(colors.text.warning, colors.warning)).toBe(true);
    expect(plusFonce(colors.text.error, colors.error)).toBe(true);
  });
});
