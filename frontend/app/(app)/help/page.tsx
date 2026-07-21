"use client";

import React from "react";
import Link from "next/link";
import {
  HelpCircle,
  MessageSquare,
  Shield,
  CreditCard,
  Truck,
  RotateCcw,
  Wallet,
  ChevronRight,
  Phone,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import type { LucideIcon } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  WS-K — Centre d'aide orienté pivot, bilingue (t.help.*) et par rôle.       */
/*  Le contenu (questions/réponses) vit dans les dictionnaires i18n ; ici on   */
/*  ne fait que composer les sections et gérer l'accordéon + les onglets.      */
/* -------------------------------------------------------------------------- */

type Audience = "client" | "transporter";

interface Section {
  icon: LucideIcon;
  title: string;
  questions: { q: string; a: string }[];
}

export default function HelpCenterPage() {
  const { t } = useAppI18n();
  const { user } = useAuth();
  const h = t.help;

  // Onglet par défaut = rôle de l'utilisateur connecté.
  const isTransporter = user?.role?.toUpperCase() === "TRANSPORTER";
  const [audience, setAudience] = React.useState<Audience>(
    isTransporter ? "transporter" : "client",
  );
  const [openKey, setOpenKey] = React.useState<string | null>(null);

  const clientSections: Section[] = [
    {
      icon: RotateCcw,
      title: h.cReturnsTitle,
      questions: [
        { q: h.cReturnsQ1, a: h.cReturnsA1 },
        { q: h.cReturnsQ2, a: h.cReturnsA2 },
      ],
    },
    {
      icon: MessageSquare,
      title: h.cRequestTitle,
      questions: [
        { q: h.cRequestQ1, a: h.cRequestA1 },
        { q: h.cRequestQ2, a: h.cRequestA2 },
      ],
    },
    {
      icon: CreditCard,
      title: h.cPayTitle,
      questions: [
        { q: h.cPayQ1, a: h.cPayA1 },
        { q: h.cPayQ2, a: h.cPayA2 },
      ],
    },
  ];

  const transporterSections: Section[] = [
    {
      icon: Truck,
      title: h.tPublishTitle,
      questions: [
        { q: h.tPublishQ1, a: h.tPublishA1 },
        { q: h.tPublishQ2, a: h.tPublishA2 },
      ],
    },
    {
      icon: Shield,
      title: h.tVerifTitle,
      questions: [
        { q: h.tVerifQ1, a: h.tVerifA1 },
        { q: h.tVerifQ2, a: h.tVerifA2 },
      ],
    },
    {
      icon: Wallet,
      title: h.tEarnTitle,
      questions: [
        { q: h.tEarnQ1, a: h.tEarnA1 },
        { q: h.tEarnQ2, a: h.tEarnA2 },
      ],
    },
  ];

  const sections =
    audience === "transporter" ? transporterSections : clientSections;

  const tabClass = (active: boolean) =>
    `flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-brand-600 text-white shadow-sm"
        : "text-neutral-600 hover:bg-neutral-100"
    }`;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" />
        {h.back}
      </Link>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-brand-600/5 rounded-full flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-7 h-7 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">{h.title}</h1>
        <p className="text-neutral-500 text-sm">{h.subtitle}</p>
      </div>

      {/* Role tabs */}
      <div className="flex gap-2 p-1 bg-neutral-100/70 rounded-xl mb-8">
        <button
          onClick={() => {
            setAudience("client");
            setOpenKey(null);
          }}
          className={tabClass(audience === "client")}
        >
          {h.tabClient}
        </button>
        <button
          onClick={() => {
            setAudience("transporter");
            setOpenKey(null);
          }}
          className={tabClass(audience === "transporter")}
        >
          {h.tabTransporter}
        </button>
      </div>

      {/* FAQ Sections */}
      <div className="space-y-8">
        {sections.map((section, si) => {
          const Icon = section.icon;
          return (
            <div key={`${audience}-${si}`}>
              <div className="flex items-center gap-2 mb-4">
                <Icon className="w-5 h-5 text-brand-600" />
                <h2 className="text-lg font-bold text-neutral-900">
                  {section.title}
                </h2>
              </div>
              <div className="space-y-2">
                {section.questions.map((item, qi) => {
                  const key = `${audience}-${si}-${qi}`;
                  const isOpen = openKey === key;
                  return (
                    <div
                      key={key}
                      className="border border-neutral-200 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenKey(isOpen ? null : key)}
                        className="w-full flex items-center justify-between px-4 py-3 text-start hover:bg-neutral-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-neutral-800">
                          {item.q}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 flex-shrink-0 text-neutral-400 transition-transform rtl:-scale-x-100 ${isOpen ? "rotate-90" : ""}`}
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
          );
        })}
      </div>

      {/* Contact */}
      <div className="mt-10 bg-neutral-50 border border-neutral-200 rounded-xl p-6 text-center">
        <h3 className="font-semibold text-neutral-900 mb-2">
          {h.contactTitle}
        </h3>
        <p className="text-sm text-neutral-500 mb-4">{h.contactDesc}</p>
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
