import { findGovernorate } from '@/features/trips/data/governorates';
import { decodePolyline } from './polyline';
import type { TripResultDto } from '../api/dto';

// Transformation des résultats de recherche en tracés cartographiques.
// Volontairement SANS import natif (ni react-native-maps ni expo-*) : ce module
// reste du calcul pur, donc testable sous Jest.
//
// Le backend ne renvoie pas de géométrie, seulement des noms de gouvernorats :
// les coordonnées viennent des chefs-lieux présents dans GOVERNORATES. Le trait
// est donc une indication de corridor, pas un itinéraire routier — d'où
// l'affichage de la distance réelle calculée par le serveur, qui, elle, ne ment
// pas.

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Cadre de carte. Structurellement compatible avec `Region` de react-native-maps. */
export interface MapRegion extends LatLng {
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface Corridor {
  /** Identifiant stable du couple départ/arrivée, sert aussi de clé de rendu. */
  key: string;
  from: LatLng;
  to: LatLng;
  fromLabel: string;
  toLabel: string;
  /** Distance routière renvoyée par le serveur, `null` si absente. */
  distanceKm: number | null;
  /**
   * Points à tracer. Itinéraire routier décodé quand le serveur l'a fourni,
   * sinon une simple ligne droite entre les deux chefs-lieux.
   */
  path: LatLng[];
  /** `true` quand `path` suit la route, `false` quand c'est le repli droit. */
  isRealRoute: boolean;
}

/** Repli quand aucune coordonnée n'est exploitable : la Tunisie entière. */
export const TUNISIA_REGION: MapRegion = {
  latitude: 34.5,
  longitude: 9.5,
  latitudeDelta: 6,
  longitudeDelta: 6,
};

// Marge autour des points pour que les marqueurs ne collent pas au bord.
const REGION_PADDING = 1.4;
const MIN_DELTA = 0.5;

function parseDistance(raw: string | null): number | null {
  if (raw === null) return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * Regroupe les trajets par corridor. Une recherche filtre sur un seul couple
 * départ/arrivée : sans ce regroupement, dix résultats empileraient dix traits
 * et dix marqueurs identiques au même endroit — bulles d'info superposées et
 * rendu inutilement coûteux.
 */
export function buildCorridors(trips: readonly TripResultDto[], arabic: boolean): Corridor[] {
  const byKey = new Map<string, Corridor>();

  for (const trip of trips) {
    const from = findGovernorate(trip.pickup_governorate);
    const to = findGovernorate(trip.dropoff_governorate);
    // Un gouvernorat inconnu du référentiel est ignoré plutôt que placé au
    // large : mieux vaut un trajet absent de la carte qu'un trait faux.
    if (from === undefined || to === undefined) continue;

    const key = `${from.code}|${to.code}`;
    const existing = byKey.get(key);
    const distanceKm = parseDistance(trip.distance_km);
    const fromPoint = { latitude: from.lat, longitude: from.lng };
    const toPoint = { latitude: to.lat, longitude: to.lng };

    if (existing === undefined) {
      // Une polyligne d'un seul point ne trace rien : on exige au moins deux
      // points avant de préférer l'itinéraire à la ligne droite.
      const route = decodePolyline(trip.route_polyline);
      const isRealRoute = route.length >= 2;
      byKey.set(key, {
        key,
        from: fromPoint,
        to: toPoint,
        fromLabel: arabic ? from.nameAr : from.nameFr,
        toLabel: arabic ? to.nameAr : to.nameFr,
        distanceKm,
        path: isRealRoute ? route : [fromPoint, toPoint],
        isRealRoute,
      });
      continue;
    }

    // Tous les trajets d'un corridor parcourent la même route : on complète ce
    // qui manque au premier vu, sans le remplacer.
    if (existing.distanceKm === null) existing.distanceKm = distanceKm;
    if (!existing.isRealRoute) {
      const route = decodePolyline(trip.route_polyline);
      if (route.length >= 2) {
        existing.path = route;
        existing.isRealRoute = true;
      }
    }
  }

  return [...byKey.values()];
}

/** Cadre englobant tous les points, centré. */
export function regionFor(corridors: readonly Corridor[]): MapRegion {
  // Le tracé ET les marqueurs : un itinéraire routier s'écarte de la ligne
  // droite (contournements, relief), et le routeur accroche ses extrémités à la
  // route la plus proche, pas exactement au chef-lieu.
  const points = corridors.flatMap((corridor) => [
    ...corridor.path,
    corridor.from,
    corridor.to,
  ]);
  const first = points[0];
  if (first === undefined) return TUNISIA_REGION;

  let minLat = first.latitude;
  let maxLat = first.latitude;
  let minLng = first.longitude;
  let maxLng = first.longitude;
  for (const point of points) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * REGION_PADDING, MIN_DELTA),
    longitudeDelta: Math.max((maxLng - minLng) * REGION_PADDING, MIN_DELTA),
  };
}
