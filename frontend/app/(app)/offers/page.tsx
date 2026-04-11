"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { OfferStatusCard } from "@/components/offers/OfferStatusCard";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Mock Data                                                                 */
/* -------------------------------------------------------------------------- */

const MOCK_OFFERS = [
  {
    id: 1,
    job_id: 10,
    job_pickup: "Tunis — La Marsa",
    job_dropoff: "Sousse Centre",
    job_type: "MOVING" as const,
    job_date: "2026-02-18T10:00:00Z",
    price: 350,
    commission_rate: 0.15,
    status: "PENDING" as const,
    valid_until: "2026-02-14T14:30:00Z",
    message: "Disponible avec 2 aides pour le 18.",
  },
  {
    id: 2,
    job_id: 12,
    job_pickup: "Sfax Port",
    job_dropoff: "Tunis — Lac 2",
    job_type: "TRANSPORT" as const,
    job_date: "2026-02-20T08:00:00Z",
    price: 180,
    commission_rate: 0.15,
    status: "PENDING" as const,
    valid_until: "2026-02-15T08:00:00Z",
  },
  {
    id: 3,
    job_id: 8,
    job_pickup: "Ariana — Ennasr",
    job_dropoff: "Bizerte Ville",
    job_type: "MOVING" as const,
    job_date: "2026-02-10T09:00:00Z",
    price: 420,
    commission_rate: 0.15,
    status: "ACCEPTED" as const,
    valid_until: "2026-02-08T09:00:00Z",
    client_name: "Leila Ben Ali",
  },
  {
    id: 4,
    job_id: 5,
    job_pickup: "Monastir",
    job_dropoff: "Mahdia",
    job_type: "TRANSPORT" as const,
    job_date: "2026-02-05T14:00:00Z",
    price: 120,
    commission_rate: 0.15,
    status: "REJECTED" as const,
    valid_until: "2026-02-03T14:00:00Z",
  },
  {
    id: 5,
    job_id: 3,
    job_pickup: "Carthage",
    job_dropoff: "Hammamet",
    job_type: "TRANSPORT" as const,
    job_date: "2026-01-28T11:00:00Z",
    price: 150,
    commission_rate: 0.15,
    status: "EXPIRED" as const,
    valid_until: "2026-01-26T11:00:00Z",
  },
];

type TabFilter = "ALL" | "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";

const TABS: { id: TabFilter; label: string; icon: React.ElementType }[] = [
  { id: "ALL", label: "Toutes", icon: FileText },
  { id: "PENDING", label: "En attente", icon: Clock },
  { id: "ACCEPTED", label: "Acceptées", icon: CheckCircle },
  { id: "REJECTED", label: "Refusées", icon: XCircle },
  { id: "EXPIRED", label: "Expirées", icon: AlertCircle },
];

/* -------------------------------------------------------------------------- */
/*  Page Component                                                            */
/* -------------------------------------------------------------------------- */

export default function MyOffersPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");
  const [offers, setOffers] = useState(MOCK_OFFERS);

  const role = user?.role?.toUpperCase();

  // Clients see a different view — redirect them to their jobs page
  if (role === "CLIENT") {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto text-center">
        <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Offres reçues
        </h1>
        <p className="text-neutral-500">
          Consultez les offres reçues dans chaque annonce de votre espace « Mes
          Transports ».
        </p>
        <a
          href="/jobs"
          className="inline-block mt-4 text-brand-600 hover:underline font-semibold"
        >
          Voir mes annonces →
        </a>
      </div>
    );
  }

  // Filter offers
  const filtered =
    activeTab === "ALL" ? offers : offers.filter((o) => o.status === activeTab);

  // Stats
  const pendingCount = offers.filter((o) => o.status === "PENDING").length;
  const acceptedCount = offers.filter((o) => o.status === "ACCEPTED").length;
  const acceptanceRate =
    offers.length > 0 ? Math.round((acceptedCount / offers.length) * 100) : 0;
  const potentialEarnings = offers
    .filter((o) => o.status === "PENDING")
    .reduce((sum, o) => sum + o.price * (1 - o.commission_rate), 0);

  const handleWithdraw = (offerId: number) => {
    if (confirm("Êtes-vous sûr de vouloir retirer cette offre ?")) {
      setOffers((prev) =>
        prev.map((o) =>
          o.id === offerId ? { ...o, status: "WITHDRAWN" as any } : o,
        ),
      );
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Mes offres</h1>
        <p className="text-neutral-500 mt-1">
          Suivez l&apos;état de vos offres soumises et gérez vos propositions.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-neutral-100 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">
            <FileText className="w-3.5 h-3.5" />
            Total
          </div>
          <p className="text-2xl font-bold text-neutral-900">{offers.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-100 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-amber-500 text-xs mb-1">
            <Clock className="w-3.5 h-3.5" />
            En attente
          </div>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-100 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-accent-500 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Taux acceptation
          </div>
          <p className="text-2xl font-bold text-accent-600">
            {acceptanceRate}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-100 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-brand-600/60 text-xs mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            Gain potentiel
          </div>
          <p className="text-2xl font-bold text-brand-600">
            {potentialEarnings.toFixed(0)} TND
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-brand-600/5 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map((tab) => {
          const count =
            tab.id === "ALL"
              ? offers.length
              : offers.filter((o) => o.status === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? "bg-accent-50 text-accent-600"
                    : "bg-neutral-200/70 text-neutral-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Offer List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-neutral-100 shadow-sm">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 font-medium">
              Aucune offre{" "}
              {activeTab !== "ALL"
                ? `${TABS.find((t) => t.id === activeTab)?.label.toLowerCase()}`
                : ""}{" "}
              pour le moment.
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              Parcourez les missions disponibles pour soumettre vos offres.
            </p>
          </div>
        ) : (
          filtered.map((offer) => (
            <OfferStatusCard
              key={offer.id}
              offer={offer}
              onWithdraw={handleWithdraw}
            />
          ))
        )}
      </div>
    </div>
  );
}
