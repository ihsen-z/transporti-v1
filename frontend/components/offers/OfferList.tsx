import React, { useState, useEffect } from 'react';
import { OfferCard } from './OfferCard';
import { useAuth } from '@/hooks/useAuth';

interface OfferListProps {
    jobId: number;
    isJobOwner: boolean;
}

export function OfferList({ jobId, isJobOwner }: OfferListProps) {
    const [offers, setOffers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOffers();
    }, [jobId]);

    const fetchOffers = async () => {
        try {
            const response = await fetch(`/api/jobs/${jobId}/offers/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setOffers(data);
            }
        } catch (error) {
            console.error('Error fetching offers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptOffer = async (offerId: number) => {
        if (!confirm('Êtes-vous sûr de vouloir accepter cette offre ? Cela engagera le processus de paiement.')) {
            return;
        }

        try {
            const response = await fetch(`/api/offers/${offerId}/accept/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                alert('Offre acceptée avec succès !');
                fetchOffers(); // Refresh to show updated status
                window.location.reload(); // Reload to update job status in parent
            } else {
                const error = await response.json();
                alert(error.error || "Erreur lors de l'acceptation.");
            }
        } catch (error) {
            console.error('Error accepting offer:', error);
            alert("Une erreur est survenue.");
        }
    };

    if (loading) return <div className="text-center py-4 text-gray-500">Chargement des offres...</div>;

    if (offers.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">Aucune offre pour le moment.</p>
                {isJobOwner && <p className="text-sm text-gray-400 mt-1">Les transporteurs seront notifiés de votre demande.</p>}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
                {offers.length} Offre{offers.length > 1 ? 's' : ''} reçue{offers.length > 1 ? 's' : ''}
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
    );
}
