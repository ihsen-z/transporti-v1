"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";

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
  /**
   * Gouvernorat de livraison : le point de départ du retour.
   * Chaîne vide quand la mission n'en porte pas — l'amorce ne s'affiche alors
   * pas, voir la note ci-dessous.
   */
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
  const { t } = useAppI18n();
  const libelles = t.returnPrompt;
  // Rendu côté client uniquement : `localStorage` n'existe pas au premier
  // rendu serveur, et afficher puis masquer produirait un clignotement.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!estRefusee(missionId));
  }, [missionId]);

  // Sans gouvernorat de part et d'autre, on n'affiche rien.
  //
  // Constat de la recette du 27/08 : certaines missions n'en portent pas, et
  // un repli sur l'adresse produisait « Vous rentrez à Rue de Marseille, La
  // Marsa à vide ? » — une phrase absurde qui menait de surcroît à un
  // formulaire VIDE, l'adresse ne correspondant à aucun gouvernorat de la
  // liste. Une amorce qui n'économise aucune saisie est pire qu'une absence
  // d'amorce : elle promet 30 secondes et n'en tient rien.
  if (!depuis || !vers) return null;

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
      className="rounded-tile bg-orange-50 p-5"
    >
      <div className="flex items-start gap-3">
        <RotateCcw
          className="mt-0.5 h-5 w-5 shrink-0 text-orange-600"
          strokeWidth={2}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h3
            id="amorce-retour-titre"
            className="text-[17px] font-extrabold tracking-heading text-ink-900"
          >
            {interpolate(libelles.title, { vers })}
          </h3>
          <p className="mt-1 text-[14px] leading-[1.5] text-ink-500">
            {libelles.desc}
          </p>
        </div>
      </div>

      {/* Le corridor : point de depart bleu, point d arrivee vert, comme
          partout ailleurs dans le produit (ligne d itineraire, charte §3). */}
      <p className="mt-4 inline-flex items-center gap-2 rounded-chip bg-surface px-3 py-2 text-[14px] font-bold text-ink-900">
        <span className="route-dot route-dot--start" aria-hidden />
        {depuis}
        <ArrowRight className="h-3.5 w-3.5 text-ink-300" aria-hidden="true" />
        {vers}
        <span className="route-dot route-dot--end" aria-hidden />
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="mission-amorce-publier"
          onClick={publier}
          className="btn-base min-h-[44px] rounded-cta bg-blue-700 px-4 text-[14.5px] text-white shadow-blue transition-colors duration-120 hover:bg-blue-800 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        >
          {libelles.publish}
        </button>

        {/* Échappatoire : discrète mais toujours présente. */}
        <button
          type="button"
          data-testid="mission-amorce-plus-tard"
          onClick={plusTard}
          className="rounded-chip px-3 py-2.5 text-[13px] font-semibold text-ink-500 outline-none transition-colors hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-blue-700/30"
        >
          {libelles.later}
        </button>
      </div>
    </section>
  );
}
