import type { Metadata } from "next";

/**
 * Titre et description de la page publique « Devenir transporteur ».
 *
 * Pourquoi un layout et non la page. `metadata` ne peut être exporté que
 * depuis un composant SERVEUR (confirmé dans la documentation Next.js 14) ; la
 * page est `"use client"` parce qu'elle lit le dictionnaire i18n via un hook.
 * Un layout serveur est le seul endroit du segment qui puisse porter ces
 * balises.
 *
 * Sans lui, cette page héritait du titre générique du site — « Transporti — La
 * logistique réinventée » — alors que son unique raison d'être est d'être
 * trouvée par un transporteur. Le titre s'insère dans le gabarit défini par le
 * layout racine : « Devenir transporteur | Transporti ».
 *
 * LIMITE ASSUMÉE : ces balises ne sont PAS traduites. La langue vit dans le
 * `localStorage` du navigateur (`lib/i18n/currentLocale.ts`) et le serveur ne
 * peut donc pas la connaître au moment de rendre le `<head>` — même contrainte
 * que celle qui a écarté une redirection serveur pour le détail d'un job. Le
 * français est la langue par défaut de la plateforme. Les traduire supposerait
 * de porter la langue dans l'URL ou dans un cookie : chantier à part.
 */
export const metadata: Metadata = {
  title: "Devenir transporteur",
  description:
    "Transformez vos retours à vide en kilomètres payés. Commission réduite sur les trajets retour, paiement sécurisé par escrow, inscription gratuite.",
};

export default function DevenirTransporteurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
