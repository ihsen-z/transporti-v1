"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  User,
  UserCircle,
  LogOut,
  Shield,
  ChevronDown,
  FileText,
  HelpCircle,
} from "lucide-react";
import TransportiLogo from "@/components/brand/TransportiLogo";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useToast } from "@/components/ui/Toast";
import { roleColorsOnBlue } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/* -------------------------------------------------------------------------- */
/*  En-tête applicatif — LE BANDEAU BLEU HAUT de la charte (§4)               */
/*                                                                            */
/*  Famille applicative : fond #F6F8FC + bandeau bleu haut. Ce bandeau est    */
/*  la constante de tous les écrans connectés ; les écrans signature (home,   */
/*  résultats, détail) le prolongent avec leur propre section bleue, si bien  */
/*  que les deux ne lisent que comme UN bandeau de 190 à 300px.               */
/*                                                                            */
/*  Il porte un halo à l'intérieur, et tout ce qui y est posé passe en verre  */
/*  (pastilles, badges) — jamais d'aplat clair sur le bleu.                   */
/* -------------------------------------------------------------------------- */

export default function AppHeader() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, role, isAdmin, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllRead } =
    useNotifications();
  const { showToast } = useToast();
  const { t } = useAppI18n();
  const router = useRouter();
  const pathname = usePathname();
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  /* Libellé du rôle, lu dans le dictionnaire et non dans une constante de
   * module : c'est ce qui faisait lire « Transporteur » en français à un
   * lecteur arabophone. Les quatre rôles sont couverts, il n'y a pas de
   * repli silencieux. */
  const libelleRole = (r: UserRole): string =>
    ({
      client: t.nav.client,
      transporter: t.nav.transporter,
      admin: t.nav.administrator,
      guest: t.nav.visitor,
    })[r];

  /* Titre d'écran, porté par le bandeau bleu (charte §4).
   *
   * La table est indexée par PRÉFIXE et lue de la plus longue à la plus
   * courte, ce qui règle deux choses d'un coup : les sous-routes gagnent sur
   * leur parent (`/demandes/nouvelle` avant `/demandes`) et les routes
   * dynamiques n'ont pas besoin d'entrée propre.
   *
   * Elle couvre TOUTES les routes de app/(app). C'était le défaut relevé en
   * recette : depuis que le bandeau affiche le titre à tous les points de
   * rupture, une route absente de la table s'annonçait « Transporti » —
   * l'écran Performance en portait la preuve.
   *
   * Les libellés viennent des dictionnaires déjà traduits de chaque section
   * plutôt que d'être redéclarés ici : un titre, une seule source. */
  const pageTitle = (() => {
    const p = t.header.pageTitles;
    const parPrefixe: [string, string][] = [
      ["/compte/adresses", t.addressBook.title],
      ["/demandes/nouvelle", t.nav.publishAd],
      ["/retours/nouveau", t.nav.returnTrip],
      ["/demandes-recues", p.receivedRequests],
      ["/reservation", t.booking.pageTitle],
      ["/transporteur", p.profile],
      ["/portefeuille", t.wallet.title],
      ["/performance", t.performance.title],
      ["/notifications", p.notifications],
      ["/mes-offres", t.nav.myOffers],
      ["/mes-avis", t.myReviews.title],
      ["/recherche", t.nav.findTrip],
      ["/documents", p.verification],
      ["/dashboard", p.dashboard],
      ["/demandes", t.nav.findMission],
      ["/messages", p.messages],
      ["/favoris", t.favorites.title],
      ["/trajets", p.jobDetail],
      ["/litiges", p.disputes],
      ["/profile", p.profile],
      ["/retours", p.returns],
      ["/compte", p.settings],
      ["/admin", p.admin],
      ["/help", p.help],
      ["/jobs", t.nav.myMissions],
    ];

    // `/jobs/12` et `/demandes/12` mènent au même écran de détail : la règle
    // du segment numérique évite une entrée par route dynamique.
    const detail = /^\/(jobs|demandes)\/\d+/.test(pathname);
    if (detail) return p.jobDetail;

    const trouve = parPrefixe.find(
      ([prefixe]) => pathname === prefixe || pathname.startsWith(prefixe + "/"),
    );
    return trouve ? trouve[1] : "Transporti";
  })();

  const handleMarkAsRead = async (id: number) => {
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllRead();
  };

  const handleLogout = () => {
    logout();
    showToast("success", t.header.logoutSuccess);
    router.push("/");
  };

  // Click-outside handler: close dropdowns when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Entrée de menu utilisateur — surface claire, filet et rayon de la charte */
  const menuItemClasses =
    "flex w-full items-center gap-2.5 rounded-chip px-3 py-2.5 text-[14px] font-medium text-ink-700 transition-colors hover:bg-app hover:text-blue-700";

  return (
    <header className="relative z-[2] text-white">
      {/* Rangee d actions — 64px, comme la zone logo de la barre laterale */}
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Mobile : logo */}
        <div className="flex items-center gap-3 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <TransportiLogo context="hero" size={26} showWordmark />
          </Link>
        </div>

        {/* Desktop : badge de rôle et accès administration */}
        <div className="hidden items-center gap-2 lg:flex">
          <span
            className={`rounded-tag px-2.5 py-1 text-[11.5px] font-semibold ${roleColorsOnBlue[role]}`}
          >
            {libelleRole(role)}
          </span>
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-1 rounded-tag bg-white px-2.5 py-1 text-[11.5px] font-bold text-blue-700 transition-opacity hover:opacity-90"
            >
              <Shield className="h-3 w-3" strokeWidth={2.4} />
              Admin
            </Link>
          )}
        </div>

        {/* Actions de droite */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher surface="on-blue" />

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <NotificationBell
              surface="on-blue"
              unreadCount={unreadCount}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            />
            <NotificationDropdown
              notifications={notifications}
              isOpen={isDropdownOpen}
              onClose={() => setIsDropdownOpen(false)}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
            />
          </div>

          {/* Menu utilisateur */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              aria-expanded={isUserMenuOpen}
              className="flex h-10 items-center gap-2 rounded-chip border border-white/30 bg-white/[0.16] pe-2.5 ps-1.5 text-white transition-colors duration-120 hover:bg-white/[0.24]"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/25 text-[13px] font-bold">
                {user?.name?.charAt(0) || "U"}
              </span>
              <span className="hidden max-w-[110px] truncate text-[13px] font-semibold sm:block">
                {user?.name || t.nav.user}
              </span>
              <ChevronDown className="h-4 w-4" strokeWidth={2.4} />
            </button>

            {/* Volet utilisateur — carte blanche opaque, jamais du verre */}
            {isUserMenuOpen && (
              <div className="absolute end-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-card bg-surface shadow-xl animate-scale-in">
                <Link
                  href={`/profile/${user?.id || ""}`}
                  onClick={() => setIsUserMenuOpen(false)}
                  className="block border-b border-line bg-app p-3.5 transition-opacity hover:opacity-80"
                >
                  <p className="text-[14.5px] font-bold text-ink-900">
                    {user?.name}
                  </p>
                  <p className="text-[12.5px] text-ink-500">{user?.email}</p>
                </Link>

                <div className="flex flex-col gap-0.5 p-2">
                  <Link
                    href={`/profile/${user?.id || ""}`}
                    onClick={() => setIsUserMenuOpen(false)}
                    className={menuItemClasses}
                  >
                    <UserCircle className="h-4 w-4" strokeWidth={2} />
                    {t.header.myProfile}
                  </Link>
                  {/* « Mes offres » : seul point d'entrée mobile depuis que la
                      nav basse est limitée à quatre onglets par la charte. */}
                  <Link
                    href="/mes-offres"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={menuItemClasses}
                  >
                    <FileText className="h-4 w-4" strokeWidth={2} />
                    {t.nav.myOffers}
                  </Link>
                  <Link
                    href="/compte"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={menuItemClasses}
                  >
                    <User className="h-4 w-4" strokeWidth={2} />
                    {t.nav.settings}
                  </Link>
                  <Link
                    href="/help"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={menuItemClasses}
                  >
                    <HelpCircle className="h-4 w-4" strokeWidth={2} />
                    {t.nav.helpCenter}
                  </Link>

                  <div className="my-1 border-t border-line" />

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-chip px-3 py-2.5 text-[14px] font-medium text-error-600 transition-colors hover:bg-error-50"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={2} />
                    {t.header.logout}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Titre d'écran, posé dans le bandeau bleu sous la rangée d'actions.
          C'est le « titre bandeau applicatif » de la charte (21px/800). Il
          n'apparaît qu'ici : la rangée d'actions ne garde que le badge de
          rôle, de sorte que le titre n'est jamais dupliqué. */}
      <div className="flex flex-col gap-1 px-5 pb-6 pt-1 sm:px-6 lg:px-8 lg:pb-8">
        <h1 className="app-band__title">{pageTitle}</h1>
        <p className="app-band__subtitle lg:hidden">{libelleRole(role)}</p>
      </div>
    </header>
  );
}
