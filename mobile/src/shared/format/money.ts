// Formatage des montants. La maquette écrit « 1 240 TND » : groupement par
// milliers à la française, virgule décimale, unité posée par l'appelant (elle
// est rendue plus petite que le chiffre dans le hero).
//
// Fait à la main plutôt qu'avec `Intl.NumberFormat` : le support d'Intl dans
// Hermes dépend de la configuration du build, et un montant est la donnée la
// moins négociable de l'écran — on ne la confie pas à une API optionnelle.

const THIN_NBSP = ' '; // espace fine insécable — séparateur de milliers FR

/**
 * Formate un montant en dinars.
 * Les entiers restent sans décimales (« 1 240 »), les montants fractionnaires
 * en portent jusqu'à trois, zéros de queue retirés (« 12,5 »).
 */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '—';

  const sign = value < 0 ? '-' : '';
  // Arrondir AVANT de séparer partie entière et décimales : sinon 12,9999
  // donne 1000 millimes, qui doivent être reportés sur l'entier (13) et non
  // rendus tels quels — le montant affiché serait faux.
  const abs = Math.round(Math.abs(value) * 1000) / 1000;
  const whole = Math.trunc(abs);
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, THIN_NBSP);

  // Le millime est la plus petite unité du dinar : on ne descend pas plus bas.
  const millimes = Math.round((abs - whole) * 1000);
  if (millimes === 0) return `${sign}${grouped}`;

  const frac = String(millimes).padStart(3, '0').replace(/0+$/, '');
  return `${sign}${grouped},${frac}`;
}

/**
 * Formate un montant tel que l'API le renvoie : les champs décimaux de Django
 * arrivent en chaîne (« 90.00 »). Affichée telle quelle, cette chaîne donnait
 * « 90.00 – 120.00 TND » sur la ligne la plus regardée de la carte de
 * résultat (défaut m-05 de l'audit du 06/09). Une valeur illisible rend « — ».
 */
export function formatApiAmount(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined || raw === '') return '—';
  return formatAmount(typeof raw === 'number' ? raw : Number(raw));
}
