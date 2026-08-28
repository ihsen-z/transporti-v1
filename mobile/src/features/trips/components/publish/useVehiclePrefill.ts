import { useMemo } from 'react';
import { useTrustStatus } from '@/features/trust/api/useTrustStatus';

// T1.2 (lot 1) — pré-remplissage du véhicule depuis le profil de confiance.
//
// Pendant mobile du hook web `frontend/hooks/useVehiclePrefill.ts`. La
// sémantique est volontairement identique sur les deux plateformes : la
// décision 6 du plan impose de livrer chaque écran des deux côtés, et deux
// règles divergentes sur la capacité produiraient deux chiffres différents pour
// le même trajet.
//
// Le pré-remplissage n'est pas un confort : c'est la condition de la promesse
// des 30 secondes. Le véhicule et sa capacité viennent du profil et ne sont
// jamais ressaisis.
//
// Règle d'unités (décision produit du 26/08) : le poids fait foi, le volume est
// optionnel, et l'un n'est JAMAIS déduit de l'autre — la densité d'un
// chargement n'est pas connue de la plateforme.

export interface VehiculeProfil {
  libelle: string;
  capaciteKg: number | null;
  /** Optionnel : reste null tant que le transporteur ne l'a pas renseigné. */
  capaciteM3: number | null;
  /** Vrai dès qu'au moins un champ exploitable existe. */
  disponible: boolean;
}

const VIDE: VehiculeProfil = {
  libelle: '',
  capaciteKg: null,
  capaciteM3: null,
  disponible: false,
};

/** Convertit une valeur d'API (Decimal DRF sérialisé en chaîne) en nombre. */
function versNombre(valeur: string | null | undefined): number | null {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  const nombre = Number(valeur);
  return Number.isFinite(nombre) && nombre > 0 ? nombre : null;
}

/** Part de la capacité choisie de façon tactile, plutôt que saisie. */
export type PartCapacite = 'tout' | 'moitie' | null;

export function useVehiclePrefill(): {
  vehicule: VehiculeProfil;
  chargement: boolean;
} {
  // `enabled` est requis par le hook : la requête est toujours pertinente ici,
  // puisque l'écran de publication est réservé aux transporteurs.
  const status = useTrustStatus(true);

  const vehicule = useMemo<VehiculeProfil>(() => {
    const d = status.data;
    if (!d) return VIDE;

    const capaciteKg = versNombre(d.vehicle_capacity_kg);
    const capaciteM3 = versNombre(d.vehicle_capacity_m3);
    const libelle = d.vehicle_type ?? '';

    return {
      libelle,
      capaciteKg,
      capaciteM3,
      disponible: Boolean(libelle || capaciteKg || capaciteM3),
    };
  }, [status.data]);

  return { vehicule, chargement: status.isPending };
}

/**
 * Libellé lisible de la capacité pour une part donnée.
 * Le volume n'apparaît que s'il existe réellement — jamais de conversion.
 */
export function libelleCapacite(
  vehicule: VehiculeProfil,
  part: PartCapacite = null,
): string {
  const facteur = part === 'moitie' ? 0.5 : 1;
  const morceaux: string[] = [];

  if (part === null && vehicule.libelle) morceaux.push(vehicule.libelle);
  if (vehicule.capaciteKg !== null) {
    morceaux.push(`${Math.round(vehicule.capaciteKg * facteur * 10) / 10} kg`);
  }
  if (vehicule.capaciteM3 !== null) {
    morceaux.push(`${Math.round(vehicule.capaciteM3 * facteur * 100) / 100} m³`);
  }
  return morceaux.join(' · ');
}

/**
 * Capacité structurée envoyée au backend, dérivée de la part choisie.
 * Reste indéfinie quand le profil ne porte pas la donnée : on n'invente jamais
 * un chiffre.
 */
export function capaciteStructuree(
  vehicule: VehiculeProfil,
  part: PartCapacite,
): { kg?: number; m3?: number } {
  if (part === null) return {};
  const facteur = part === 'tout' ? 1 : 0.5;
  const resultat: { kg?: number; m3?: number } = {};

  if (vehicule.capaciteKg !== null) {
    resultat.kg = Math.round(vehicule.capaciteKg * facteur * 10) / 10;
  }
  if (vehicule.capaciteM3 !== null) {
    resultat.m3 = Math.round(vehicule.capaciteM3 * facteur * 100) / 100;
  }
  return resultat;
}
