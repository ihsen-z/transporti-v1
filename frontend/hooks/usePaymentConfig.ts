"use client";

import { useEffect, useState } from "react";
import {
  getPaymentConfig,
  PAYMENT_CONFIG_DEFAUT,
  type PaymentConfig,
} from "@/lib/services/paymentConfig";

// Une seule requête par chargement de page, partagée par tous les composants :
// un réglage serveur ne change pas pendant qu'on regarde une offre.
let enCours: Promise<PaymentConfig> | null = null;

/** Plafonds d'argent du serveur, avec repli sur ses valeurs par défaut. */
export function usePaymentConfig(): PaymentConfig {
  const [config, setConfig] = useState<PaymentConfig>(PAYMENT_CONFIG_DEFAUT);

  useEffect(() => {
    let actif = true;
    enCours ??= getPaymentConfig().catch(() => {
      // Échec (hors ligne, session expirée) : on garde le défaut et on
      // autorise un nouvel essai au prochain montage.
      enCours = null;
      return PAYMENT_CONFIG_DEFAUT;
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
