import React, { useState, useEffect } from 'react';
import { Calculator, Send } from 'lucide-react';

interface OfferFormProps {
    jobId: number;
    onOfferSubmitted: () => void;
}

export function OfferForm({ jobId, onOfferSubmitted }: OfferFormProps) {
    const [priceNet, setPriceNet] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [commission, setCommission] = useState(0);
    const [total, setTotal] = useState(0);

    const COMMISSION_RATE = 0.15; // 15%

    useEffect(() => {
        const net = parseFloat(priceNet) || 0;
        const comm = net * COMMISSION_RATE;
        setCommission(comm);
        setTotal(net + comm);
    }, [priceNet]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/offers/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    job_id: jobId,
                    price_net: parseFloat(priceNet),
                    message: message,
                    valid_until: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // Valid 3 days
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.non_field_errors || 'Failed to submit offer');
            }

            onOfferSubmitted();
            setPriceNet('');
            setMessage('');
        } catch (error: any) {
            console.error('Error submitting offer:', error);
            alert(error.message || 'Une erreur est survenue.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                Faire une offre
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Votre tarif net (ce que vous gagnez)
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            min="1"
                            step="0.1"
                            required
                            value={priceNet}
                            onChange={(e) => setPriceNet(e.target.value)}
                            className="w-full pl-3 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                            placeholder="0.00"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                            TND
                        </span>
                    </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                        <span>+ Commission plateforme (15%)</span>
                        <span>{commission.toFixed(2)} TND</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="font-semibold text-gray-900">Prix total (payé par le client)</span>
                        <span className="font-bold text-xl text-blue-600">
                            {total.toFixed(2)} TND
                        </span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Message pour le client (Optionnel)
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Détaillez vos disponibilités, votre véhicule..."
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !priceNet}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Envoi en cours...' : 'Envoyer mon offre'}
                </button>
            </form>
        </div>
    );
}
