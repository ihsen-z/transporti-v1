/*
 * Vérification de parité fr/ar au COMPILE-TIME (via `tsc --noEmit`, déjà en CI).
 *
 * ⚠️ Ce fichier NE DOIT JAMAIS être importé par du code applicatif : il importe
 * `ar` statiquement, ce qui, s'il était atteint par le bundle, casserait le
 * code-splitting du dictionnaire arabe. tsc le type-check sans que webpack ne
 * l'inclue (aucun import runtime → tree-shaké / jamais référencé).
 *
 * Si l'on ajoute une clé dans fr.ts sans son équivalent dans ar.ts (ou
 * l'inverse), l'une des deux affectations ci-dessous échoue à la compilation.
 */
import { fr } from "./locales/fr";
import { ar } from "./locales/ar";

// Même forme récursive, valeurs string interchangeables.
type Shape<T> = {
  [K in keyof T]: T[K] extends string ? string : Shape<T[K]>;
};

// ar doit couvrir toutes les clés de fr.
const _arCoversFr: Shape<typeof fr> = ar;
// fr doit couvrir toutes les clés de ar (pas de clé morte côté ar).
const _frCoversAr: Shape<typeof ar> = fr;

void _arCoversFr;
void _frCoversAr;
