import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  Send,
  XCircle,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { countActiveOffers, submitOffer } from "@/lib/services/offers";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import { usePaymentConfig } from "@/hooks/usePaymentConfig";
import { formatTND } from "@/lib/format";

interface OfferFormProps {
  jobId: number;
  jobType?: string;
  /** Commission rate served by the API (job.commission_rate) — single source of truth. */
  commissionRate?: number | null;
  priceTndMin?: number;
  priceTndMax?: number;
  onOfferSubmitted: () => void;
}

type FeedbackType = "success" | "error" | "warning" | null;

const MAX_PRICE_NET = 100_000;

export function OfferForm({
  jobId,
  commissionRate,
  priceTndMin,
  priceTndMax,
  onOfferSubmitted,
}: OfferFormProps) {
  const { t: allT } = useAppI18n();
  // Plafond espèces du serveur, cité dans la note sous le prix.
  const { cod_max_amount } = usePaymentConfig();
  const t = allT.offerForm;

  const [priceNet, setPriceNet] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  // Active offers tracking (L1 — max 3 offers UX)
  const MAX_ACTIVE_OFFERS = 3;
  const [activeOfferCount, setActiveOfferCount] = useState<number | null>(null);
  const isAtLimit =
    activeOfferCount !== null && activeOfferCount >= MAX_ACTIVE_OFFERS;
  const isNearLimit =
    activeOfferCount !== null &&
    activeOfferCount >= MAX_ACTIVE_OFFERS - 1 &&
    !isAtLimit;

  // UI Feedback state (replaces alert())
  const [feedback, setFeedback] = useState<{
    type: FeedbackType;
    message: string;
  }>({ type: null, message: "" });

  // D1 (net garanti): the rate comes from the API only — no local constants,
  // no local formula deciding what is stored. Display-only derivation below.
  const rate = typeof commissionRate === "number" ? commissionRate : null;
  const commissionPct = rate !== null ? Math.round(rate * 100) : null;

  const net = parseFloat(priceNet);
  const netValid = !Number.isNaN(net) && net > 0 && net <= MAX_PRICE_NET;
  const commission = rate !== null && netValid ? net * rate : 0;
  const total = netValid ? net + commission : 0;

  const priceError = !touched
    ? null
    : priceNet === ""
      ? null
      : Number.isNaN(net) || net <= 0
        ? t.priceInvalid
        : net > MAX_PRICE_NET
          ? t.priceTooHigh
          : null;

  const budgetExceeded =
    netValid &&
    rate !== null &&
    typeof priceTndMax === "number" &&
    priceTndMax > 0 &&
    total > priceTndMax;

  // Fetch active offer count on mount (L1 pre-check).
  // Uses the transporter-scoped endpoint with the ?status filter and reads
  // the paginated `count` (results.length would cap at page size).
  useEffect(() => {
    const fetchActiveOffers = async () => {
      try {
        setActiveOfferCount(await countActiveOffers());
      } catch (_err) {
        // Non-blocking: if fetch fails, allow form submission and let backend validate
        setActiveOfferCount(null);
      }
    };
    fetchActiveOffers();
  }, []);

  // Auto-dismiss feedback after 6s
  useEffect(() => {
    if (feedback.type) {
      const timer = setTimeout(
        () => setFeedback({ type: null, message: "" }),
        6000,
      );
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!netValid) return;
    setLoading(true);
    setFeedback({ type: null, message: "" });

    try {
      // D1 net garanti: submit the NET amount; the server computes
      // commission and client total (single source of truth).
      await submitOffer(
        jobId,
        parseFloat(net.toFixed(2)),
        message,
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      );

      setFeedback({
        type: "success",
        message: t.success,
      });
      setPriceNet("");
      setMessage("");
      setTouched(false);
      onOfferSubmitted();
    } catch (error: unknown) {
      console.error("Error submitting offer:", error);

      if (error instanceof ApiError) {
        const body = error.body as Record<string, unknown> | undefined;

        if (error.status === 403) {
          // Verification or role issue
          setFeedback({
            type: "warning",
            message: t.errorVerification,
          });
        } else if (error.status === 400 && body) {
          // Duplicate offer gets a dedicated localized message
          const bodyText = JSON.stringify(body);
          if (
            bodyText.includes("already submitted") ||
            bodyText.includes("déjà soumis")
          ) {
            setFeedback({ type: "error", message: t.alreadySubmitted });
          } else {
            // Validation errors from serializer
            const messages: string[] = [];
            for (const [, val] of Object.entries(body)) {
              if (Array.isArray(val)) {
                messages.push(...val.map((v) => String(v)));
              } else if (typeof val === "string") {
                messages.push(val);
              }
            }
            setFeedback({
              type: "error",
              message: messages.join(" ") || t.errorValidation,
            });
          }
        } else {
          setFeedback({
            type: "error",
            message: t.errorServer,
          });
        }
      } else {
        setFeedback({
          type: "error",
          message: t.errorNetwork,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[17px] font-extrabold tracking-heading text-ink-900 flex items-center gap-2">
          <Send className="w-5 h-5 text-brand-600" />
          {t.submitOffer}
        </h3>
        {activeOfferCount !== null && (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isAtLimit
                ? "bg-error-100 text-error-700"
                : isNearLimit
                  ? "bg-warning-100 text-warning-700"
                  : "bg-green-100 text-green-700"
            }`}
          >
            {activeOfferCount}/{MAX_ACTIVE_OFFERS}{" "}
            {t.activeOffersLimit
              .replace("{{count}}", "")
              .replace("{{max}}", "")
              .trim()}
          </span>
        )}
      </div>

      {/* L1: Limit warning banner */}
      {isAtLimit && (
        <div className="mb-4 p-3 rounded-lg bg-error-50 text-error-700 border border-error-200 flex items-start gap-2 text-sm">
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">
              {t.limitReachedTitle} ({MAX_ACTIVE_OFFERS}/{MAX_ACTIVE_OFFERS})
            </p>
            <p>{t.limitReachedDesc}</p>
          </div>
        </div>
      )}
      {isNearLimit && (
        <div className="mb-4 p-3 rounded-lg bg-warning-50 text-warning-800 border border-warning-200 flex items-start gap-2 text-sm">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{t.nearLimitDesc}</span>
        </div>
      )}

      {/* Inline feedback banner */}
      {feedback.type && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : feedback.type === "warning"
                ? "bg-warning-50 text-warning-800 border border-warning-200"
                : "bg-error-50 text-error-700 border border-error-200"
          }`}
        >
          {feedback.type === "success" && (
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          {feedback.type === "warning" && (
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          {feedback.type === "error" && (
            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <div>
          <label className="label mb-[7px]">{t.netTariff}</label>
          <div className="relative">
            <input
              type="number"
              min="1"
              step="0.1"
              required
              value={priceNet}
              onChange={(e) => {
                setPriceNet(e.target.value);
                setTouched(true);
              }}
              onBlur={() => setTouched(true)}
              aria-invalid={!!priceError}
              className={`w-full ps-3 pe-12 py-3 border rounded-lg focus:ring-2 font-bold text-lg ${
                priceError
                  ? "border-red-400 focus:ring-red-400"
                  : "focus:ring-blue-700"
              }`}
              placeholder="0.00"
            />
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">
              TND
            </span>
          </div>
          {/* A4: inline price validation */}
          {priceError && (
            <p className="mt-1.5 text-xs font-medium text-error-600 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {priceError}
            </p>
          )}
          {/* P1-04: Budget indicatif du client */}
          {(priceTndMin || priceTndMax) && (
            <div className="mt-2 p-2.5 bg-blue-50 rounded-tile flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                {t.indicativeBudget}{" "}
                <span className="font-semibold">
                  {priceTndMin && priceTndMax
                    ? `${formatTND(Number(priceTndMin) || 0)} — ${formatTND(Number(priceTndMax) || 0)}`
                    : priceTndMin
                      ? `${t.from} ${formatTND(Number(priceTndMin) || 0)}`
                      : `${t.upTo} ${formatTND(Number(priceTndMax) || 0)}`}
                </span>
              </p>
            </div>
          )}
          {/* A4: non-blocking warning when the client total exceeds the budget */}
          {budgetExceeded && (
            <div className="mt-2 p-2.5 bg-warning-50 rounded-tile flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-warning-700">
                {t.budgetExceededWarning}
              </p>
            </div>
          )}
          {/* P2-10: COD threshold note */}
          <p className="mt-1.5 inline-flex items-start gap-1.5 text-[12.5px] text-ink-500">
            <Lightbulb
              className="mt-px h-3.5 w-3.5 flex-shrink-0"
              strokeWidth={2}
            />
            {interpolate(t.codNote, { cap: cod_max_amount })}
          </p>
        </div>

        {/* Pricing Breakdown — display-only, rate served by the API */}
        {rate !== null && (
          <div className="bg-neutral-50 rounded-lg p-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-neutral-600">
              <span>
                {t.platformCommission} ({commissionPct}%)
              </span>
              <span>{formatTND(commission)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
              <span className="font-semibold text-neutral-900">
                {t.totalPrice}
              </span>
              <span className="font-bold text-xl text-brand-600">
                {formatTND(total)}
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="label mb-[7px]">{t.messageLabel}</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.messagePlaceholder}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-700 h-24"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !netValid || isAtLimit}
          className="w-full py-3 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? t.sending : t.sendOffer}
        </button>
      </form>
    </div>
  );
}
