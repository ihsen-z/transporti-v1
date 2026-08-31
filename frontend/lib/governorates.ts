/**
 * Les 24 gouvernorats de Tunisie, dans l'ordre administratif habituel.
 *
 * Extrait de `components/jobs/LocationPicker.tsx`, où la liste vivait en
 * constante locale non exportée. Le carnet d'adresses (C5.9) en a besoin à son
 * tour : la recopier aurait créé deux listes qui divergent en silence, et un
 * gouvernorat présent d'un côté mais pas de l'autre produirait une adresse
 * enregistrée que le formulaire de publication ne saurait pas resélectionner.
 *
 * ⚠️ Ces valeurs sont envoyées telles quelles au backend, qui les compare en
 * `iexact` sur `pickup_governorate` / `dropoff_governorate`. La casse et
 * l'orthographe doivent donc rester stables : « Kef » et « Le Kef » ne sont pas
 * le même corridor pour la recherche.
 */
export const GOVERNORATES = [
  "Tunis",
  "Ariana",
  "Ben Arous",
  "Manouba",
  "Nabeul",
  "Zaghouan",
  "Bizerte",
  "Béja",
  "Jendouba",
  "Kef",
  "Siliana",
  "Sousse",
  "Monastir",
  "Mahdia",
  "Sfax",
  "Kairouan",
  "Kasserine",
  "Sidi Bouzid",
  "Gabès",
  "Medenine",
  "Tataouine",
  "Gafsa",
  "Tozeur",
  "Kebili",
] as const;
