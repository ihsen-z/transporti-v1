"use client";

import AppSidebar from "@/components/navigation/AppSidebar";
import AppHeader from "@/components/navigation/AppHeader";
import BottomNav from "@/components/navigation/BottomNav";
import TrustFooter from "@/components/layout/TrustFooter";
import AuthGuard from "@/components/auth/AuthGuard";
import DocumentTitle from "@/components/layout/DocumentTitle";
import ForceLightTheme from "@/components/layout/ForceLightTheme";
import {
  ActionBarProvider,
  useActionBarPresente,
} from "@/components/ui/ActionBar";
import {
  AppBandProvider,
  AppBandTarget,
} from "@/components/layout/AppBandSlot";

/* -------------------------------------------------------------------------- */
/*  Coquille applicative — charte §4                                          */
/*                                                                            */
/*    [fond #F6F8FC]                                                          */
/*      bandeau bleu haut, rayon bas 34px, 1 halo à l'intérieur               */
/*        rangée d'actions (logo / notifications / compte)                    */
/*        titre d'écran                                                       */
/*        lucarne : la carte verre de l'écran, s'il en a une                  */
/*      contenu en cartes blanches, gap 16px                                  */
/*      nav basse (mobile) OU barre d'action fixe — jamais les deux           */
/*                                                                            */
/*  Le bandeau est UN SEUL élément qui contient l'en-tête : deux dégradés     */
/*  empilés laisseraient une couture visible à leur jonction.                 */
/*                                                                            */
/*  Il défile avec la page, comme sur les maquettes : la navigation reste     */
/*  atteignable par la barre latérale (desktop) et la nav basse (mobile).     */
/*                                                                            */
/*  La carte verre d'un écran est projetée DANS le bandeau par la lucarne     */
/*  (voir components/layout/AppBandSlot.tsx) et déborde du bas par une marge  */
/*  négative : le bandeau atteint ainsi les 190–300px de la charte et la      */
/*  carte descend sur le fond clair. C'est la signature de la marque.         */
/* -------------------------------------------------------------------------- */

function Coquille({ children }: { children: React.ReactNode }) {
  // `ms-` suit le sens de lecture, comme la barre latérale elle-même : la
  // marge tombe toujours du côté où la barre se trouve. Un ternaire vers
  // `me-` la posait à l'opposé en arabe, et la barre recouvrait le contenu.
  const sidebarMargin = "lg:ms-64";

  // Un écran qui porte une barre d'action fixe masque la navigation basse :
  // les deux afficheraient un orange, et la charte n'en autorise qu'un.
  const barreDActionPresente = useActionBarPresente();

  return (
    <div className="flex min-h-screen flex-col bg-app">
      {/* Barre latérale (desktop) */}
      <AppSidebar />

      <div className={`${sidebarMargin} flex flex-1 flex-col`}>
        {/* Bandeau bleu haut — dégradé, rayon 34px et halo, en un seul bloc */}
        <div className="app-band">
          <div className="app-band__glow">
            <div
              className="halo halo--blue !-top-[120px] !h-[260px] !w-[260px]"
              aria-hidden
            />
          </div>

          <AppHeader />

          {/* Lucarne : les écrans y projettent leur carte verre */}
          <AppBandTarget className="empty:hidden" />
        </div>

        {/* Contenu — cartes blanches sur #F6F8FC */}
        <main
          className={`flex-1 ${barreDActionPresente ? "" : "pb-[86px] lg:pb-0"}`}
        >
          {children}
        </main>

        {/* Pied de confiance (desktop) */}
        <div className="hidden lg:block">
          <TrustFooter />
        </div>
      </div>

      {/* Navigation basse (mobile) */}
      {!barreDActionPresente && <BottomNav />}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["client", "transporter", "admin"]}>
      <ForceLightTheme />
      <DocumentTitle />
      <AppBandProvider>
        <ActionBarProvider>
          <Coquille>{children}</Coquille>
        </ActionBarProvider>
      </AppBandProvider>
    </AuthGuard>
  );
}
