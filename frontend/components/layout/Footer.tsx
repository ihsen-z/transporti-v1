"use client";

import Link from "next/link";
import { FooterLogo } from "@/components/brand/TransportiLogo";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/* -------------------------------------------------------------------------- */
/*  Pied de page public                                                       */
/*                                                                            */
/*  Surface bleu profond (fin du dégradé de la charte) : le produit ne connaît */
/*  pas de surface noire, et le bleu ferme la page sur son identité.          */
/*                                                                            */
/*  Les libellés viennent du dictionnaire. Ils étaient écrits en français dans */
/*  ce fichier : un visiteur arabophone lisait un pied de page français sous   */
/*  une page passée en RTL, et le contrôle de parité (lib/i18n/parity.ts) ne   */
/*  pouvait rien voir puisqu'il ne lit que le dictionnaire.                    */
/* -------------------------------------------------------------------------- */

export default function Footer() {
  const { t } = useAppI18n();
  const f = t.footer;

  const colonnes: {
    titre: string;
    liens: { href: string; label: string }[];
  }[] = [
    {
      titre: f.services,
      liens: [
        { href: "/register", label: f.servicesParcels },
        { href: "/register", label: f.servicesFreight },
        { href: "/register", label: f.servicesTracking },
      ],
    },
    {
      titre: f.company,
      liens: [
        { href: "/aide", label: f.about },
        // Le parametre de role est OBLIGATOIRE ici : sans lui, le
        // formulaire s'ouvre sur « Client », et ce lien creerait des
        // comptes client. C'est la troisieme occurrence du meme defaut —
        // les deux autres (page d'accueil, en-tete) ont ete corrigees le
        // 31/08/2026, celle-ci avait ete manquee et un parcours l'a fait
        // apparaitre.
        {
          href: "/register?role=transporter",
          label: f.becomeTransporter,
        },
        { href: "/aide", label: f.contact },
      ],
    },
    {
      titre: f.legal,
      liens: [
        { href: "/conditions", label: f.legalTerms },
        { href: "/confidentialite", label: f.privacy },
        { href: "/litiges", label: f.legalDisputes },
      ],
    },
  ];

  return (
    <footer className="mt-auto bg-blue-900 text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="col-span-1">
            <div className="mb-4">
              <FooterLogo />
            </div>
            <p className="text-[14px] leading-[1.55] text-on-blue-300">
              {f.tagline}
            </p>
          </div>

          {colonnes.map((colonne) => (
            <div key={colonne.titre}>
              <h4 className="mb-4 text-[13px] font-bold uppercase tracking-[0.06em] text-on-blue-200">
                {colonne.titre}
              </h4>
              <ul className="flex flex-col gap-2.5 text-[14px] text-on-blue-300">
                {colonne.liens.map((lien) => (
                  <li key={`${colonne.titre}-${lien.label}`}>
                    <Link
                      href={lien.href}
                      className="underline-offset-4 transition-colors hover:text-white hover:underline"
                    >
                      {lien.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/15 pt-8 text-center text-[13px] text-on-blue-300">
          <p>
            &copy; {new Date().getFullYear()} Transporti V1. {f.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
