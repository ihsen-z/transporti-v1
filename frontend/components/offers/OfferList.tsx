import React, { useState, useEffect } from "react";
import { OfferCard } from "./OfferCard";
import { apiClient, ApiError } from "@/lib/api/client";
import {
  CreditCard,
  Banknote,
  X,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

interface OfferListProps {
  jobId: number;
  isJobOwner: boolean;
}

const COD_MAX_TND = 300;

export function OfferList({ jobId, isJobOwner }: OfferListProps) {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetchOffers();
  }, [jobId]);

  const fetchOffers = async () => {
    try {
      const response = await apiClient.get<any>(`/api/jobs/${jobId}/offers/`);
      const offersData =
        response.results ?? (Array.isArray(response) ? response : []);
      setOffers(offersData);
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = (offerId: number) => {
    const offer = offers.find((o) => o.id === offerId);
    setSelectedOffer(offer);
    setShowPaymentModal(true);
  };

  const confirmAccept = async (paymentMethod: "DIGITAL" | "COD") => {
    if (!selectedOffer) return;
    setAccepting(true);

    try {
      await apiClient.post(`/api/offers/${selectedOffer.id}/accept/`, {
        payment_method: paymentMethod,
      });
      setShowPaymentModal(false);
      alert(
        paymentMethod === "COD"
          ? "Offre acceptée ! Paiement en espèces à la livraison."
          : "Offre acceptée ! Paiement sécurisé activé.",
      );
      fetchOffers();
      window.location.reload();
    } catch (error) {
      if (error instanceof ApiError && error.body) {
        const msg =
          (error.body as any).error || Object.values(error.body).flat()[0];
        alert(String(msg) || "Erreur lors de l'acceptation.");
      } else {
        console.error("Error accepting offer:", error);
        alert("Une erreur est survenue.");
      }
    } finally {
      setAccepting(false);
    }
  };

  if (loading)
    return (
      <div className="text-center py-4 text-gray-500">
        Chargement des offres...
      </div>
    );

  if (offers.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
        <p className="text-gray-500">Aucune offre pour le moment.</p>
        {isJobOwner && (
          <p className="text-sm text-gray-400 mt-1">
            Les transporteurs seront notifiés de votre demande.
          </p>
        )}
      </div>
    );
  }

  const offerPrice = selectedOffer?.total_price || 0;
  const codEligible = offerPrice <= COD_MAX_TND;

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {offers.length} Offre{offers.length > 1 ? "s" : ""} reçue
          {offers.length > 1 ? "s" : ""}
        </h3>
        {offers.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            isOwner={isJobOwner}
            onAccept={handleAcceptOffer}
          />
        ))}
      </div>

      {/* Payment Method Selection Modal */}
      {showPaymentModal && selectedOffer && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Choisir le mode de paiement
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Montant:{" "}
              <span className="font-bold text-gray-900">{offerPrice} TND</span>
            </p>

            <div className="space-y-3">
              {/* Digital Payment Option */}
              <button
                onClick={() => confirmAccept("DIGITAL")}
                disabled={accepting}
                className="w-full flex items-start gap-4 p-4 border-2 border-blue-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Paiement Digital
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Montant sécurisé via escrow. Libéré après confirmation.
                  </p>
                  <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Protégé par Transporti</span>
                  </div>
                </div>
              </button>

              {/* COD Option */}
              <button
                onClick={() => codEligible && confirmAccept("COD")}
                disabled={accepting || !codEligible}
                className={`w-full flex items-start gap-4 p-4 border-2 rounded-xl text-left transition-all ${
                  codEligible
                    ? "border-green-200 hover:border-green-500 hover:bg-green-50"
                    : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    codEligible ? "bg-green-100" : "bg-gray-100"
                  }`}
                >
                  <Banknote
                    className={`w-6 h-6 ${codEligible ? "text-green-600" : "text-gray-400"}`}
                  />
                </div>
                <div>
                  <p
                    className={`font-semibold ${codEligible ? "text-gray-900" : "text-gray-500"}`}
                  >
                    Paiement à la livraison (COD)
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Payez en espèces au transporteur à la réception.
                  </p>
                  {!codEligible && (
                    <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Maximum {COD_MAX_TND} TND pour le COD</span>
                    </div>
                  )}
                </div>
              </button>
            </div>

            {accepting && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Traitement en cours...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
