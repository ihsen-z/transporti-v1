"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { TrustHero, TrustFaq } from "@/components/trust-page/TrustHeroAndFaq";
import { ProtectionsSection } from "@/components/trust-page/ProtectionsSection";
import { VerificationSection } from "@/components/trust-page/VerificationSection";
import { DisputeSection } from "@/components/trust-page/DisputeSection";

/**
 * P3 — « Confiance et sécurité ». Page PUBLIQUE.
 *
 * Elle répond à l'objection n°1 du persona client (Vision §7) : le manque de
 * confiance envers un transporteur inconnu. Le service ouvre en espèces
 * seules : la page dit ce qui protège réellement (paiement à la réception,
 * code de livraison, avis, vérification des pièces, litiges examinés par
 * l'équipe) et ce que la plateforme ne fait pas (retenir ou rembourser).
 *
 * Les deux chiffres affichés (score minimum pour les espèces, ...) viennent de
 * `lib/garanties.ts`, aligné sur le backend par un test qui échoue en cas de
 * dérive.
 *
 * Ce fichier ne fait que COMPOSER : tout le texte vient du dictionnaire, donc
 * la parité fr/ar est vérifiée à la compilation.
 */
export default function ConfiancePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16">
        <TrustHero />
        <ProtectionsSection />
        <VerificationSection />
        <DisputeSection />
        <TrustFaq />
      </main>
      <Footer />
    </div>
  );
}
