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
