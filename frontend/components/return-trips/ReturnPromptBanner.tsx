"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw } from "lucide-react";

/**
 * T4.4 — L'amorce de retour à vide, à la fin d'une mission livrée.
 *
 * **L'écran de priorité 1 du plan.** Sans lui, l'inventaire de trajets retour
 * ne s'alimente que volontairement : un transporteur qui vient de livrer à Sfax
 * et rentre à Tunis à vide n'a aucune raison de penser à la plateforme à cet
 * instant précis — le seul où la publication lui est évidente. C'est le moteur
 * direct de la métrique unique du produit.
 *
 * Deux garde-fous de conception, délibérés :
 *
 * 1. **Une échappatoire obligatoire.** Sans « Plus tard », l'amorce serait
 *    perçue comme une relance publicitaire et désactivée mentalement dès la
 *    deuxième apparition.
 * 2. **Une règle de non-répétition.** Refuser l'amorce sur une mission la fait
 *    disparaître pour cette mission, définitivement. Elle est stockée par
 *    identifiant de mission, côté navigateur : c'est une préférence d'affichage
 *    locale, pas une donnée métier, et une perte de stockage ne coûte qu'une
 *    réapparition.
 */

interface Props {
  /** Mission qui vient d'être livrée — sert de clé de non-répétition. */
  missionId: number;
  /** Gouvernorat de livraison : le point de départ du retour. */
  depuis: string;
  /** Gouvernorat d'origine de la mission : la destination probable du retour. */
  vers: string;
}

const PREFIXE_STOCKAGE = "transporti_amorce_retour_refusee_";

/**
 * Lecture défensive : un navigateur en navigation privée, ou avec le stockage
 * bloqué, lève à l'accès. On préfère réafficher l'amorce que casser l'écran.
 */
function estRefusee(missionId: number): boolean {
  try {
    return (
      window.localStorage.getItem(`${PREFIXE_STOCKAGE}${missionId}`) === "1"
    );
  } catch {
    return false;
  }
}

function memoriserRefus(missionId: number): void {
  try {
    window.localStorage.setItem(`${PREFIXE_STOCKAGE}${missionId}`, "1");
  } catch {
    // Sans stockage, l'amorce réapparaîtra. Acceptable : c'est une préférence
    // d'affichage, pas un engagement.
  }
}

export default function ReturnPromptBanner({ missionId, depuis, vers }: Props) {
  const router = useRouter();
  // Rendu côté client uniquement : `localStorage` n'existe pas au premier
  // rendu serveur, et afficher puis masquer produirait un clignotement.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!estRefusee(missionId));
  }, [missionId]);

  if (!visible) return null;

  // Le corridor est inversé : le transporteur a livré à `depuis`, il rentre
  // vers `vers`. Les deux gouvernorats sont passés au formulaire, qui n'aura
  // donc aucune saisie d'itinéraire à demander.
  const publier = () => {
    const parametres = new URLSearchParams({
      depuis,
      vers,
      quand: "aujourdhui",
    });
    router.push(`/retours/nouveau?${parametres.toString()}`);
  };

  const plusTard = () => {
    memoriserRefus(missionId);
    setVisible(false);
  };

  return (
    <section
      data-testid="mission-amorce-retour"
      aria-labelledby="amorce-retour-titre"
      className="rounded-xl border-2 border-cta-500 bg-cta-50 p-5"
    >
      <div className="flex items-start gap-3">
        <RotateCcw
          className="w-5 h-5 text-cta-600 shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h3
            id="amorce-retour-titre"
            className="font-bold text-cta-700 text-lg"
          >
            Vous rentrez à {vers} à vide ?
          </h3>
          <p className="text-sm text-cta-700/90 mt-1">
            Publiez votre retour en 30 secondes. Votre véhicule et sa capacité
            sont déjà renseignés.
          </p>
        </div>
      </div>

      <p className="mt-4 px-3 py-2 rounded-lg bg-white/70 text-sm font-semibold text-neutral-800 inline-flex items-center gap-2">
        {depuis}
        <ArrowRight
          className="w-3.5 h-3.5 text-neutral-400"
          aria-hidden="true"
        />
        {vers}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="mission-amorce-publier"
          onClick={publier}
          className="px-5 py-2.5 rounded-xl bg-cta-500 text-white font-bold hover:bg-cta-600 focus-visible:ring-2 focus-visible:ring-cta-500/40 outline-none"
        >
          Publier mon retour
        </button>

        {/* Échappatoire : discrète mais toujours présente. */}
        <button
          type="button"
          data-testid="mission-amorce-plus-tard"
          onClick={plusTard}
          className="px-3 py-2.5 text-sm text-neutral-500 hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-neutral-400/40 outline-none rounded-lg"
        >
          Plus tard
        </button>
      </div>
    </section>
  );
}
