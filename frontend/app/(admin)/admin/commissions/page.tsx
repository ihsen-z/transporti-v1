"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Lock, RefreshCw } from "lucide-react";
import { getErrorMessage } from "@/lib/api/client";
import {
  getDettesCommission,
  reglerDetteTransporteur,
  type DetteTransporteur,
  type DettesCommission,
} from "@/lib/services/adminCommissions";

// Écran du pilote : qui doit combien de commission sur les courses payées en
// espèces, qui est bloqué, et le geste qui le débloque une fois payé.
// Le motif est obligatoire (10 caractères) : il part dans le journal d'audit.

const MOTIF_MIN = 10;

function formatTnd(montant: number): string {
  return `${montant.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} TND`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

export default function AdminCommissionsPage() {
  const [donnees, setDonnees] = useState<DettesCommission | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [aRegler, setARegler] = useState<DetteTransporteur | null>(null);
  const [motif, setMotif] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      setDonnees(await getDettesCommission());
    } catch (e) {
      setErreur(getErrorMessage(e) ?? "Chargement impossible.");
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const confirmer = async () => {
    if (!aRegler || motif.trim().length < MOTIF_MIN) return;
    setEnCours(true);
    setErreur(null);
    try {
      const r = await reglerDetteTransporteur(
        aRegler.transporter_id,
        motif.trim(),
      );
      setSucces(
        `${aRegler.name} : ${formatTnd(r.settled_total)} réglés (${r.settled_count} course(s)). Il peut de nouveau publier et accepter.`,
      );
      setARegler(null);
      setMotif("");
      await charger();
    } catch (e) {
      setErreur(getErrorMessage(e) ?? "Règlement impossible.");
    } finally {
      setEnCours(false);
    }
  };

  const bloques = donnees?.results.filter((d) => d.blocked).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[21px] font-extrabold tracking-heading text-ink-900 dark:text-white">
            Commissions
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Commissions dues sur les courses payées en espèces
            {donnees ? ` — plafond ${formatTnd(donnees.limit)}` : ""}
          </p>
        </div>
        <button
          onClick={() => void charger()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {succes ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> {succes}
        </div>
      ) : null}
      {erreur ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {erreur}
        </div>
      ) : null}

      {!donnees ? (
        <p className="text-neutral-500">Chargement…</p>
      ) : donnees.results.length === 0 ? (
        <p className="rounded-xl border border-neutral-200 bg-white px-4 py-6 text-center text-neutral-600">
          Aucune commission en attente : tous les transporteurs sont à jour.
        </p>
      ) : (
        <>
          <p className="text-sm text-neutral-600">
            {donnees.results.length} transporteur(s) doivent une commission,
            dont {bloques} bloqué(s).
          </p>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Transporteur</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Dû</th>
                  <th className="px-4 py-3 font-medium">Depuis</th>
                  <th className="px-4 py-3 font-medium">État</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {donnees.results.map((d) => (
                  <tr
                    key={d.transporter_id}
                    className="border-t border-neutral-100"
                    data-testid={`dette-${d.transporter_id}`}
                  >
                    <td className="px-4 py-3 font-medium text-ink-900">
                      {d.name}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {d.phone ?? "—"}
                      <div className="text-xs text-neutral-400">{d.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink-900">
                      {formatTnd(d.total)}
                      <div className="text-xs font-normal text-neutral-400">
                        {d.count} course(s)
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {formatDate(d.oldest_at)}
                    </td>
                    <td className="px-4 py-3">
                      {d.blocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                          <Lock className="w-3 h-3" /> Bloqué
                        </span>
                      ) : (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                          Actif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        data-testid={`regler-${d.transporter_id}`}
                        onClick={() => {
                          setSucces(null);
                          setARegler(d);
                        }}
                        className="whitespace-nowrap rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                      >
                        Marquer réglé
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {aRegler ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl flex flex-col gap-4">
            <h2 className="text-lg font-bold text-ink-900">
              Régler la commission de {aRegler.name}
            </h2>
            <p className="text-sm text-neutral-600">
              {formatTnd(aRegler.total)} sur {aRegler.count} course(s).
              Confirmez seulement après avoir reçu le paiement : le transporteur
              est débloqué aussitôt.
            </p>
            <label className="flex flex-col gap-1 text-sm text-neutral-700">
              Motif (journal d&apos;audit)
              <input
                data-testid="regler-motif"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Ex. Règlement D17 du 26/10, réf. 123456"
                className="rounded-lg border border-neutral-300 px-3 py-2"
              />
              <span className="text-xs text-neutral-400">
                {MOTIF_MIN} caractères minimum
              </span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setARegler(null);
                  setMotif("");
                }}
                disabled={enCours}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-700"
              >
                Annuler
              </button>
              <button
                data-testid="regler-confirmer"
                onClick={() => void confirmer()}
                disabled={enCours || motif.trim().length < MOTIF_MIN}
                className="flex-1 rounded-xl bg-blue-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {enCours ? "Règlement…" : "Confirmer le règlement"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
