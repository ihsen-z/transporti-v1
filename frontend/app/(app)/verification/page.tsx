'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';
import { VerificationUpload } from '@/components/trust/VerificationUpload';
import { ShieldCheck, AlertTriangle, Clock, FileText } from 'lucide-react';

export default function VerificationPage() {
    const { user } = useAuth();
    const [status, setStatus] = useState<string>('LOADING');
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStatus();
        fetchDocuments();
    }, []);

    const fetchStatus = async () => {
        try {
            const data = await apiClient.get<{ verification_status: string }>('/api/trust/status/');
            setStatus(data.verification_status);
        } catch (e) {
            console.error(e);
            setStatus('UNVERIFIED');
        }
    };

    const fetchDocuments = async () => {
        try {
            const data = await apiClient.get<any[]>('/api/trust/documents/');
            setDocuments(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReview = async () => {
        try {
            await apiClient.put('/api/trust/submit/', {});
            alert('Profil soumis pour vérification !');
            fetchStatus();
        } catch (e) {
            console.error(e);
            alert('Erreur lors de la soumission.');
        }
    };

    if (loading) return <div className="p-8 text-center">Chargement...</div>;

    const getStatusDisplay = () => {
        switch (status) {
            case 'VERIFIED':
                return {
                    icon: <ShieldCheck className="w-12 h-12 text-green-600" />,
                    title: 'Profil Vérifié',
                    desc: 'Félicitations ! Vous êtes un transporteur de confiance.',
                    color: 'bg-green-50 border-green-200 text-green-800'
                };
            case 'PENDING':
                return {
                    icon: <Clock className="w-12 h-12 text-blue-600" />,
                    title: 'En cours de vérification',
                    desc: 'Nos équipes examinent vos documents. Délai estimé : 24-48h.',
                    color: 'bg-blue-50 border-blue-200 text-blue-800'
                };
            case 'REJECTED':
                return {
                    icon: <AlertTriangle className="w-12 h-12 text-red-600" />,
                    title: 'Vérification Refusée',
                    desc: 'Certains documents ne sont pas valides. Veuillez les renvoyer.',
                    color: 'bg-red-50 border-red-200 text-red-800'
                };
            default:
                return {
                    icon: <FileText className="w-12 h-12 text-gray-600" />,
                    title: 'Vérification Requise',
                    desc: 'Pour répondre aux offres, vous devez vérifier votre identité.',
                    color: 'bg-gray-50 border-gray-200 text-gray-800'
                };
        }
    };

    const statusInfo = getStatusDisplay();
    const hasDocuments = documents.length >= 2; // Assuming at least ID + License needed

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className={`p-6 rounded-xl border flex flex-col items-center text-center gap-4 ${statusInfo.color}`}>
                    {statusInfo.icon}
                    <div>
                        <h1 className="text-2xl font-bold">{statusInfo.title}</h1>
                        <p className="mt-1 opacity-90">{statusInfo.desc}</p>
                    </div>
                </div>

                {(status === 'UNVERIFIED' || status === 'REJECTED') && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
                        <h2 className="text-lg font-bold text-gray-900">Documents requis</h2>

                        <VerificationUpload
                            documentType="ID_CARD"
                            label="Carte d'identité (Recto/Verso)"
                            onUploadSuccess={fetchDocuments}
                        />

                        <VerificationUpload
                            documentType="DRIVING_LICENSE"
                            label="Permis de conduire"
                            onUploadSuccess={fetchDocuments}
                        />

                        <VerificationUpload
                            documentType="VEHICLE_REGISTRATION"
                            label="Carte grise"
                            onUploadSuccess={fetchDocuments}
                        />

                        <VerificationUpload
                            documentType="INSURANCE"
                            label="Assurance véhicule"
                            onUploadSuccess={fetchDocuments}
                        />

                        <div className="pt-4 border-t">
                            <button
                                onClick={handleSubmitReview}
                                disabled={!hasDocuments}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Soumettre pour vérification
                            </button>
                            {!hasDocuments && (
                                <p className="text-xs text-center text-gray-500 mt-2">
                                    Veuillez télécharger au moins votre pièce d'identité et votre permis.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
