"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Phone, Mail, Scale, Truck } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/* -------------------------------------------------------------------------- */
/*  Pied de confiance — zone connectée                                        */
/*                                                                            */
/*  Quatre repères en tuiles teintées : le vert porte la valeur (paiement      */
/*  protégé), le bleu l'identité (litiges, vérification), l'orange l'ancrage   */
/*  local. Une seule teinte par tuile, aplat sans filet (charte §3).           */
/*                                                                            */
/*  Les libellés viennent du dictionnaire : ils étaient écrits en français     */
/*  dans ce fichier, donc invisibles au contrôle de parité fr/ar, et un        */
/*  transporteur arabophone lisait un pied de page français.                   */
/* -------------------------------------------------------------------------- */

export default function TrustFooter() {
  const { t } = useAppI18n();
  const f = t.footer;

  const reperes = [
    {
      icone: ShieldCheck,
      titre: f.trustPaymentTitle,
      detail: f.trustPaymentDesc,
      fond: "bg-green-50",
      encre: "text-green-800",
      encreDetail: "text-green-700",
      encreIcone: "text-green-600",
    },
    {
      icone: Scale,
      titre: f.trustDisputeTitle,
      detail: f.trustDisputeDesc,
      fond: "bg-blue-50",
      encre: "text-blue-800",
      encreDetail: "text-blue-600",
      encreIcone: "text-blue-700",
    },
    {
      icone: ShieldCheck,
      titre: f.trustVerifiedTitle,
      detail: f.trustVerifiedDesc,
      fond: "bg-blue-50",
      encre: "text-blue-800",
      encreDetail: "text-blue-600",
      encreIcone: "text-blue-700",
    },
    {
      icone: Truck,
      titre: f.trustLocalTitle,
      detail: f.trustLocalDesc,
      fond: "bg-orange-50",
      encre: "text-orange-800",
      encreDetail: "text-orange-700",
      encreIcone: "text-orange-600",
    },
  ];

  const liens = [
    { href: "/aide", label: f.helpCenter },
    { href: "/conditions", label: f.terms },
    { href: "/confidentialite", label: f.privacy },
    { href: "/litiges", label: f.disputes },
  ];

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        {/* Repères de confiance */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {reperes.map((r) => (
            <div
              key={r.titre}
              className={`flex items-center gap-3 rounded-tile p-3.5 ${r.fond}`}
            >
              <r.icone
                className={`h-6 w-6 flex-shrink-0 ${r.encreIcone}`}
                strokeWidth={2}
              />
              <div className="min-w-0">
                <p className={`text-[14px] font-bold ${r.encre}`}>{r.titre}</p>
                <p className={`text-[11.5px] font-semibold ${r.encreDetail}`}>
                  {r.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Marque, liens et contact */}
        <div className="grid grid-cols-1 gap-6 border-t border-line py-7 md:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-700" strokeWidth={2} />
              <span className="text-[16px] font-extrabold tracking-heading text-ink-900">
                Transporti
              </span>
            </div>
            <p className="text-[14px] leading-[1.55] text-ink-500">{f.blurb}</p>
          </div>

          <div>
            <h4 className="mb-3 text-[13px] font-bold uppercase tracking-[0.06em] text-ink-900">
              {f.usefulLinks}
            </h4>
            <ul className="flex flex-col gap-2.5">
              {liens.map((lien) => (
                <li key={lien.href}>
                  <Link
                    href={lien.href}
                    className="text-[14px] text-ink-500 underline-offset-4 transition-colors hover:text-blue-700 hover:underline"
                  >
                    {lien.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-[13px] font-bold uppercase tracking-[0.06em] text-ink-900">
              {f.contactUs}
            </h4>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-[14px] text-ink-500">
                <Mail className="h-4 w-4" strokeWidth={2} />
                <a
                  href="mailto:support@transporti.tn"
                  className="underline-offset-4 transition-colors hover:text-blue-700 hover:underline"
                >
                  support@transporti.tn
                </a>
              </div>
              <div className="flex items-center gap-2 text-[14px] text-ink-500">
                <Phone className="h-4 w-4" strokeWidth={2} />
                <a
                  href="tel:+21671000000"
                  dir="ltr"
                  className="underline-offset-4 transition-colors hover:text-blue-700 hover:underline"
                >
                  +216 71 000 000
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-line pt-5 text-center">
          <p className="text-[12.5px] text-ink-300">
            © {new Date().getFullYear()} Transporti. {f.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
