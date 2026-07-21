"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/**
 * J3 — Titres de pages par route.
 *
 * Les pages de l'app sont des composants client (« use client ») : elles ne
 * peuvent pas exporter `metadata`. On centralise donc ici le titre de l'onglet
 * navigateur, dérivé du chemin et traduit (FR/AR) via les libellés `t.nav.*`
 * déjà utilisés par la barre latérale. Monté une fois dans (app)/layout.tsx.
 */
export default function DocumentTitle() {
  const pathname = usePathname();
  const { t } = useAppI18n();

  useEffect(() => {
    const n = t.nav;
    // Préfixes du plus spécifique au plus général (le premier qui matche gagne).
    const routes: [string, string][] = [
      ["/dashboard", n.dashboard],
      ["/jobs/return-trips", n.findTrip],
      ["/jobs/return-trip", n.returnTrip],
      ["/jobs/browse", n.findMission],
      ["/jobs/new", n.publishAd],
      ["/jobs", n.myMissions], // liste + détail d'une mission
      ["/offers", n.myOffers],
      ["/messages", n.messages],
      ["/notifications", n.notifications],
      ["/disputes", n.disputes],
      ["/wallet", n.wallet],
      ["/verification", n.verification],
      ["/help", n.helpCenter],
      ["/settings", n.settings],
      ["/profile", n.myProfile],
    ];

    const hit = routes.find(
      ([p]) => pathname === p || pathname.startsWith(p + "/"),
    );
    // Le layout racine définit le template "%s | Transporti" pour les titres
    // servis via metadata ; ici on pose le titre complet côté client.
    document.title = hit ? `${hit[1]} | Transporti` : "Transporti";
  }, [pathname, t]);

  return null;
}
