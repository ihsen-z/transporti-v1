"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { HeaderLogo } from "@/components/brand/TransportiLogo";

/* -------------------------------------------------------------------------- */
/*  Public Header — with hamburger menu for mobile/tablet                     */
/* -------------------------------------------------------------------------- */

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/#services", label: "Services" },
  { href: "/#pourquoi", label: "Pourquoi nous" },
  { href: "/help", label: "Aide" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <HeaderLogo />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-neutral-700 hover:text-brand-600 font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-brand-600 hover:text-brand-700 font-medium px-4 py-2 rounded-lg hover:bg-brand-600/5 transition-colors"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="bg-accent-500 hover:bg-accent-600 text-white font-medium px-6 py-2 rounded-lg transition-colors shadow-sm"
            >
              Créer un compte
            </Link>
          </div>

          {/* Hamburger Button (mobile) */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
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
        <div className="md:hidden border-t border-neutral-100 bg-white shadow-lg">
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
          </nav>
          <div className="px-4 pb-4 pt-2 border-t border-neutral-100 space-y-2">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center px-4 py-3 text-brand-600 font-medium rounded-lg border border-brand-600/20 hover:bg-brand-600/5 transition-colors"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center px-4 py-3 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-lg transition-colors"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
