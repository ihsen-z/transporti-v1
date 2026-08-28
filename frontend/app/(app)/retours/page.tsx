"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ReturnTripRow from "@/components/return-trips/ReturnTripRow";
import {
  duplicateReturnTrip,
  extendReturnTrip,
  getMyReturnTrips,
  unpublishReturnTrip,
  type ReturnTrip,
} from "@/lib/services/returnTrips";

/**
 * T1.3 — Mes trajets publiés, l'inventaire du transporteur.
 *
 * Classé **Core** par le pivot : « un inventaire non gérable pollue la
 * recherche client ». C'est aussi la destination de la redirection après
 * publication, qui pointait provisoirement vers /jobs.
 *
 * Cette page compose : toute la logique réseau vit dans
 * `lib/services/returnTrips.ts` (CLAUDE.md §4).
 */
export default function MesRetoursPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [trajets, setTrajets] = useState<ReturnTrip[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [enCours, setEnCours] = useState<number | null>(null);
  const [aDepublier, setADepublier] = useState<ReturnTrip | null>(null);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      setTrajets(await getMyReturnTrips());
    } catch {
      setErreur(true);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  /** Exécute une action sur une ligne, puis recharge l'inventaire. */
  const agir = async (
    trajet: ReturnTrip,
    action: () => Promise<unknown>,
    succes: string,
  ) => {
    setEnCours(trajet.id);
    try {
      await action();
      showToast("success", succes);
      await charger();
    } catch {
      showToast("error", "L'action n'a pas abouti. Réessayez.");
    } finally {
      setEnCours(null);
    }
  };

  const onEditer = (trajet: ReturnTrip) =>
    router.push(`/retours/nouveau?edit=${trajet.id}`);

  const onProlonger = (trajet: ReturnTrip) =>
    agir(
      trajet,
      () => extendReturnTrip(trajet),
      "Trajet prolongé d'une semaine.",
    );

  const onDupliquer = (trajet: ReturnTrip) =>
    agir(
      trajet,
      () => duplicateReturnTrip(trajet),
      "Trajet dupliqué à la semaine suivante.",
    );

  const confirmerDepublication = async () => {
    if (!aDepublier) return;
    const trajet = aDepublier;
    setADepublier(null);
    await agir(
      trajet,
      () => unpublishReturnTrip(trajet.id),
      "Trajet dépublié.",
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-brand-600" aria-hidden="true" />
            Mes retours publiés
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Un trajet expiré disparaît de la recherche client.
          </p>
        </div>
        <Link
          href="/retours/nouveau"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cta-500 text-white font-semibold hover:bg-cta-600 focus-visible:ring-2 focus-visible:ring-cta-500/40 outline-none"
        >
          <PlusCircle className="w-4 h-4" aria-hidden="true" />
          Publier un retour
        </Link>
      </header>

      {trajets === null && !erreur && (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      )}

      {erreur && (
        <div className="border border-neutral-200 rounded-xl p-6 text-center">
          <p className="text-neutral-700">
            Impossible de charger vos trajets pour le moment.
          </p>
          <button
            type="button"
            onClick={() => void charger()}
            className="mt-3 px-4 py-2 rounded-lg border border-neutral-200 text-sm font-medium hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-600/30 outline-none"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* État vide : jamais un cul-de-sac (IA-3). La publication est la seule
          action évidente à ce stade, donc la seule proposée. */}
      {trajets?.length === 0 && (
        <div
          data-testid="retours-vide"
          className="border border-neutral-200 rounded-xl p-8 text-center"
        >
          <p className="font-semibold text-neutral-900">
            Vous n&apos;avez aucun retour en ligne.
          </p>
          <p className="text-sm text-neutral-500 mt-1 mb-5">
            Publiez le trajet que vous faites déjà : les clients du corridor le
            verront.
          </p>
          <Link
            href="/retours/nouveau"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cta-500 text-white font-semibold hover:bg-cta-600 focus-visible:ring-2 focus-visible:ring-cta-500/40 outline-none"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            Publier mon premier retour
          </Link>
        </div>
      )}

      {trajets && trajets.length > 0 && (
        <div data-testid="retours-liste" className="space-y-3">
          {trajets.map((trajet) => (
            <ReturnTripRow
              key={trajet.id}
              trajet={trajet}
              enCours={enCours === trajet.id}
              onEditer={onEditer}
              onProlonger={onProlonger}
              onDupliquer={onDupliquer}
              onDepublier={setADepublier}
            />
          ))}
        </div>
      )}

      {/* Dépublier rejette et notifie les demandes en attente : la conséquence
          est annoncée avant, pas découverte après. */}
      <ConfirmModal
        open={aDepublier !== null}
        title="Dépublier ce trajet ?"
        message={
          aDepublier
            ? `${aDepublier.pickup_governorate} → ${aDepublier.dropoff_governorate} ne sera plus visible dans la recherche. Les demandes en attente sur ce trajet seront refusées et leurs clients prévenus.`
            : ""
        }
        confirmLabel="Dépublier"
        cancelLabel="Annuler"
        confirmColor="red"
        onConfirm={() => void confirmerDepublication()}
        onCancel={() => setADepublier(null)}
      />
    </div>
  );
}
