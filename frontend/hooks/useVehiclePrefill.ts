"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";

/**
 * Pré-remplissage du véhicule depuis le profil transporteur — T1.2, lot 1.
 *
 * Extrait de `app/(app)/retours/nouveau/page.tsx` (562 lignes) pour ne pas
 * l'alourdir davantage, conformément au CLAUDE.md §4.
 *
 * Le pré-remplissage n'est pas un confort : c'est la condition de la promesse
 * des 30 secondes. Le véhicule et la capacité viennent du profil et ne sont
 * jamais ressaisis, ce qui ramène la publication d'un retour à 4 saisies.
 *
 * Décision produit du 26/08 sur les unités : le poids fait foi (contrainte
 * réglementaire), le volume est optionnel, et **l'un n'est jamais déduit de
 * l'autre** — la densité d'un chargement n'est pas connue de la plateforme. Le
 * volume reste donc `null` tant que le transporteur ne l'a pas renseigné, et
 * l'interface n'affiche alors que le poids.
 */

/** Les types de véhicule proposés par le formulaire de publication. */
const TYPES_VEHICULE = [
  "camion",
  "camionnette",
  "fourgon",
  "pickup",
  "remorque",
] as const;

export interface VehiculeProfil {
  /** Type normalisé sur les valeurs du formulaire, ou "" si non reconnu. */
  type: string;
  /** Libellé brut du profil, pour l'afficher tel que le transporteur l'a saisi. */
  libelle: string;
  capaciteKg: number | null;
  /** Optionnel : reste null quand le transporteur ne l'a pas renseigné. */
  capaciteM3: number | null;
  /** Vrai dès qu'au moins un champ exploitable a été trouvé. */
  disponible: boolean;
}

const VIDE: VehiculeProfil = {
  type: "",
  libelle: "",
  capaciteKg: null,
  capaciteM3: null,
  disponible: false,
};

interface ReponseProfil {
  vehicle_type?: string;
  vehicle_capacity_kg?: string | number | null;
  vehicle_capacity_m3?: string | number | null;
}

/** Convertit une valeur d'API en nombre, en rejetant les valeurs non positives. */
function versNombre(valeur: string | number | null | undefined): number | null {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const nombre = typeof valeur === "number" ? valeur : parseFloat(valeur);
  return Number.isFinite(nombre) && nombre > 0 ? nombre : null;
}

export function useVehiclePrefill(): {
  vehicule: VehiculeProfil;
  chargement: boolean;
} {
  const [vehicule, setVehicule] = useState<VehiculeProfil>(VIDE);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let annule = false;

    apiClient
      .get<ReponseProfil>("/api/transporter/profile/me/")
      .then((profil) => {
        if (annule || !profil) return;

        const libelle = profil.vehicle_type ?? "";
        const type =
          TYPES_VEHICULE.find((v) => libelle.toLowerCase().includes(v)) ?? "";
        const capaciteKg = versNombre(profil.vehicle_capacity_kg);
        const capaciteM3 = versNombre(profil.vehicle_capacity_m3);

        setVehicule({
          type,
          libelle,
          capaciteKg,
          capaciteM3,
          disponible: Boolean(type || capaciteKg || capaciteM3),
        });
      })
      // Un profil incomplet ou une erreur réseau ne doit jamais bloquer la
      // publication : on retombe simplement sur une saisie manuelle.
      .catch(() => {})
      .finally(() => {
        if (!annule) setChargement(false);
      });

    return () => {
      annule = true;
    };
  }, []);

  return { vehicule, chargement };
}

/**
 * Libellé lisible de la capacité, pour le bandeau de pré-remplissage.
 * Le volume n'apparaît que s'il existe réellement — jamais de conversion.
 */
export function libelleCapacite(vehicule: VehiculeProfil): string {
  const morceaux: string[] = [];
  if (vehicule.libelle) morceaux.push(vehicule.libelle);
  if (vehicule.capaciteKg !== null) morceaux.push(`${vehicule.capaciteKg} kg`);
  if (vehicule.capaciteM3 !== null) morceaux.push(`${vehicule.capaciteM3} m³`);
  return morceaux.join(" · ");
}
