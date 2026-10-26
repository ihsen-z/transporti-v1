"use client";

import { usePathname } from "next/navigation";
import { Shield, Clock, BadgeCheck } from "lucide-react";
import { AuthLogo } from "@/components/brand/TransportiLogo";

/* -------------------------------------------------------------------------- */
/*  Coquille des écrans d'authentification                                    */
/*                                                                            */
/*  La charte range les écrans en deux familles (§1) et le tableau des écrans */
/*  livrés (§7) place l'inscription en APPLICATIF, tandis que connexion,      */
/*  onboarding, OTP et mot de passe oublié sont IMMERSIFS. Ce groupe de       */
/*  routes porte donc les deux coquilles, choisies sur la route courante —    */
/*  jamais mélangées sur un même écran : le verre ne vit que sur le bleu.     */
/*                                                                            */
/*  IMMERSIF   — dégradé plein écran, deux halos, cartes verre.              */
/*  APPLICATIF — bandeau bleu haut à rayon 34px, fond #F6F8FC, cartes        */
/*               blanches opaques ; la carte peut chevaucher le bandeau.      */
/* -------------------------------------------------------------------------- */

/** Routes de ce groupe qui suivent la famille applicative (charte §7). */
const ROUTES_APPLICATIVES = ["/register"];

const REPERES_CONFIANCE = [
  { icon: Shield, text: "Paiement sécurisé, libéré à la livraison" },
  { icon: BadgeCheck, text: "Transporteurs vérifiés, documents contrôlés" },
  { icon: Clock, text: "Retours à vide : le bon corridor, au bon moment" },
];

/* -------------------------------- Immersif -------------------------------- */

function CoquilleImmersive({ children }: { children: React.ReactNode }) {
  return (
    <div className="immersive min-h-screen">
      {/* Deux halos au maximum, jamais centrés, blur 60px, statiques */}
      <div className="halo halo--green" aria-hidden />
      <div className="halo halo--orange" aria-hidden />

      <div className="relative z-[1] mx-auto grid min-h-screen w-full max-w-[1180px] items-center gap-12 px-5 py-10 lg:grid-cols-[1fr_minmax(0,440px)] lg:px-10">
        {/* Colonne récit — desktop uniquement */}
        <div className="hidden flex-col gap-6 lg:flex">
          <AuthLogo />

          <div className="flex flex-col gap-3">
            <h2 className="text-[34px] font-extrabold leading-[1.15] tracking-title text-white">
              Simple, rapide, <span className="text-green-300">fiable.</span>
            </h2>
            <p className="max-w-md text-[15px] leading-[1.55] text-on-blue-300">
              La plateforme qui connecte expéditeurs et transporteurs en
              Tunisie, et remplit les trajets retour au lieu de les laisser à
              vide.
            </p>
          </div>

          <ul className="glass flex max-w-md list-none flex-col gap-4">
            {REPERES_CONFIANCE.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="glass-chip h-10 w-10 flex-shrink-0">
                  <Icon
                    className="h-[18px] w-[18px] text-white"
                    strokeWidth={2}
                  />
                </span>
                <span className="text-[14.5px] font-medium leading-[1.5] text-white">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Colonne formulaire */}
        <div className="mx-auto flex w-full max-w-[440px] flex-col gap-6">
          <div className="flex justify-center lg:hidden">
            <AuthLogo />
          </div>
          <div className="animate-fade-in-up">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Applicatif ------------------------------- */

function CoquilleApplicative({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-app">
      {/* Bandeau bleu haut — un seul halo à l'intérieur (charte §4) */}
      <header className="app-band px-5 pb-24 pt-10 sm:px-8">
        {/* Le halo vit dans la lucarne : c est elle qui rogne, pas le bandeau,
            afin que la carte puisse le chevaucher sans etre coupee. */}
        <div className="app-band__glow">
          <div className="halo halo--green !left-auto !end-[-70px] !top-[-40px]" />
        </div>
        <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4">
          <AuthLogo />
        </div>
      </header>

      {/* La colonne remonte sur le bandeau : c'est la signature de la marque */}
      <main className="mx-auto -mt-16 w-full max-w-[520px] px-5 pb-12 sm:px-8">
        <div className="animate-fade-in-up">{children}</div>
      </main>
    </div>
  );
}

/* --------------------------------- Racine --------------------------------- */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const estApplicative = ROUTES_APPLICATIVES.some((route) =>
    pathname.startsWith(route),
  );

  return estApplicative ? (
    <CoquilleApplicative>{children}</CoquilleApplicative>
  ) : (
    <CoquilleImmersive>{children}</CoquilleImmersive>
  );
}
