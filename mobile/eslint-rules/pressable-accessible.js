/**
 * Règle locale : un `Pressable` doit être atteignable et annonçable.
 *
 * Pourquoi elle existe. La charte impose « cibles ≥ 44 px » et le projet
 * exporte déjà la constante `TOUCH_TARGET`. Malgré cela, la recette du 03/09 a
 * mesuré **onze** commandes entre 21 et 43 dp — dont deux actions destructives,
 * l'ouverture d'un litige, l'unique bascule de langue et les deux seuls accès
 * à l'inventaire et aux alertes corridor. Ce n'était pas un défaut de
 * spécification mais une application partielle, et rien ne la signalait.
 *
 * Deux contrôles :
 *
 *   1. **taille** — hauteur tactile effective ≥ 44 dp, ou `hitSlop`.
 *   2. **étiquette** — `accessibilityLabel`, ou du texte dans le sous-arbre
 *      dont Android dérivera l'étiquette.
 *
 * Ce qui la rend utilisable plutôt que bruyante, en deux temps :
 *
 * - elle **résout les références de style** : `style={styles.tab}` est jugé sur
 *   le contenu de la clé `tab` du `StyleSheet.create` du même fichier ;
 * - elle **calcule** la hauteur au lieu d'exiger un minimum écrit en dur, en
 *   résolvant l'échelle d'espacement du projet. Sans ce calcul, la règle
 *   demandait plus que la charte — un `paddingVertical: spacing.md` autour
 *   d'un texte fait déjà 45 dp — et noyait son propre signal sous 83
 *   avertissements dont la plupart visaient des composants conformes.
 *
 * Quand elle ne sait pas conclure (style importé d'un autre module, valeur
 * calculée), elle **se tait**. Une règle qui accuse ce qu'elle ne comprend pas
 * finit désactivée. D'où `warn` plutôt que `error`, et la sortie explicite par
 * `// eslint-disable-next-line`, qui documente alors la raison.
 */

'use strict';

const ATTRS_ETIQUETTE = new Set(['accessibilityLabel', 'aria-label']);
// Composants qui portent déjà leur propre cible tactile et leur étiquette.
const ENFANTS_SURS = new Set(['Button', 'TextField', 'Select', 'ExternalLinkRow']);

/** Cible tactile exigée par la charte, en dp. */
const CIBLE = 44;

/** Hauteur retenue pour une ligne de texte, faute de mesure réelle. */
const HAUTEUR_TEXTE = 18;

/**
 * Échelle d'espacement du projet (`src/shared/theme/index.ts`). La dupliquer
 * ici est un compromis assumé : une règle ESLint ne peut pas importer un
 * module TypeScript du projet. `pressable-accessible.test.js` verrouille la
 * correspondance.
 */
const ESPACEMENT = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 };

/** Résout `spacing.md`, `spacing['2xl']`, `TOUCH_TARGET` ou un nombre. */
function valeurEnDp(texte) {
  const brut = String(texte).trim();
  if (/^[0-9]+(\.[0-9]+)?$/.test(brut)) return Number(brut);
  if (brut === 'TOUCH_TARGET') return CIBLE;
  const point = brut.match(/^spacing\.([A-Za-z0-9_]+)$/);
  if (point && point[1] in ESPACEMENT) return ESPACEMENT[point[1]];
  const crochet = brut.match(/^spacing\[['"]([^'"]+)['"]\]$/);
  if (crochet && crochet[1] in ESPACEMENT) return ESPACEMENT[crochet[1]];
  return null;
}

/** Lit une propriété numérique dans un texte de style. */
function lirePropriete(styleTexte, propriete) {
  const motif = new RegExp(propriete + '\\s*:\\s*([^,}\\n]+)');
  const trouve = styleTexte.match(motif);
  return trouve ? valeurEnDp(trouve[1]) : null;
}

/**
 * Hauteur tactile effective d'un style, en dp, ou `null` si indéterminable.
 */
