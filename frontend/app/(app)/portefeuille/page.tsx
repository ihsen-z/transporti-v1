"use client";

/**
 * Portefeuille transporteur (Sprint 2 — WS-A A2, décision D4).
 * Solde disponible / en attente / dette COD, historique des mouvements,
 * demande de retrait manuelle (virement traité en back-office).
 * Chiffres servis par GET /api/wallet/ (formules DICTIONNAIRE_KPI K10/K11).
 */
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Banknote,
  AlertTriangle,
  ArrowDownToLine,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import {
  getWallet,
  requestWithdrawal,
  type Portefeuille as WalletData,
} from "@/lib/services/wallet";
import { useAuth } from "@/hooks/useAuth";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { formatTND, formatDateTime } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { ClientWalletView } from "@/components/wallet/ClientWalletView";
import { urlJob } from "@/lib/routes/jobs";

export default function WalletPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t: allT } = useAppI18n();
  const t = allT.wallet;
  const { showToast } = useToast();

  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Withdrawal form
  const [amount, setAmount] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await getWallet());
    } catch (_e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Les hooks s'executent AVANT la bifurcation de role plus bas : sans ce
  // garde, un client declenchait /api/wallet/ — reserve au transporteur — et
  // recoltait deux 403 dans la console avant meme de voir son ecran.
  const estTransporteur = user?.role?.toUpperCase() === "TRANSPORTER";

  useEffect(() => {
    if (!authLoading && estTransporteur) fetchWallet();
  }, [authLoading, estTransporteur, fetchWallet]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const val = parseFloat(amount);
    if (Number.isNaN(val) || val <= 0) {
      setFormError(t.amountInvalid);
      return;
    }
    if (!bankDetails.trim()) {
      setFormError(t.bankDetailsRequired);
      return;
    }
    setSubmitting(true);
    try {
      await requestWithdrawal(val, bankDetails.trim());
      showToast("success", t.withdrawSuccess);
      setAmount("");
      setBankDetails("");
      await fetchWallet();
    } catch (err: unknown) {
      let msg: string = t.withdrawError;
      if (err instanceof ApiError && err.body) {
        const body = err.body as Record<string, unknown>;
        const first = Object.values(body).find(Array.isArray) as
          | string[]
          | undefined;
        if (first?.length) msg = String(first[0]);
      }
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const role = user?.role?.toUpperCase();
  // C5.1 — la meme route sert les deux roles, avec deux ecrans differents.
  // Un client n'a pas de solde a retirer : il veut savoir OU EN EST son
  // argent. L'ecran precedent lui repondait « reserve aux transporteurs ».
  if (!authLoading && role === "CLIENT") {
    return <ClientWalletView />;
  }
  if (!authLoading && role && role !== "TRANSPORTER") {
    return (
      <div className="p-8 text-center text-neutral-500">
        {t.transporterOnly}
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div className="p-8 flex items-center justify-center text-neutral-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <p className="text-neutral-600 mb-4">{t.loadError}</p>
        <button
          onClick={fetchWallet}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          {allT.errors.retry}
        </button>
      </div>
    );
  }

  const WITHDRAWAL_STATUS_LABELS: Record<string, string> = {
    REQUESTED: t.statusRequested,
    PROCESSING: t.statusProcessing,
    PAID: t.statusPaid,
    REJECTED: t.statusRejected,
  };
  const ESCROW_STATUS_LABELS: Record<string, string> = {
    HELD: t.escrowHeld,
    RELEASED: t.escrowReleased,
    REFUNDED: t.escrowRefunded,
    INITIATED: t.escrowInitiated,
    FAILED: t.escrowFailed,
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-[14.5px] leading-[1.55] text-ink-500">
          {t.subtitle}
        </p>
        <button
          onClick={fetchWallet}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-chip px-2.5 py-1.5 text-[13px] font-semibold text-ink-500 transition-colors hover:bg-app hover:text-blue-700"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2} />
          {t.refresh}
        </button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface rounded-card shadow-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-2">
            {t.available}
          </p>
          <p className="text-2xl font-bold text-green-600">
            {formatTND(data.available)}
          </p>
        </div>
        <div className="bg-surface rounded-card shadow-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {t.pending}
          </p>
          <p className="text-2xl font-bold text-warning-600">
            {formatTND(data.pending_net)}
          </p>
          <p className="text-xs text-neutral-400 mt-1">{t.pendingHint}</p>
        </div>
        <div className="bg-surface rounded-card shadow-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-2">
            {t.codDebt}
          </p>
          <p className="text-2xl font-bold text-error-500">
            {formatTND(data.cod_debt)}
          </p>
          <p className="text-xs text-neutral-400 mt-1">{t.codDebtHint}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Withdrawal request */}
        <div className="bg-surface rounded-card shadow-card p-6">
          <h2 className="text-[17px] font-extrabold tracking-heading text-ink-900 mb-4 flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-brand-600" />
            {t.withdrawTitle}
          </h2>
          <p className="text-sm text-neutral-500 mb-4">{t.withdrawDesc}</p>
          <form
            onSubmit={handleWithdraw}
            className="flex flex-col gap-4"
            noValidate
          >
            <div>
              <label className="label mb-[7px]">{t.amountLabel}</label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full ps-3 pe-12 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-700 font-semibold"
                  placeholder="0.00"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-medium">
                  TND
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                {t.maxWithdrawable} {formatTND(Math.max(0, data.available))}
              </p>
            </div>
            <div>
              <label className="label mb-[7px]">{t.bankDetailsLabel}</label>
              <input
                type="text"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-700"
                placeholder={t.bankDetailsPlaceholder}
              />
            </div>
            {formError && (
              <p className="text-xs font-medium text-error-600 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {formError}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || data.available < 10}
              className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? t.submitting : t.withdrawCta}
            </button>
            <p className="text-xs text-neutral-400">{t.withdrawDelay}</p>
          </form>
        </div>

        {/* History */}
        <div className="bg-surface rounded-card shadow-card p-6">
          <h2 className="text-[17px] font-extrabold tracking-heading text-ink-900 mb-4 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-brand-600" />
            {t.historyTitle}
          </h2>
          {data.history.length === 0 ? (
            <p className="text-sm text-neutral-400 py-8 text-center">
              {t.historyEmpty}
            </p>
          ) : (
            <ul className="divide-y divide-line max-h-[420px] overflow-y-auto">
              {data.history.map((h, idx) => (
                <li
                  key={idx}
                  className="py-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    {h.kind === "ESCROW" ? (
                      <>
                        <Link
                          href={urlJob(h.job_id!, h.is_return_trip)}
                          className="text-sm font-medium text-neutral-900 hover:text-brand-600"
                        >
                          {t.mission} #{h.job_id}
                        </Link>
                        <p className="text-xs text-neutral-400">
                          {ESCROW_STATUS_LABELS[h.status] || h.status} ·{" "}
                          {formatDateTime(h.date)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-neutral-900">
                          {t.withdrawal}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {WITHDRAWAL_STATUS_LABELS[h.status] || h.status} ·{" "}
                          {formatDateTime(h.date)}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="text-end flex-shrink-0">
                    {h.kind === "ESCROW" ? (
                      <span
                        className={`text-sm font-bold ${
                          h.status === "RELEASED"
                            ? "text-green-600"
                            : h.status === "REFUNDED" || h.status === "FAILED"
                              ? "text-neutral-400 line-through"
                              : "text-warning-600"
                        }`}
                      >
                        +{formatTND(h.net ?? 0)}
                      </span>
                    ) : (
                      <span
                        className={`text-sm font-bold ${
                          h.status === "REJECTED"
                            ? "text-neutral-400 line-through"
                            : "text-error-500"
                        }`}
                      >
                        −{formatTND(h.amount ?? 0)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* COD debts detail */}
      {data.cod_debts.length > 0 && (
        <div className="mt-6 bg-warning-50 rounded-tile p-5">
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
          <p className="text-xs text-warning-600 mt-2">{t.codDebtsHint}</p>
        </div>
      )}
    </div>
  );
}
