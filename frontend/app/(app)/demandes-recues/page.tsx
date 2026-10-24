"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import ReceivedRequestCard from "@/components/return-trips/ReceivedRequestCard";
import {
  ONGLETS,
  acceptRequest,
  counterRequest,
  getReceivedRequests,
  rejectRequest,
  type OngletId,
  type TripRequest,
} from "@/lib/services/tripRequests";

/**
 * T2.1 — Demandes reçues, tous trajets confondus.
 *
 * Jusqu'ici les demandes n'étaient lisibles que trajet par trajet : un
 * transporteur avec trois retours en ligne devait visiter trois écrans pour
 * savoir ce qui attendait sa décision. C'est le principe IA-4 — une seule
 * boîte de réception par rôle.
 *
 * Le tri primaire est **qui doit agir maintenant**, pas la date : « à décider »
 * d'abord, « en négociation » ensuite, archives en dernier.
 *
 * Cette page compose ; la logique réseau vit dans `lib/services/tripRequests.ts`.
 */

const LIBELLES: Record<OngletId, string> = {
  "a-decider": "À décider",
  negociation: "En négociation",
  archivees: "Archivées",
};

export default function DemandesRecuesPage() {
  const { showToast } = useToast();

  const [onglet, setOnglet] = useState<OngletId>("a-decider");
  const [demandes, setDemandes] = useState<TripRequest[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [enCours, setEnCours] = useState<number | null>(null);

  // Compteurs des deux onglets actionnables. Chargés indépendamment de
  // l'onglet courant : le transporteur doit voir ce qui l'attend ailleurs
  // sans avoir à y aller.
  const [compteurs, setCompteurs] = useState<Record<string, number>>({});

  const chargerCompteurs = useCallback(async () => {
    try {
      const [aDecider, negociation] = await Promise.all([
        getReceivedRequests(ONGLETS["a-decider"]),
        getReceivedRequests(ONGLETS.negociation),
      ]);
      setCompteurs({
        "a-decider": aDecider.length,
        negociation: negociation.length,
      });
    } catch {
      // Un compteur absent vaut mieux qu'un compteur faux : on n'affiche rien
      // plutôt qu'un zéro qui mentirait.
      setCompteurs({});
    }
  }, []);

  const charger = useCallback(async () => {
    setErreur(false);
    setDemandes(null);
    try {
      setDemandes(await getReceivedRequests(ONGLETS[onglet]));
    } catch {
      setErreur(true);
    }
  }, [onglet]);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    void chargerCompteurs();
  }, [chargerCompteurs]);

  const agir = async (
    demande: TripRequest,
    action: () => Promise<unknown>,
    succes: string,
  ) => {
    setEnCours(demande.id);
    try {
      await action();
      showToast("success", succes);
      await Promise.all([charger(), chargerCompteurs()]);
    } catch {
      showToast("error", "L'action n'a pas abouti. Réessayez.");
    } finally {
      setEnCours(null);
    }
  };

  // Contre-proposition : un prix est requis, donc une saisie, donc un dialogue.
  const [contreProposition, setContreProposition] =
    useState<TripRequest | null>(null);
  const [prix, setPrix] = useState("");

  const envoyerContreProposition = async () => {
    const demande = contreProposition;
    const montant = parseFloat(prix);
    if (!demande || !Number.isFinite(montant) || montant <= 0) return;
    setContreProposition(null);
    setPrix("");
    await agir(
      demande,
      () => counterRequest(demande.id, montant),
      "Contre-proposition envoyée.",
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <header className="mb-6">
        {/* Titre retire : le bandeau bleu l annonce deja (charte §4).
            Seul le sous-titre reste, il porte une information neuve. */}
        <p className="text-[14px] text-ink-500">
          Toutes vos demandes, tous trajets confondus.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Filtrer les demandes"
        className="flex flex-wrap gap-2 mb-5"
      >
        {(Object.keys(ONGLETS) as OngletId[]).map((cle) => {
          const actif = onglet === cle;
          const compteur = compteurs[cle];
          return (
            <button
              key={cle}
              type="button"
              role="tab"
              aria-selected={actif}
              data-testid={`demandes-recues-onglet-${cle}`}
              onClick={() => setOnglet(cle)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border focus-visible:ring-2 focus-visible:ring-blue-700/30 outline-none ${
                actif
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {LIBELLES[cle]}
              {compteur !== undefined && compteur > 0 && (
                <span className="ms-2 tabular-nums">· {compteur}</span>
              )}
            </button>
          );
        })}
      </div>

      {demandes === null && !erreur && (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-32 rounded-card" />
          ))}
        </div>
      )}

      {erreur && (
        <div className="border border-neutral-200 rounded-xl p-6 text-center">
          <p className="text-neutral-700">
            Impossible de charger vos demandes pour le moment.
          </p>
          <button
            type="button"
            onClick={() => void charger()}
            className="mt-3 px-4 py-2 rounded-lg border border-neutral-200 text-sm font-medium hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-blue-700/30 outline-none"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* État vide sans cul-de-sac (IA-3) : sans demande, la sortie utile est
          de publier un retour de plus, pas de rester là. */}
      {demandes?.length === 0 && (
        <div
          data-testid="demandes-recues-vide"
          className="border border-neutral-200 rounded-xl p-8 text-center"
        >
          <p className="font-semibold text-neutral-900">
            {onglet === "a-decider"
              ? "Aucune demande n'attend votre décision."
              : "Rien dans cet onglet."}
          </p>
          {onglet === "a-decider" && (
            <>
              <p className="text-sm text-neutral-500 mt-1 mb-5">
                Plus vous avez de retours en ligne, plus vous recevez de
                demandes.
              </p>
              <Link
                href="/retours/nouveau"
                className="cta btn-base min-h-[48px] px-5 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                Publier un retour
              </Link>
            </>
          )}
        </div>
      )}

      {demandes && demandes.length > 0 && (
        <div
          data-testid="demandes-recues-liste"
          className="flex flex-col gap-3"
        >
          {demandes.map((demande) => (
            <ReceivedRequestCard
              key={demande.id}
              demande={demande}
              enCours={enCours === demande.id}
              lectureSeule={onglet === "archivees"}
              onAccepter={(d) =>
                void agir(
                  d,
                  () => acceptRequest(d.id),
                  "Demande acceptée. Le client va payer.",
                )
              }
              onContreProposer={(d) => {
                setPrix(d.proposed_price);
                setContreProposition(d);
              }}
              onRefuser={(d) =>
                void agir(d, () => rejectRequest(d.id), "Demande refusée.")
              }
            />
          ))}
        </div>
      )}

      <Modal
        open={contreProposition !== null}
        onClose={() => setContreProposition(null)}
        title="Contre-proposer un prix"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            {contreProposition?.client_name} propose{" "}
            <strong className="tabular-nums">
              {contreProposition?.proposed_price} DT
            </strong>
            . Votre contre-proposition lui sera envoyée pour accord.
          </p>

          <Input
            id="contre-proposition-prix"
            data-testid="contre-proposition-prix"
            type="number"
            min="1"
            step="1"
            label="Votre prix (DT)"
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
          />

          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => setContreProposition(null)}
            >
              Annuler
            </Button>
            <Button
              data-testid="contre-proposition-submit"
              onClick={() => void envoyerContreProposition()}
            >
              Envoyer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
