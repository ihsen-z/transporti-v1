import fr from './locales/fr.json';
import ar from './locales/ar.json';

/**
 * Les clés de pluriel suivent bien la convention configurée.
 *
 * Pourquoi ce test existe. `src/core/i18n/index.ts` pose
 * `compatibilityJSON: 'v3'`. En v3, i18next cherche la clé de BASE, puis ses
 * suffixes `_plural` (langues simples) ou `_0`..`_5` (arabe). Une clé écrite au
 * format **v4** — `<base>_one` / `<base>_other` — n'a donc aucune clé de base :
 * i18next ne trouve rien et **rend le nom de la clé à l'écran**.
 *
 * Ce n'est pas théorique. Constaté en direct sur l'émulateur : l'Accueil du
 * transporteur affichait `trips.hub.expires_in_days` au lieu de « expire dans
 * 5 j ». Une seconde clé, `trips.inventory.expires_in`, était cassée de la même
 * façon sur l'écran d'inventaire — celle-là, personne ne l'avait vue.
 *
 * Rien ne pouvait l'attraper avant : `tsc` ne lit pas les fichiers de
 * traduction comme des clés, et les tests d'écran visent des `testID`, pas le
 * texte. Ce test comble exactement ce trou.
 */

const SUFFIXES_V4 = ['_one', '_other', '_two', '_few', '_many', '_zero'] as const;

type Dictionnaire = Record<string, unknown>;

/** Aplatit un dictionnaire imbriqué en chemins pointés. */
function aplatir(noeud: unknown, prefixe = ''): Record<string, string> {
  if (noeud !== null && typeof noeud === 'object' && !Array.isArray(noeud)) {
    return Object.entries(noeud as Dictionnaire).reduce<Record<string, string>>(
      (acc, [cle, valeur]) => ({
        ...acc,
        ...aplatir(valeur, prefixe ? `${prefixe}.${cle}` : cle),
      }),
      {},
    );
  }
  return { [prefixe]: String(noeud) };
}

describe.each([
  ['fr', fr],
  ['ar', ar],
])('pluriels i18n (%s)', (langue, dictionnaire) => {
  const plat = aplatir(dictionnaire);

  it('aucune cle de pluriel v4 ne reste sans cle de base v3', () => {
    const orphelines = Object.keys(plat).filter((cle) => {
      const suffixe = SUFFIXES_V4.find((s) => cle.endsWith(s));
      if (!suffixe) return false;
      return !(cle.slice(0, -suffixe.length) in plat);
    });

    expect(orphelines).toEqual([]);
  });

  it('chaque clé de base pluralisée a bien sa forme plurielle', () => {
    // L'inverse du test précédent : une base sans forme plurielle rendrait le
    // singulier pour toutes les quantités — faux, mais silencieux.
    const bases = Object.keys(plat).filter((cle) => `${cle}_plural` in plat || `${cle}_1` in plat);

    for (const base of bases) {
      const aLaFormeSimple = `${base}_plural` in plat;
      const aLesFormesArabes = [0, 1, 2, 3, 4, 5].every((i) => `${base}_${i}` in plat);
      expect(aLaFormeSimple || aLesFormesArabes).toBe(true);
    }

    // Garde-fou du garde-fou : si l'extraction ne trouvait aucune base, la
    // boucle ci-dessus passerait à vide et ce test ne mesurerait rien.
    expect(bases.length).toBeGreaterThan(0);
  });

  it(`interpole {{count}} dans les formes qui doivent porter un nombre (${langue})`, () => {
    // Une forme plurielle sans `{{count}}` affiche « Expire dans  jours » — la
    // quantité disparaît sans que rien n'échoue.
    //
    // Les formes `_0`, `_1` et `_2` sont EXCLUES, et ce n'est pas un
    // relâchement : en v3 arabe elles couvrent zéro, le singulier et le DUEL,
    // que l'arabe écrit en mots (« زوز رحلات » = « deux trajets »), sans
    // chiffre. Exiger `{{count}}` là accuserait de l'arabe correct. Restent
    // `_3` à `_5` et `_plural`, qui désignent des quantités quelconques.
    const formesPlurielles = Object.entries(plat).filter(
      ([cle]) => cle.endsWith('_plural') || /_[3-5]$/.test(cle),
    );

    const sansCompte = formesPlurielles
      .filter(([, valeur]) => !valeur.includes('{{count}}'))
      .map(([cle]) => cle);

    expect(sansCompte).toEqual([]);
    // Sans cette borne, un filtre trop restrictif ferait passer le test à vide.
    expect(formesPlurielles.length).toBeGreaterThan(0);
  });
});
