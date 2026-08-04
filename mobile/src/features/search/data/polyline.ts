import type { LatLng } from './corridors';

// Décodage du format « encoded polyline » de Google (précision 5), tel que
// renvoyé par le routeur côté serveur dans `route_polyline`.
//
// Écrit à la main plutôt qu'ajouté en dépendance : l'algorithme tient en trente
// lignes, il est figé depuis quinze ans, et une dépendance de plus dans un
// bundle mobile se paie au démarrage.
//
// Principe : chaque coordonnée est stockée en DELTA par rapport à la
// précédente, en base 64 sur des groupes de 5 bits, bit de poids fort à 1 tant
// qu'il reste un groupe. Le signe est porté par le bit 0 (complément à un).

/** Décalage ASCII imposé par le format (les octets restent imprimables). */
const ASCII_OFFSET = 63;
const CONTINUATION_BIT = 0x20;
const FIVE_BIT_MASK = 0x1f;
const PRECISION = 1e5;

/**
 * Décode une polyligne encodée. Retourne un tableau vide sur une entrée vide ou
 * malformée : une carte sans tracé vaut mieux qu'un tracé aberrant.
 */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    // Un groupe par itération, jusqu'au groupe sans bit de continuation.
    do {
      if (index >= encoded.length) {
        // Chaîne tronquée en plein milieu d'une valeur : on rend ce qui est sûr.
        return points;
      }
      byte = encoded.charCodeAt(index) - ASCII_OFFSET;
      index += 1;
      result |= (byte & FIVE_BIT_MASK) << shift;
      shift += 5;
    } while (byte >= CONTINUATION_BIT);
    const deltaLat = (result & 1) === 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      if (index >= encoded.length) return points;
      byte = encoded.charCodeAt(index) - ASCII_OFFSET;
      index += 1;
      result |= (byte & FIVE_BIT_MASK) << shift;
      shift += 5;
    } while (byte >= CONTINUATION_BIT);
    const deltaLng = (result & 1) === 1 ? ~(result >> 1) : result >> 1;

    lat += deltaLat;
    lng += deltaLng;
    points.push({ latitude: lat / PRECISION, longitude: lng / PRECISION });
  }

  return points;
}