function hauteurEffective(styleTexte, hauteurContenu) {
  const min = lirePropriete(styleTexte, 'minHeight');
  if (min !== null) return min;
  const fixe = lirePropriete(styleTexte, 'height');
  if (fixe !== null) return fixe;

  const vertical = lirePropriete(styleTexte, 'paddingVertical');
  const uniforme = lirePropriete(styleTexte, 'padding');
  const haut = lirePropriete(styleTexte, 'paddingTop');
  const bas = lirePropriete(styleTexte, 'paddingBottom');

  let marge = null;
  if (vertical !== null) marge = vertical * 2;
  else if (uniforme !== null) marge = uniforme * 2;
  else if (haut !== null || bas !== null) marge = (haut || 0) + (bas || 0);

  return marge === null ? null : marge + hauteurContenu;
}

/**
 * Indexe les `StyleSheet.create({ … })` du fichier, par nom de variable puis
 * par clé, en gardant le texte source de chaque valeur.
 */
function indexerStyles(source, programme) {
  const index = new Map();

  const visiter = (noeud) => {
    if (!noeud || typeof noeud.type !== 'string') return;
    if (
      noeud.type === 'VariableDeclarator' &&
      noeud.id.type === 'Identifier' &&
      noeud.init &&
      noeud.init.type === 'CallExpression' &&
      source.getText(noeud.init.callee) === 'StyleSheet.create' &&
      noeud.init.arguments[0] &&
      noeud.init.arguments[0].type === 'ObjectExpression'
    ) {
      const cles = new Map();
      for (const propriete of noeud.init.arguments[0].properties) {
        if (propriete.type !== 'Property' || !propriete.key) continue;
        const nom =
          propriete.key.type === 'Identifier'
            ? propriete.key.name
            : String(propriete.key.value);
        cles.set(nom, source.getText(propriete.value));
      }
      index.set(noeud.id.name, cles);
    }
    for (const clef of Object.keys(noeud)) {
      if (clef === 'parent') continue;
      const valeur = noeud[clef];
      if (Array.isArray(valeur)) valeur.forEach(visiter);
      else if (valeur && typeof valeur === 'object') visiter(valeur);
    }
  };

  visiter(programme);
  return index;
}

/**
 * Verdict de taille : `true` conforme, `false` trop petit (mesuré), `null`
 * indéterminable.
 */
function verdictTaille(source, attribut, index, hauteurContenu) {
  if (!attribut || !attribut.value) return null;

  const morceaux = [source.getText(attribut.value)];
  const references = morceaux[0].match(/\b[A-Za-z_$][\w$]*\.[\w$]+\b/g) || [];
  for (const reference of references) {
    const separateur = reference.indexOf('.');
    const cles = index.get(reference.slice(0, separateur));
    const valeur = cles && cles.get(reference.slice(separateur + 1));
    if (typeof valeur === 'string') morceaux.push(valeur);
  }
  const complet = morceaux.join('\n');

  // `flex: 1` désigne une surface qui remplit son parent (fond de feuille
  // modale, zone de repli) : la question de la cible ne s'y pose pas.
  if (/flex\s*:\s*1/.test(complet)) return true;

  const hauteur = hauteurEffective(complet, hauteurContenu);
  return hauteur === null ? null : hauteur >= CIBLE;
}

/**
 * Hauteur du contenu, en dp : la taille de l'icône enfant quand il y en a une,
 * sinon une ligne de texte. Approximation suffisante pour distinguer 34 de 44.
 */
function hauteurDuContenu(source, element) {
  if (!element) return HAUTEUR_TEXTE;
  const icone = source.getText(element).match(/<Icon[^>]*size=\{(\d+)\}/);
  return icone ? Number(icone[1]) : HAUTEUR_TEXTE;
}

