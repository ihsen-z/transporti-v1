"use client";

/**
 * Owner panel for a return trip (Sprint 3 — WS-F F1/F2, audit C9).
 * Shows received structured requests (accept / reject / counter — D5),
 * lets the owner edit key fields and delete the trip.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Inbox,
  Pencil,
  Trash2,
  Check,
  X,
  ArrowLeftRight,
  Loader2,
  Zap,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/client";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { formatTND, formatDateTime } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { JobDetail } from "@/lib/types/jobs";

interface TripRequest {
  id: number;
  status: string;
  description: string;
  proposed_price: number | string;
  counter_price: number | string | null;
  payment_method: "DIGITAL" | "COD";
  client_name: string;
  created_at: string;
}

interface TripRequestsPanelProps {
  job: JobDetail;
  onChanged: () => void;
}

export function TripRequestsPanel({ job, onChanged }: TripRequestsPanelProps) {
  const { t: allT } = useAppI18n();
  const t = allT.tripOwner;
  const { showToast } = useToast();

  const [requests, setRequests] = useState<TripRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [counterFor, setCounterFor] = useState<number | null>(null);
  const [counterPrice, setCounterPrice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editCapacity, setEditCapacity] = useState(
    job.available_capacity || "",
  );
  const [editPriceMin, setEditPriceMin] = useState(
    String(job.price_tnd_min ?? ""),
  );
  const [editInstant, setEditInstant] = useState(job.instant_booking === true);
  const [saving, setSaving] = useState(false);

  const isPublished = job.status === "PUBLISHED";

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiClient.get<{ results: TripRequest[] }>(
        `/api/jobs/${job.id}/requests/`,
      );
      setRequests(d.results ?? []);
    } catch (_e) {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [job.id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const respond = async (
    requestId: number,
    action: "accept" | "reject" | "counter",
    extra?: Record<string, unknown>,
  ) => {
    setActionLoading(requestId);
    try {
      await apiClient.post(`/api/trip-requests/${requestId}/respond/`, {
        action,
        ...(extra || {}),
      });
      showToast(
        "success",
        action === "accept"
          ? t.acceptSuccess
          : action === "counter"
            ? t.counterSuccess
            : t.rejectSuccess,
      );
      setCounterFor(null);
      setCounterPrice("");
      await fetchRequests();
      onChanged();
    } catch (error) {
      if (error instanceof ApiError && error.body) {
        const body = error.body as Record<string, unknown>;
        const first = Object.values(body).find(
          (v) => typeof v === "string" || Array.isArray(v),
        );
        showToast(
          "error",
          Array.isArray(first)
            ? String(first[0])
            : String(first || t.actionError),
        );
      } else {
        showToast("error", t.actionError);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await apiClient.patch(`/api/jobs/${job.id}/return-trip/`, {
        available_capacity: editCapacity,
        instant_booking: editInstant,
        ...(editPriceMin ? { price_tnd_min: editPriceMin } : {}),
      });
      showToast("success", t.editSuccess);
      setEditing(false);
      onChanged();
    } catch (_e) {
      showToast("error", t.actionError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/api/jobs/${job.id}/return-trip/`);
      showToast("success", t.deleteSuccess);
      setConfirmDelete(false);
      onChanged();
    } catch (_e) {
      showToast("error", t.actionError);
    } finally {
      setDeleting(false);
    }
  };

  const pending = requests.filter(
    (r) => r.status === "PENDING" || r.status === "COUNTERED",
  );

  return (
    <div className="bg-white border border-purple-200 rounded-xl p-5">
      <ConfirmModal
        open={confirmDelete}
        onCancel={() => !deleting && setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={t.deleteTitle}
        message={t.deleteDesc}
        confirmLabel={t.deleteCta}
        loading={deleting}
      />

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-neutral-900 flex items-center gap-2">
          <Inbox className="w-5 h-5 text-purple-600" />
          {t.title}
        </h3>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            job.is_expired
              ? "bg-neutral-200 text-neutral-600"
              : isPublished
                ? "bg-purple-100 text-purple-700"
                : "bg-amber-100 text-amber-700"
          }`}
        >
          {job.is_expired
            ? t.statusExpired
            : isPublished
              ? t.statusPublished
              : job.status}
        </span>
      </div>

      {/* Owner actions */}
      {isPublished && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setEditing(!editing)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50"
          >
            <Pencil className="w-3.5 h-3.5" />
            {t.edit}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t.delete}
          </button>
        </div>
      )}

      {/* Inline edit form */}
      {editing && (
        <div className="mb-4 p-3 bg-purple-50 rounded-xl space-y-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">
              {t.capacityLabel}
            </label>
            <input
              value={editCapacity}
              onChange={(e) => setEditCapacity(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">
              {t.priceLabel}
            </label>
            <input
              type="number"
              min="1"
              value={editPriceMin}
              onChange={(e) => setEditPriceMin(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={editInstant}
              onChange={(e) => setEditInstant(e.target.checked)}
              className="rounded"
            />
            <Zap className="w-4 h-4 text-amber-500" />
            {t.instantBookingLabel}
          </label>
          <button
            onClick={handleSaveEdit}
            disabled={saving}
            className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? t.saving : t.save}
          </button>
        </div>
      )}

      {/* Requests list */}
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
        {t.requestsTitle} ({pending.length})
      </p>
      {loading ? (
        <div className="py-6 flex justify-center text-neutral-300">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-neutral-400 py-4 text-center">
          {t.noRequests}
        </p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li
              key={r.id}
              className={`border rounded-xl p-3 ${
                r.status === "PENDING" || r.status === "COUNTERED"
                  ? "border-purple-200"
                  : "border-neutral-100 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-neutral-900">
                  {r.client_name}
                </p>
                <span className="text-sm font-bold text-purple-700">
                  {formatTND(Number(r.proposed_price) || 0)}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mb-1 line-clamp-2">
                {r.description}
              </p>
              <p className="text-[11px] text-neutral-400 mb-2">
                {r.payment_method === "COD" ? t.payCod : t.payDigital} ·{" "}
                {formatDateTime(r.created_at)} ·{" "}
                {(
                  {
                    PENDING: t.reqPending,
                    ACCEPTED: t.reqAccepted,
                    REJECTED: t.reqRejected,
                    COUNTERED: t.reqCountered,
                    CANCELLED: t.reqCancelled,
                    EXPIRED: t.reqExpired,
                  } as Record<string, string>
                )[r.status] || r.status}
              </p>

              {r.status === "PENDING" && (
                <>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => respond(r.id, "accept")}
                      disabled={actionLoading === r.id}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {t.accept}
                    </button>
                    <button
                      onClick={() =>
                        setCounterFor(counterFor === r.id ? null : r.id)
                      }
                      disabled={actionLoading === r.id}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 border border-purple-300 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-50 disabled:opacity-50"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      {t.counter}
                    </button>
                    <button
                      onClick={() => respond(r.id, "reject")}
                      disabled={actionLoading === r.id}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {counterFor === r.id && (
                    <div className="mt-2 flex gap-1.5">
                      <input
                        type="number"
                        min="1"
                        value={counterPrice}
                        onChange={(e) => setCounterPrice(e.target.value)}
                        placeholder={t.counterPlaceholder}
                        className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                      />
                      <button
                        onClick={() =>
                          respond(r.id, "counter", {
                            counter_price: counterPrice,
                          })
                        }
                        disabled={
                          actionLoading === r.id ||
                          !counterPrice ||
                          parseFloat(counterPrice) <= 0
                        }
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 disabled:opacity-50"
                      >
                        {t.sendCounter}
                      </button>
                    </div>
                  )}
                </>
              )}
              {r.status === "COUNTERED" && r.counter_price != null && (
                <p className="text-xs text-purple-600 font-medium">
                  {t.awaitingClient} ({formatTND(Number(r.counter_price) || 0)})
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
