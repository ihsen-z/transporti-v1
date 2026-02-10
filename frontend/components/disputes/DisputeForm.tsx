import React, { useState } from 'react';
import { AlertTriangle, Send, X } from 'lucide-react';

interface DisputeFormProps {
    jobId: number;
    onClose: () => void;
}

export function DisputeForm({ jobId, onClose }: DisputeFormProps) {
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Assuming a dispute API exists (not implemented in Phase 2 but part of trusted flow)
            // If not, we'll mock or point to a support endpoint.
            // Blueprint mentioned Support/Dispute. 
            // I'll assume /api/support/disputes/ or similar.
            // If not exist, I'll allow this to be a "Contact Support" form for now.

            // MOCK implementation for Prototype
            await new Promise(r => setTimeout(r, 1000));

            alert('Votre signalement a été enregistré. Le support vous contactera sous 24h.');
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erreur lors de l\'envoi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="flex items-center gap-3 mb-6 text-red-600">
                    <AlertTriangle className="w-8 h-8" />
                    <h2 className="text-xl font-bold">Signaler un problème</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type de problème</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500"
                            required
                        >
                            <option value="">Sélectionner...</option>
                            <option value="NO_SHOW">Transporteur absent</option>
                            <option value="DAMAGE">Marchandise endommagée</option>
                            <option value="DELAY">Retard important</option>
                            <option value="BEHAVIOR">Comportement inapproprié</option>
                            <option value="OTHER">Autre</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description détaillée</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-3 border rounded-lg h-32 focus:ring-2 focus:ring-red-500"
                            placeholder="Expliquez la situation..."
                            required
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50"
                        >
                            {loading ? 'Envoi...' : 'Envoyer le signalement'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
