"use client";

/**
 * Portefeuille transporteur en mode « espèces seules ».
 *
 * Le client paie le transporteur en espèces à la livraison : il n'y a ni
 * solde à retirer, ni séquestre, ni demande de retrait. Il reste UNE chose
 * indispensable à suivre : la commission due à Transporti, et le plafond
 * au-delà duquel le serveur refuse toute nouvelle mission (COMMISSION_DEBT_LIMIT).
 *
 * Mêmes chiffres que l'écran complet (GET /api/wallet/), seulement filtrés.
 */
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { Portefeuille } from "@/lib/services/wallet";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import { formatTND } from "@/lib/format";
import { urlJob } from "@/lib/routes/jobs";

interface CommissionDebtViewProps {
  data: Portefeuille;
  /** Plafond de dette fixé par le serveur (DT). */
  plafond: number;
  onRefresh: () => void;
}

export function CommissionDebtView({
  data,
  plafond,
  onRefresh,
}: CommissionDebtViewProps) {
  const { t: allT } = useAppI18n();
  const t = allT.wallet;
  const reste = Math.max(0, plafond - data.cod_debt);
  // Le serveur décide du blocage (strictement au-delà du plafond). Comparer
  // ici avec >= annonçait « plafond atteint » à 60 / 60 alors que le
  // transporteur pouvait encore accepter une mission.
  const plafondAtteint = data.blocked_for_debt ?? data.cod_debt > plafond;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-[14.5px] leading-[1.55] text-ink-500">
          {t.cashSubtitle}
        </p>
        <button
          onClick={onRefresh}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-chip px-2.5 py-1.5 text-[13px] font-semibold text-ink-500 transition-colors hover:bg-app hover:text-blue-700"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2} />
          {t.refresh}
        </button>
      </div>

      {/* Dette et plafond : les deux chiffres qui décident si le transporteur
          peut encore accepter une mission. */}
      <div
        data-testid="portefeuille-commission"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
      >
        <div className="bg-surface rounded-card shadow-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-2">
            {t.codDebt}
          </p>
          <p className="text-2xl font-bold text-error-500">
            {formatTND(data.cod_debt)}
          </p>
          <p className="text-xs text-neutral-400 mt-1">{t.codDebtHint}</p>
        </div>
        <div className="bg-surface rounded-card shadow-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-2">
            {t.debtLimitLabel}
          </p>
          <p className="text-2xl font-bold text-ink-900">
            {formatTND(plafond)}
          </p>
          <p
            className={`text-xs mt-1 ${plafondAtteint ? "font-semibold text-error-600" : "text-neutral-400"}`}
          >
            {plafondAtteint
              ? t.debtReached
              : interpolate(t.debtRemaining, { amount: formatTND(reste) })}
          </p>
        </div>
      </div>
      <p className="text-xs text-neutral-500 mb-6">{t.debtLimitHint}</p>

      {data.cod_debts.length > 0 ? (
        <div className="bg-warning-50 rounded-tile p-5">
          <h3 className="text-sm font-semibold text-warning-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {t.codDebtsTitle}
          </h3>
          <ul className="text-sm text-warning-700 flex flex-col gap-1">
            {data.cod_debts.map((c) => (
              <li key={c.job_id} className="flex justify-between">
                <Link
                  href={urlJob(c.job_id, c.is_return_trip)}
                  className="hover:underline"
                >
                  {t.mission} #{c.job_id}
                </Link>
                <span className="font-semibold">{formatTND(c.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-warning-600 mt-2">{t.codDebtsCashHint}</p>
        </div>
      ) : (
        <p className="text-sm text-neutral-400 py-8 text-center">{t.noDebt}</p>
      )}
    </div>
  );
}
