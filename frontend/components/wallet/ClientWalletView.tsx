"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Banknote, Loader2, Lock, RotateCcw, Wallet } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { formatTND, formatDateTime } from "@/lib/format";
import {
  getClientWallet,
  type PortefeuilleClient,
} from "@/lib/services/wallet";

/**
 * C5.1 — le portefeuille du CLIENT.
 *
 * L'audit du plan annonçait « `wallet/` existe, absent de la navigation
 * client ». C'était faux : cet endpoint porte `RequireRole('TRANSPORTER')` et
 * répond 403 à un client. Il manquait donc un endpoint, pas un lien de menu —
 * `/api/client/wallet/` a été écrit pour ce lot.
 *
 * PAS de solde ici : un client n'a rien à retirer. Ce qui le concerne, c'est
 * OÙ EN EST SON ARGENT. Les quatre montants ne s'additionnent PAS, et l'écran
 * le dit explicitement — les cumuler donnerait un chiffre sans réalité
 * comptable. Le backend ne renvoie d'ailleurs aucun total.
 */
export function ClientWalletView() {
  const { t } = useAppI18n();
  const [donnees, setDonnees] = useState<PortefeuilleClient | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(false);
    try {
      setDonnees(await getClientWallet());
    } catch {
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (chargement) {
    return (
      <div className="p-8 flex items-center justify-center text-neutral-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (erreur || !donnees) {
    return (
      <div className="p-8 text-center">
        <p
          data-testid="portefeuille-client-erreur"
          className="text-neutral-500"
        >
          {t.clientWallet.loadError}
        </p>
      </div>
    );
  }

  const tuiles = [
    {
      cle: "held",
      icone: Lock,
      montant: donnees.held,
      libelle: t.clientWallet.held,
      aide: t.clientWallet.heldHint,
    },
    {
      cle: "released",
      icone: Wallet,
      montant: donnees.released,
      libelle: t.clientWallet.released,
      aide: t.clientWallet.releasedHint,
    },
    {
      cle: "refunded",
      icone: RotateCcw,
      montant: donnees.refunded,
      libelle: t.clientWallet.refunded,
      aide: t.clientWallet.refundedHint,
    },
    {
      cle: "cod_pending",
      icone: Banknote,
      montant: donnees.cod_pending,
      libelle: t.clientWallet.codPending,
      aide: t.clientWallet.codPendingHint,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          {t.clientWallet.title}
        </h1>
        <p className="text-neutral-600">{t.clientWallet.subtitle}</p>
      </header>

      <div
        data-testid="portefeuille-client-tuiles"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {tuiles.map(({ cle, icone: Icone, montant, libelle, aide }) => (
          <div
            key={cle}
            data-testid={`portefeuille-client-${cle}`}
            className="bg-white rounded-xl border border-neutral-200 p-4"
          >
            <p className="text-sm text-neutral-500 flex items-center gap-2 mb-1">
              <Icone className="w-4 h-4 text-neutral-400" aria-hidden="true" />
              {libelle}
            </p>
            <p className="text-2xl font-bold text-neutral-900 tabular-nums">
              {formatTND(montant)}
            </p>
            <p className="text-xs text-neutral-500 mt-1">{aide}</p>
          </div>
        ))}
      </div>

      {/* Dit explicitement ce que les tuiles ne doivent PAS suggérer. */}
      <p className="text-xs text-neutral-500">{t.clientWallet.noTotal}</p>

      <section className="bg-white rounded-xl border border-neutral-200 p-5">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">
          {t.clientWallet.historyTitle}
        </h2>

        {donnees.history.length === 0 ? (
          <p
            data-testid="portefeuille-client-historique-vide"
            className="text-neutral-500"
          >
            {t.clientWallet.historyEmpty}
          </p>
        ) : (
          <ul
            data-testid="portefeuille-client-historique"
            className="divide-y divide-neutral-100"
          >
            {donnees.history.map((ligne) => (
              <li
                key={ligne.id}
                data-testid="portefeuille-client-mouvement"
                className="py-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <Link
                    href={`/jobs/${ligne.job_id}`}
                    className="font-medium text-neutral-900 hover:underline"
                  >
                    {ligne.pickup_governorate} &rarr;{" "}
                    {ligne.dropoff_governorate}
                  </Link>
                  <p className="text-sm text-neutral-500">
                    {formatDateTime(ligne.date)}
                  </p>
                </div>
                <div className="text-end">
                  <p className="font-semibold tabular-nums text-neutral-900">
                    {formatTND(ligne.amount)}
                  </p>
                  {/* Le statut vient du serveur tel quel : le traduire en
                      « payé » ou « en attente » ici inventerait une lecture
                      que la machine à états de l'escrow ne garantit pas. */}
                  <p className="text-xs text-neutral-500">{ligne.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
