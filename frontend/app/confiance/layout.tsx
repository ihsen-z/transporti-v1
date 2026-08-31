import type { Metadata } from "next";

/**
 * Titre et description de la page publique « Confiance et sécurité ».
 *
 * Même montage que `/devenir-transporteur` : `metadata` ne peut être exporté
 * que d'un composant SERVEUR, et la page est `"use client"` parce qu'elle lit
 * le dictionnaire i18n via un hook.
 *
 * Ces balises ne sont pas traduites — la langue vit dans le `localStorage`, que
 * le serveur ne connaît pas au moment de rendre le `<head>`. Limite assumée,
 * documentée une première fois dans `app/devenir-transporteur/layout.tsx`.
 */
export const metadata: Metadata = {
  title: "Confiance et sécurité",
  description:
    "Votre argent est retenu par la plateforme jusqu'à la livraison confirmée. Transporteurs vérifiés pièces à l'appui, litiges qui gèlent le versement.",
};

export default function ConfianceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