/**
 * Le sous-arbre porte-t-il du texte dont l'étiquette pourra être dérivée ?
 *
 * React Native construit l'étiquette d'un touchable en concaténant ses nœuds
 * texte descendants (documentation `accessibilityLabel`). Le critère est donc
 * la présence d'un `Text`/`Txt` dans le sous-arbre — et non la présence d'un
 * littéral, comme le testait la première version : elle ratait
 * `<Text>{conv.job_title}</Text>`, où le texte vient d'une variable, et
 * accusait à tort des lignes de liste parfaitement annonçables.
 */
function contientDuTexte(source, element) {
  const texte = source.getText(element);
  return /<(Text|Txt)[\s>]/.test(texte) || /\{\s*t\(/.test(texte);
}

/**
 * `onPress={() => undefined}` : ce n'est pas une commande mais un bloqueur de
 * propagation (corps d'une feuille modale posée sur son fond).
 */
function estBloqueurDePropagation(source, noeud) {
  for (const attribut of noeud.attributes) {
    if (attribut.type !== 'JSXAttribute' || !attribut.name) continue;
    if (attribut.name.name !== 'onPress' || !attribut.value) continue;
    const texte = source.getText(attribut.value).replace(/\s/g, '');
    if (texte === '{()=>undefined}' || texte === '{()=>{}}') return true;
  }
  return false;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Un Pressable doit garantir une cible de 44 dp et pouvoir être annoncé',
    },
    schema: [],
    messages: {
      taille:
        'Cible tactile de {{mesure}} dp : la charte impose {{cible}} dp. ' +
        'Ajoutez minHeight (TOUCH_TARGET), du padding, ou un hitSlop.',
      etiquette:
        'Pressable sans étiquette : ajoutez accessibilityLabel. Une commande ' +
        "purement iconographique n'annonce rien à un lecteur d'écran.",
    },
  },

  create(context) {
    const source = context.getSourceCode();
    let index = new Map();

    return {
      Program(programme) {
        index = indexerStyles(source, programme);
      },

      JSXOpeningElement(noeud) {
        if (noeud.name.type !== 'JSXIdentifier' || noeud.name.name !== 'Pressable') {
          return;
        }
        if (estBloqueurDePropagation(source, noeud)) return;

        const element = noeud.parent;
        let style = null;
        let aTaille = false;
        let aEtiquette = false;

        for (const attribut of noeud.attributes) {
          if (attribut.type !== 'JSXAttribute' || !attribut.name) continue;
          const nom = attribut.name.name;
          if (nom === 'style') style = attribut;
          if (nom === 'hitSlop') aTaille = true;
          if (ATTRS_ETIQUETTE.has(nom)) aEtiquette = true;
        }

        // Un enfant qui porte déjà cible et étiquette dispense le parent.
        const enfants = element && element.children ? element.children : [];
        for (const enfant of enfants) {
          if (
            enfant.type === 'JSXElement' &&
            enfant.openingElement.name.type === 'JSXIdentifier' &&
            ENFANTS_SURS.has(enfant.openingElement.name.name)
          ) {
            aTaille = true;
            aEtiquette = true;
          }
        }

        if (!aEtiquette && element && contientDuTexte(source, element)) {
          aEtiquette = true;
        }

        if (!aTaille) {
          const mesure = verdictTaille(
            source,
            style,
            index,
            hauteurDuContenu(source, element),
          );
          if (mesure === false) {
            const complet = style ? source.getText(style.value) : '';
            const references = complet.match(/\b[A-Za-z_$][\w$]*\.[\w$]+\b/g) || [];
            const textes = [complet];
            for (const reference of references) {
              const separateur = reference.indexOf('.');
              const cles = index.get(reference.slice(0, separateur));
              const valeur = cles && cles.get(reference.slice(separateur + 1));
              if (typeof valeur === 'string') textes.push(valeur);
            }
            context.report({
              node: noeud,
              messageId: 'taille',
              data: {
                mesure: String(
                  hauteurEffective(
                    textes.join('\n'),
                    hauteurDuContenu(source, element),
                  ),
                ),
                cible: String(CIBLE),
              },
            });
          }
        }

        if (!aEtiquette) context.report({ node: noeud, messageId: 'etiquette' });
      },
    };
  },
};
