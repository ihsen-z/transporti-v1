"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { TrustHero, TrustFaq } from "@/components/trust-page/TrustHeroAndFaq";
import { EscrowSection } from "@/components/trust-page/EscrowSection";
import { VerificationSection } from "@/components/trust-page/VerificationSection";
import { DisputeSection } from "@/components/trust-page/DisputeSection";

/**
 * P3 — « Confiance et sécurité ». Page PUBLIQUE.
 *
 * Elle répond à l'objection n°1 du persona client (Vision §7) : le manque de
 * confiance envers un transporteur inconnu. La page d'accueil affirme
 * « paiement sécurisé par escrow » et « transporteurs vérifiés » sans jamais
 * dire ce que ces mots recouvrent — une affirmation non étayée ne lève pas une
 * objection, elle la déplace.
 *
 * Trois sections, une par mécanisme réel : le séquestre, la vérification, le
 * litige. Chaque fait affiché a été vérifié dans le code ; les deux chiffres
 * (délai de versement automatique, score minimum pour les espèces) viennent de
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
        <EscrowSection />
        <VerificationSection />
        <DisputeSection />
        <TrustFaq />
      </main>
      <Footer />
    </div>
  );
}
