"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  MessageSquare,
  UserCircle,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/* -------------------------------------------------------------------------- */
/*  Navigation basse — charte §3                                              */
/*                                                                            */
/*  Hauteur 86px, fond rgba(255,255,255,0.94), bord haut #E6EBF3, CINQ        */
/*  emplacements dont LE CENTRE VIDE. Le bouton flottant orange (58px, rayon  */
/*  19px, remonté de 6px) occupe ce vide : c'est le seul orange de l'écran,   */
/*  donc les pages qui affichent la nav basse n'utilisent pas de CTA orange.  */
/*                                                                            */
/*  Onglet actif  = icône pleine #1E3A8A + label #1E3A8A                      */
/*  Onglet inactif = icône contour 2px #A9B2C1 + label #9AA3B2                */
/*                                                                            */
/*  Les notifications gardent leur cloche dans l'en-tête (avec son compteur), */
/*  et « Mes offres » reste dans le menu utilisateur : la charte n'autorise   */
/*  que quatre onglets, le cinquième emplacement étant le bouton flottant.    */
/* -------------------------------------------------------------------------- */

type Onglet = { href: string; icon: LucideIcon; label: string };

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useAppI18n();
  const role = user?.role?.toUpperCase();
  const estTransporteur = role === "TRANSPORTER";

  // Deux onglets à gauche du bouton flottant, deux à droite.
  // Libelles COURTS : 11px sur quatre emplacements ne laissent pas la place
  // aux intitules complets de la barre laterale, qui se couperaient.
  const onglets: Onglet[] = [
    { href: "/dashboard", icon: LayoutDashboard, label: t.nav.tabHome },
    estTransporteur
      ? { href: "/demandes", icon: Search, label: t.nav.tabSearch }
      : { href: "/recherche", icon: Search, label: t.nav.tabSearch },
    { href: "/messages", icon: MessageSquare, label: t.nav.tabMessages },
    {
      href: `/profile/${user?.id || ""}`,
      icon: UserCircle,
      label: t.nav.tabProfile,
    },
  ];

  // Le bouton flottant publie : un retour pour le transporteur, une demande
  // pour le client. Les deux routes existaient déjà dans la barre latérale.
  const hrefPublier = estTransporteur
    ? "/retours/nouveau"
    : "/demandes/nouvelle";
  const labelPublier = estTransporteur ? t.nav.returnTrip : t.nav.publishAd;

  const estActif = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const rendreOnglet = ({ href, icon: Icon, label }: Onglet) => {
    const actif = estActif(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={actif ? "page" : undefined}
        className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pt-2"
      >
        <Icon
          className={`h-[22px] w-[22px] transition-colors duration-120 ${
            actif ? "text-blue-700" : "text-[#A9B2C1]"
          }`}
          strokeWidth={actif ? 2.4 : 2}
          // L'onglet actif est « plein » : le remplissage de l'icône reprend
          // le bleu primaire, l'inactif reste un simple contour.
          fill={actif ? "currentColor" : "none"}
          fillOpacity={actif ? 0.16 : 0}
        />
        <span
          className={`bottom-nav__label max-w-full truncate transition-colors duration-120 ${
            actif ? "text-blue-700" : "text-ink-300"
          }`}
        >
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav
      aria-label={t.nav.dashboard}
      className="bottom-nav fixed bottom-0 left-0 right-0 z-fixed lg:hidden"
    >
      <div className="mx-auto flex h-[86px] max-w-[520px] items-stretch justify-between px-1">
        {onglets.slice(0, 2).map(rendreOnglet)}

        {/* Cinquième emplacement : vide, occupé par le bouton flottant */}
        <div className="relative flex w-[76px] flex-shrink-0 justify-center">
          <Link
            href={hrefPublier}
            aria-label={labelPublier}
            className="nav-fab absolute -top-[6px] transition-all duration-120 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            <Plus className="h-[29px] w-[29px]" strokeWidth={1.6} />
          </Link>
        </div>

        {onglets.slice(2).map(rendreOnglet)}
      </div>
    </nav>
  );
}
