"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { HeaderLogo } from "@/components/brand/TransportiLogo";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

/* -------------------------------------------------------------------------- */
/*  Public Header — with hamburger menu for mobile/tablet                     */
/* -------------------------------------------------------------------------- */

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useAppI18n();
  const h = t.publicHeader;

  // Les libelles etaient une constante de module en francais en dur. Ils
  // dependent de la langue : ils sont donc construits au rendu.
  //
  // SEUIL DE BASCULE : `xl` (1280 px), et non `md` (768 px) comme avant.
  // Mesure a l'appui — a 820 px, le contenu de la barre occupait 1044 px dans
  // une boite de 757 : pres de 300 px etaient hors champ. A 1024 px il
  // depassait encore de 14 px. En dessous de 1280, le menu hamburger prend le
  // relais ; il porte exactement les memes entrees, aucune n'est perdue.
  // Ne pas rabaisser ce seuil sans remesurer : la barre porte le selecteur de
  // langue, l'entree transporteur et deux boutons de compte.
  //
  // UN EN-TETE GLOBAL PORTE DES DESTINATIONS, PAS DES SECTIONS D'UNE PAGE.
  // « Services » et « Pourquoi nous » pointaient vers `/#services` et
  // `/#pourquoi` — deux ancres qui N'EXISTENT PAS dans la page d'accueil
  // (verifie : `document.getElementById` rend `null` pour les deux). Les liens
  // ne menaient donc nulle part. Meme reparees, ces ancres auraient renvoye un
  // visiteur de `/confiance` vers l'accueil, ce qui n'est pas ce qu'un lien de
  // navigation doit faire. Les sections restent la, atteintes en faisant
  // defiler la page d'accueil.
  //
  // Leur retrait resout aussi l'encombrement : avec elles, la barre depassait
  // sa largeur utile et les libelles se coupaient sur DEUX LIGNES dans une
  // hauteur de 64 px.
  const navLinks = [
    { href: "/", label: h.home },
    { href: "/confiance", label: h.trust },
    { href: "/help", label: h.help },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <HeaderLogo />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden xl:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap text-[14.5px] font-semibold text-ink-500 transition-colors hover:text-blue-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden xl:flex items-center gap-3">
            {/* Le selecteur de langue n'existait QUE dans l'en-tete
                authentifie : tout le site public — accueil, inscription, et
                cette page « Devenir transporteur » — etait en francais pour un
                nouveau visiteur, sans moyen de basculer. La traduction arabe de
                ces pages etait donc inatteignable, donc inerte. */}
            <LanguageSwitcher />
            {/* P4 — l'entree transporteur. L'audit du 14/07 la notait
                « enfouie » : elle etait le DERNIER lien de la DERNIERE section
                de la page d'accueil. Ici elle est visible sans defiler, sur
                toutes les pages publiques. */}
            <Link
              href="/devenir-transporteur"
              data-testid="header-devenir-transporteur"
              className="whitespace-nowrap rounded-chip px-3 py-2 text-[14.5px] font-bold text-blue-700 transition-colors hover:bg-blue-50"
            >
              {h.becomeTransporter}
            </Link>
            <Link
              href="/login"
              className="whitespace-nowrap rounded-chip px-4 py-2 text-[14.5px] font-semibold text-ink-500 transition-colors hover:bg-app hover:text-blue-700"
            >
              {h.login}
            </Link>
            <Link
              href="/register"
              className="whitespace-nowrap rounded-chip bg-blue-700 px-5 py-2.5 text-[14.5px] font-bold text-white shadow-blue transition-colors duration-120 hover:bg-blue-800 active:translate-y-px"
            >
              {h.register}
            </Link>
          </div>

          {/* Hamburger Button (mobile) */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="grid h-10 w-10 place-items-center rounded-chip text-ink-500 transition-colors hover:bg-app hover:text-blue-700 xl:hidden"
            aria-label={mobileOpen ? h.closeMenu : h.openMenu}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" strokeWidth={2} />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="border-t border-line bg-surface shadow-card xl:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-field px-4 py-3 text-[15px] font-semibold text-ink-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/devenir-transporteur"
              data-testid="header-mobile-devenir-transporteur"
              onClick={() => setMobileOpen(false)}
              className="block rounded-field px-4 py-3 text-[15px] font-bold text-blue-700 transition-colors hover:bg-blue-50"
            >
              {h.becomeTransporter}
            </Link>
          </nav>
          <div className="flex flex-col gap-2 border-t border-line px-4 pb-4 pt-3">
            <div className="flex justify-center pb-1">
              <LanguageSwitcher />
            </div>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block w-full rounded-cta border border-line-strong bg-surface px-4 py-3.5 text-center text-[15px] font-bold text-ink-900 transition-colors hover:border-blue-700 hover:bg-app"
            >
              {h.login}
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="block w-full rounded-cta bg-blue-700 px-4 py-3.5 text-center text-[15px] font-bold text-white shadow-blue transition-colors hover:bg-blue-800"
            >
              {h.register}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
