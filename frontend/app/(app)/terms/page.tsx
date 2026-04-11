"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Conditions Générales d'Utilisation — Stub                                 */
/* -------------------------------------------------------------------------- */

export default function TermsPage() {
  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-neutral-900">
            Conditions Générales d&apos;Utilisation
          </h1>
        </div>
        <p className="text-sm text-neutral-400">
          Dernière mise à jour : Février 2026
        </p>
      </div>

      <div className="prose prose-neutral max-w-none space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-neutral-900">1. Objet</h2>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Les présentes conditions générales d&apos;utilisation (CGU)
            régissent l&apos;accès et l&apos;utilisation de la plateforme
            Transporti, service de mise en relation entre clients et
            transporteurs en Tunisie.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900">
            2. Inscription
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed">
            L&apos;inscription est gratuite et ouverte à toute personne physique
            ou morale domiciliée en Tunisie. L&apos;utilisateur s&apos;engage à
            fournir des informations exactes et à maintenir la confidentialité
            de ses identifiants de connexion.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900">
            3. Services
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Transporti fournit une plateforme de mise en relation. La plateforme
            n&apos;est pas partie prenante aux contrats de transport conclus
            entre les utilisateurs. Le paiement est sécurisé par un système
            d&apos;entiercement (escrow).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900">
            4. Responsabilités
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Les transporteurs sont responsables de la bonne exécution des
            prestations de transport. Transporti met en œuvre des moyens
            raisonnables pour vérifier l&apos;identité et les qualifications des
            transporteurs inscrits sur la plateforme.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900">5. Litiges</h2>
          <p className="text-sm text-neutral-600 leading-relaxed">
            En cas de litige, les utilisateurs sont invités à utiliser le{" "}
            <Link href="/disputes" className="text-brand-600 hover:underline">
              processus de résolution des litiges
            </Link>{" "}
            de la plateforme avant tout recours judiciaire.
          </p>
        </section>
      </div>
    </div>
  );
}
