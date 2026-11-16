"use client";

import { useEffect, useState } from "react";
import {
  getPlatformConfig,
  PLATFORM_CONFIG_DEFAUT,
  type PlatformConfig,
} from "@/lib/services/platformConfig";

// Une seule requête par chargement de page, partagée par tous les composants :
// un réglage serveur ne change pas pendant qu'on regarde une offre.
let enCours: Promise<PlatformConfig> | null = null;
// Dernière valeur reçue : un composant monté APRÈS la réponse (navigation
// côté client) part directement de la bonne valeur, sans repasser par le
// défaut fermé — donc sans qu'une entrée disparaisse puis réapparaisse.
let derniere: PlatformConfig | null = null;

/**
 * Réglages de la plateforme (plafonds, paiement en ligne, canal classique),
 * avec repli sur des valeurs par défaut FERMÉES tant que le serveur n'a pas
 * répondu ou s'il est injoignable.
 */
export function usePlatformConfig(): PlatformConfig {
  const [config, setConfig] = useState<PlatformConfig>(
    derniere ?? PLATFORM_CONFIG_DEFAUT,
  );

  useEffect(() => {
    let actif = true;
    enCours ??= getPlatformConfig()
      .then((valeur) => {
        derniere = valeur;
        return valeur;
      })
      .catch(() => {
        // Échec (hors ligne, API endormie) : on garde le défaut et on
        // autorise un nouvel essai au prochain montage.
        enCours = null;
        return PLATFORM_CONFIG_DEFAUT;
      });
    enCours.then((valeur) => {
      if (actif) setConfig(valeur);
    });
    return () => {
      actif = false;
    };
  }, []);

  return config;
}

/** Raccourci : vrai si le canal classique (publier un besoin / faire une offre) est ouvert. */
export function useCanalClassiqueOuvert(): boolean {
  return usePlatformConfig().classic_channel_enabled;
}
