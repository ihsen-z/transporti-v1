/**
 * Réglages de la plateforme fixés par le serveur
 * (GET /api/v1/payments/config/, lisible sans connexion).
 *
 * Module PUR : ni React, ni client HTTP. Il est importé à la fois par les
 * écrans (hook usePlatformConfig), par les pages rendues côté serveur et par
 * middleware.ts, qui tourne hors navigateur.
 *
 * Le chemin d'API garde le mot « payments » : il appartient au backend. Le
 * module, lui, s'appelle « plateforme » parce qu'il porte aussi l'ouverture
 * du canal classique, qui n'a rien d'un réglage de paiement.
 */

export interface PlatformConfig {
  /** Plafond d'une course payable en espèces (DT). */
  cod_max_amount: number;
  /** Dette de commission au-delà de laquelle le transporteur est bloqué (DT). */
  commission_debt_limit: number;
  /** Faux en mode « espèces seules » : séquestre, carte et retraits masqués. */
  online_payment_enabled: boolean;
  /**
   * Faux au lancement : le client ne publie pas de besoin et le transporteur
   * ne fait pas d'offre ; seul le canal « trajet retour » est ouvert.
   */
  classic_channel_enabled: boolean;
}

/**
 * Valeurs affichées tant que le serveur n'a pas répondu, ou s'il est
 * injoignable. Les deux interrupteurs sont FERMÉS par défaut : on préfère
 * masquer à tort une porte ouverte que montrer une porte que le serveur
 * refusera. Les plafonds ne décident de rien : le serveur refuse lui-même.
 */
export const PLATFORM_CONFIG_DEFAUT: PlatformConfig = {
  cod_max_amount: 300,
  commission_debt_limit: 60,
  online_payment_enabled: false,
  classic_channel_enabled: false,
};

/** Chemin de lecture des réglages, relatif à l'URL de l'API. */
export const CHEMIN_CONFIG_PLATEFORME = "/api/v1/payments/config/";

function nombreOuDefaut(valeur: unknown, defaut: number): number {
  return typeof valeur === "number" && Number.isFinite(valeur)
    ? valeur
    : defaut;
}

/**
 * Transforme la réponse brute du serveur en réglages sûrs.
 *
 * Un interrupteur n'est ouvert que si le serveur dit explicitement `true` :
 * un serveur plus ancien qui ne renvoie pas encore `classic_channel_enabled`
 * laisse donc le canal classique fermé.
 */
export function normaliserPlatformConfig(brut: unknown): PlatformConfig {
  if (!brut || typeof brut !== "object") return PLATFORM_CONFIG_DEFAUT;
  const r = brut as Record<string, unknown>;
  return {
    cod_max_amount: nombreOuDefaut(
      r.cod_max_amount,
      PLATFORM_CONFIG_DEFAUT.cod_max_amount,
    ),
    commission_debt_limit: nombreOuDefaut(
      r.commission_debt_limit,
      PLATFORM_CONFIG_DEFAUT.commission_debt_limit,
    ),
    online_payment_enabled: r.online_payment_enabled === true,
    classic_channel_enabled: r.classic_channel_enabled === true,
  };
}

/** Moyen proposé d'abord : en ligne s'il existe, sinon espèces. */
export function moyenDePaiementParDefaut(
  config: PlatformConfig,
): "DIGITAL" | "COD" {
  return config.online_payment_enabled ? "DIGITAL" : "COD";
}
