import React, { useState, useEffect } from "react";
import { Send, CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/client";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

interface OfferFormProps {
  jobId: number;
  jobType?: string;
  priceTndMin?: number;
  priceTndMax?: number;
  onOfferSubmitted: () => void;
}

type FeedbackType = "success" | "error" | "warning" | null;

export function OfferForm({
  jobId,
  jobType,
  priceTndMin,
  priceTndMax,
  onOfferSubmitted,
}: OfferFormProps) {
  const { t: allT } = useAppI18n();
  const t = allT.offerForm;

  const [priceNet, setPriceNet] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [commission, setCommission] = useState(0);
  const [total, setTotal] = useState(0);

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

  // Dynamic commission rate matching backend settings.COMMISSION_RATES
  const COMMISSION_RATES: Record<string, number> = {
    TRANSPORT: 0.12,
    MOVING: 0.15,
    DEFAULT: 0.12,
  };
  const commissionRate =
    COMMISSION_RATES[jobType || "DEFAULT"] || COMMISSION_RATES.DEFAULT;
  const commissionPct = Math.round(commissionRate * 100);

  // Fetch active offer count on mount (L1 pre-check)
  useEffect(() => {
    const fetchActiveOffers = async () => {
      try {
        const data = await apiClient.get<{ results?: { status: string }[] }>(
          "/api/offers/?status=PENDING&page_size=10",
        );
        const results =
          (data as { results?: { status: string }[] }).results || [];
        setActiveOfferCount(results.length);
      } catch (_err) {
        // Non-blocking: if fetch fails, allow form submission and let backend validate
        setActiveOfferCount(null);
      }
    };
    fetchActiveOffers();
  }, []);

  useEffect(() => {
    const net = parseFloat(priceNet) || 0;
    const comm = net * commissionRate;
    setCommission(comm);
    setTotal(net + comm);
  }, [priceNet, commissionRate]);

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
    setLoading(true);
    setFeedback({ type: null, message: "" });

    try {
      // Use apiClient (correct base URL + JWT auth)
      // Send correct keys: job (not job_id), total_price (not price_net)
      await apiClient.post("/api/offers/", {
        job: jobId,
        total_price: parseFloat(total.toFixed(2)),
        message: message,
        valid_until: new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });

      setFeedback({
        type: "success",
        message: t.success,
      });
      setPriceNet("");
      setMessage("");
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
          // Validation errors from serializer
          const messages: string[] = [];
          for (const [key, val] of Object.entries(body)) {
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
        <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <Send className="w-5 h-5 text-brand-600" />
          {t.submitOffer}
        </h3>
        {activeOfferCount !== null && (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isAtLimit
                ? "bg-red-100 text-red-700"
                : isNearLimit
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700"
            }`}
          >
            {activeOfferCount}/{MAX_ACTIVE_OFFERS} {t.activeOffersLimit.replace('{{count}}', '').replace('{{max}}', '').trim()}
          </span>
        )}
      </div>

      {/* L1: Limit warning banner */}
      {isAtLimit && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 border border-red-200 flex items-start gap-2 text-sm">
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">
              {t.limitReachedTitle} ({MAX_ACTIVE_OFFERS}/{MAX_ACTIVE_OFFERS})
            </p>
            <p>
              {t.limitReachedDesc}
            </p>
          </div>
        </div>
      )}
      {isNearLimit && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-start gap-2 text-sm">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            {t.nearLimitDesc}
          </span>
        </div>
      )}

      {/* Inline feedback banner */}
      {feedback.type && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : feedback.type === "warning"
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : "bg-red-50 text-red-800 border border-red-200"
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            {t.netTariff}
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              step="0.1"
              required
              value={priceNet}
              onChange={(e) => setPriceNet(e.target.value)}
              className="w-full ps-3 pe-12 py-3 border rounded-lg focus:ring-2 focus:ring-accent-500 font-bold text-lg"
              placeholder="0.00"
            />
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">
              TND
            </span>
          </div>
          {/* P1-04: Budget indicatif du client */}
          {(priceTndMin || priceTndMax) && (
            <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                {t.indicativeBudget}{" "}
                <span className="font-semibold">
                  {priceTndMin && priceTndMax
                    ? `${priceTndMin} — ${priceTndMax} TND`
                    : priceTndMin
                      ? `${t.from} ${priceTndMin} TND`
                      : `${t.upTo} ${priceTndMax} TND`}
                </span>
              </p>
            </div>
          )}
          {/* P2-10: COD threshold note */}
          <p className="text-xs text-neutral-400 mt-1.5">
            {t.codNote}
          </p>
        </div>

        {/* Pricing Breakdown */}
        <div className="bg-neutral-50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>{t.platformCommission} ({commissionPct}%)</span>
            <span>{commission.toFixed(2)} TND</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
            <span className="font-semibold text-neutral-900">
              {t.totalPrice}
            </span>
            <span className="font-bold text-xl text-brand-600">
              {total.toFixed(2)} TND
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            {t.messageLabel}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.messagePlaceholder}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-accent-500 h-24"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !priceNet || isAtLimit}
          className="w-full py-3 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? t.sending : t.sendOffer}
        </button>
      </form>
    </div>
  );
}
