"use client";

import React from "react";
import Link from "next/link";
import {
  HelpCircle,
  MessageSquare,
  Shield,
  CreditCard,
  Truck,
  ChevronRight,
  Phone,
  Mail,
  ArrowLeft,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Help Center / Centre d'aide                                               */
/* -------------------------------------------------------------------------- */

const FAQ_SECTIONS = [
  {
    icon: Truck,
    title: "Transport & Déménagement",
    questions: [
      {
        q: "Comment publier une annonce de transport ?",
        a: 'Depuis votre tableau de bord, cliquez sur "Publier une annonce" et suivez les étapes du formulaire.',
      },
      {
        q: "Comment choisir un transporteur ?",
        a: "Comparez les offres reçues, consultez les profils et avis des transporteurs, puis acceptez l'offre qui vous convient.",
      },
      {
        q: "Puis-je annuler un transport ?",
        a: "Oui, vous pouvez annuler tant que le transporteur n'a pas commencé la mission. Des frais peuvent s'appliquer selon les conditions.",
      },
    ],
  },
  {
    icon: CreditCard,
    title: "Paiement & Facturation",
    questions: [
      {
        q: "Quels moyens de paiement sont acceptés ?",
        a: "Carte bancaire, E-Dinar, Sobflous et D17 sont acceptés sur la plateforme.",
      },
      {
        q: "Comment fonctionne le paiement sécurisé ?",
        a: "Votre argent est retenu en escrow et libéré au transporteur uniquement après confirmation de la livraison.",
      },
      {
        q: "Comment obtenir un remboursement ?",
        a: "En cas de problème, ouvrez un litige depuis votre tableau de bord. Notre équipe traitera votre demande sous 48-72h.",
      },
    ],
  },
  {
    icon: Shield,
    title: "Sécurité & Vérification",
    questions: [
      {
        q: "Comment devenir transporteur vérifié ?",
        a: "Soumettez vos documents (CIN, permis, carte grise, assurance) dans la section Vérification de votre profil.",
      },
      {
        q: "Mes données sont-elles protégées ?",
        a: "Oui, toutes vos données sont chiffrées et ne sont jamais partagées sans votre consentement.",
      },
    ],
  },
  {
    icon: MessageSquare,
    title: "Messagerie & Communication",
    questions: [
      {
        q: "Puis-je contacter le transporteur avant de réserver ?",
        a: "Oui, la messagerie in-app vous permet d'échanger avant et après la réservation.",
      },
      {
        q: "Pourquoi ne puis-je pas partager mon numéro ?",
        a: "Pour votre sécurité, les coordonnées personnelles ne sont révélées qu'après confirmation de la réservation.",
      },
    ],
  },
];

export default function HelpCenterPage() {
  const [openIndex, setOpenIndex] = React.useState<string | null>(null);

  const toggleQuestion = (key: string) => {
    setOpenIndex(openIndex === key ? null : key);
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour au tableau de bord
      </Link>

      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-14 h-14 bg-brand-600/5 rounded-full flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-7 h-7 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Centre d&apos;aide
        </h1>
        <p className="text-neutral-500 text-sm">
          Trouvez des réponses à vos questions les plus fréquentes.
        </p>
      </div>

      {/* FAQ Sections */}
      <div className="space-y-8">
        {FAQ_SECTIONS.map((section, si) => (
          <div key={si}>
            <div className="flex items-center gap-2 mb-4">
              <section.icon className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-neutral-900">
                {section.title}
              </h2>
            </div>
            <div className="space-y-2">
              {section.questions.map((item, qi) => {
                const key = `${si}-${qi}`;
                const isOpen = openIndex === key;
                return (
                  <div
                    key={key}
                    className="border border-neutral-200 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleQuestion(key)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
                    >
                      <span className="text-sm font-medium text-neutral-800">
                        {item.q}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3 text-sm text-neutral-600 border-t border-neutral-100 pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Contact */}
      <div className="mt-10 bg-neutral-50 border border-neutral-200 rounded-xl p-6 text-center">
        <h3 className="font-semibold text-neutral-900 mb-2">
          Vous ne trouvez pas la réponse ?
        </h3>
        <p className="text-sm text-neutral-500 mb-4">
          Notre équipe est là pour vous aider.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="tel:+21671000000"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Phone className="w-4 h-4" />
            +216 71 000 000
          </a>
          <a
            href="mailto:support@transporti.tn"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Mail className="w-4 h-4" />
            support@transporti.tn
          </a>
        </div>
      </div>
    </div>
  );
}
