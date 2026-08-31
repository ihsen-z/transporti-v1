"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { HeroSection } from "@/components/become-transporter/HeroSection";
import { CommissionSection } from "@/components/become-transporter/CommissionSection";
import { HowItWorksSection } from "@/components/become-transporter/HowItWorksSection";
import { TrustSection } from "@/components/become-transporter/TrustSection";
import { FaqSection } from "@/components/become-transporter/FaqSection";

/**
 * P4 — « Devenir transporteur ». Page PUBLIQUE d'acquisition.
 *
 * Pourquoi elle existe. L'audit du 14/07 notait l'entrée transporteur comme
 * « enfouie », et c'était encore vrai : « Devenir transporteur » était le
 * DERNIER lien de la DERNIÈRE section de la page d'accueil, et il menait droit
 * au formulaire d'inscription — aucune page ne faisait l'argumentaire. Pire, ce
 * lien créait des comptes CLIENT, le paramètre `?role=transporter` étant ignoré
 * (corrigé avant cette page).
 *
 * La page d'accueil, elle, s'adresse aux deux publics : son « Comment ça
 * marche ? » décrit « 3 étapes simples pour envoyer vos colis », c'est-à-dire
 * le parcours client. Un transporteur n'y trouvait pas son rôle.
 *
 * Ce fichier ne fait que COMPOSER : chaque section vit dans son propre
 * composant, et tout le texte vient du dictionnaire — la parité fr/ar est donc
 * vérifiée à la compilation par `lib/i18n/parity.ts`.
 */
export default function DevenirTransporteurPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16">
        <HeroSection />
        <CommissionSection />
        <HowItWorksSection />
        <TrustSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}
