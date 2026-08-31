"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm z-50">
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
                className="whitespace-nowrap text-neutral-700 hover:text-brand-600 font-medium transition-colors"
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
              className="whitespace-nowrap text-primary-700 hover:text-primary-800 font-medium px-3 py-2 rounded-lg hover:bg-primary-50 transition-colors"
            >
              {h.becomeTransporter}
            </Link>
            <Link
              href="/login"
              className="whitespace-nowrap text-brand-600 hover:text-brand-700 font-medium px-4 py-2 rounded-lg hover:bg-brand-600/5 transition-colors"
            >
              {h.login}
            </Link>
            <Link
              href="/register"
              className="whitespace-nowrap bg-accent-500 hover:bg-accent-600 text-white font-medium px-6 py-2 rounded-lg transition-colors shadow-sm"
            >
              {h.register}
            </Link>
          </div>

          {/* Hamburger Button (mobile) */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="xl:hidden p-2 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label={mobileOpen ? h.closeMenu : h.openMenu}
          >
            {mobileOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-neutral-100 bg-white shadow-lg">
          <nav className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 text-neutral-700 hover:text-brand-600 hover:bg-brand-600/5 rounded-lg font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/devenir-transporteur"
              data-testid="header-mobile-devenir-transporteur"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 text-primary-700 hover:bg-primary-50 rounded-lg font-semibold transition-colors"
            >
              {h.becomeTransporter}
            </Link>
          </nav>
          <div className="px-4 pb-4 pt-2 border-t border-neutral-100 space-y-2">
            <div className="flex justify-center pb-1">
              <LanguageSwitcher />
            </div>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center px-4 py-3 text-brand-600 font-medium rounded-lg border border-brand-600/20 hover:bg-brand-600/5 transition-colors"
            >
              {h.login}
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center px-4 py-3 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-lg transition-colors"
            >
              {h.register}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
