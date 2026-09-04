// Gouvernorats de Tunisie avec coordonnées représentatives (chef-lieu).
// Sert à alimenter pickup_governorate/dropoff_governorate ET les coordonnées
// GPS requises par l'estimation de prix serveur — sans dépendre des cartes
// (react-native-maps est différé). `code` = valeur canonique envoyée au backend
// (comparaison iexact côté serveur : garder une casse stable entre transporteurs).
export interface Governorate {
  code: string;
  nameFr: string;
  nameAr: string;
  lat: number;
  lng: number;
}

export const GOVERNORATES: readonly Governorate[] = [
  { code: 'Tunis', nameFr: 'Tunis', nameAr: 'تونس', lat: 36.8065, lng: 10.1815 },
  { code: 'Ariana', nameFr: 'Ariana', nameAr: 'أريانة', lat: 36.8625, lng: 10.1956 },
  { code: 'Ben Arous', nameFr: 'Ben Arous', nameAr: 'بن عروس', lat: 36.7533, lng: 10.2189 },
  { code: 'Manouba', nameFr: 'Manouba', nameAr: 'منوبة', lat: 36.8101, lng: 10.0956 },
  { code: 'Nabeul', nameFr: 'Nabeul', nameAr: 'نابل', lat: 36.4513, lng: 10.7357 },
  { code: 'Zaghouan', nameFr: 'Zaghouan', nameAr: 'زغوان', lat: 36.4029, lng: 10.1429 },
  { code: 'Bizerte', nameFr: 'Bizerte', nameAr: 'بنزرت', lat: 37.2744, lng: 9.8739 },
  { code: 'Béja', nameFr: 'Béja', nameAr: 'باجة', lat: 36.7256, lng: 9.1817 },
  { code: 'Jendouba', nameFr: 'Jendouba', nameAr: 'جندوبة', lat: 36.5011, lng: 8.7803 },
  { code: 'Le Kef', nameFr: 'Le Kef', nameAr: 'الكاف', lat: 36.1742, lng: 8.7049 },
  { code: 'Siliana', nameFr: 'Siliana', nameAr: 'سليانة', lat: 36.0849, lng: 9.3708 },
  { code: 'Sousse', nameFr: 'Sousse', nameAr: 'سوسة', lat: 35.8254, lng: 10.636 },
  { code: 'Monastir', nameFr: 'Monastir', nameAr: 'المنستير', lat: 35.778, lng: 10.8262 },
  { code: 'Mahdia', nameFr: 'Mahdia', nameAr: 'المهدية', lat: 35.5047, lng: 11.0622 },
  { code: 'Sfax', nameFr: 'Sfax', nameAr: 'صفاقس', lat: 34.7406, lng: 10.7603 },
  { code: 'Kairouan', nameFr: 'Kairouan', nameAr: 'القيروان', lat: 35.6781, lng: 10.0963 },
  { code: 'Kasserine', nameFr: 'Kasserine', nameAr: 'القصرين', lat: 35.1676, lng: 8.8365 },
  { code: 'Sidi Bouzid', nameFr: 'Sidi Bouzid', nameAr: 'سيدي بوزيد', lat: 35.0382, lng: 9.4849 },
  { code: 'Gabès', nameFr: 'Gabès', nameAr: 'قابس', lat: 33.8815, lng: 10.0982 },
  { code: 'Médenine', nameFr: 'Médenine', nameAr: 'مدنين', lat: 33.3549, lng: 10.5055 },
  { code: 'Tataouine', nameFr: 'Tataouine', nameAr: 'تطاوين', lat: 32.9297, lng: 10.4518 },
  { code: 'Gafsa', nameFr: 'Gafsa', nameAr: 'قفصة', lat: 34.425, lng: 8.7842 },
  { code: 'Tozeur', nameFr: 'Tozeur', nameAr: 'توزر', lat: 33.9197, lng: 8.1335 },
  { code: 'Kébili', nameFr: 'Kébili', nameAr: 'قبلي', lat: 33.705, lng: 8.969 },
];

// Recherche par code canonique (retourne les coordonnées pour l'estimation).
export function findGovernorate(code: string): Governorate | undefined {
  return GOVERNORATES.find((g) => g.code === code);
}

/**
 * Retrouve un gouvernorat à partir d'une valeur venue du serveur (T4.4).
 *
 * `pickup_governorate` est stocké en texte libre côté backend : rien ne
 * garantit que « Gabès » y soit accentué, ni que la casse corresponde. Une
 * comparaison stricte échouerait **silencieusement** — le formulaire s'ouvrirait
 * vide et l'amorce de fin de mission perdrait tout son intérêt, sans erreur
 * visible pour le diagnostiquer.
 *
 * `sensitivity: 'base'` ignore à la fois la casse et les accents.
 * Retourne le code canonique, ou null si rien ne correspond.
 */
export function resolveGovernorateCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const cible = value.trim();
  if (!cible) return null;
  const trouve = GOVERNORATES.find(
    (g) =>
      g.code.localeCompare(cible, 'fr', { sensitivity: 'base' }) === 0 ||
      g.nameFr.localeCompare(cible, 'fr', { sensitivity: 'base' }) === 0 ||
      g.nameAr === cible,
  );
  return trouve?.code ?? null;
}

/** Rayon terrestre moyen, en km. */
const RAYON_TERRE_KM = 6371;

function radians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distance orthodromique entre deux points, en km (haversine). */
export function distanceKm(a: Governorate, b: Governorate): number {
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Gouvernorats voisins d'un gouvernorat, du plus proche au plus lointain.
 *
 * Sert la seconde sortie de l'état vide de recherche (lot 6.3) : quand un
 * corridor est réellement vide, élargir de quelques dizaines de kilomètres est
 * la seule proposition IMMÉDIATE qu'on puisse faire — l'alerte, elle, ne promet
 * que plus tard.
 *
 * Le rayon est volontairement court. Au-delà, « déplacer son chargement » cesse
 * d'être un service rendu et devient une contrainte déguisée : on proposerait à
 * une cliente de Sousse de porter sa marchandise à Sfax.
 */
export function gouvernoratsVoisins(
  code: string,
  rayonKm = 60,
  maximum = 3,
): Governorate[] {
  const depart = findGovernorate(code);
  if (!depart) return [];
  return GOVERNORATES.filter((g) => g.code !== depart.code)
    .map((g) => ({ g, d: distanceKm(depart, g) }))
    .filter(({ d }) => d <= rayonKm)
    .sort((x, y) => x.d - y.d)
    .slice(0, maximum)
    .map(({ g }) => g);
}
