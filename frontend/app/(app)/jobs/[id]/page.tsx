'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { JobPreview } from '@/components/jobs/JobPreview';
import { OfferForm } from '@/components/offers/OfferForm';
import { OfferList } from '@/components/offers/OfferList';
import { BadgeCheck, Clock, CheckCircle } from 'lucide-react';

export default function JobDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Helper to extract ID safely
    const jobId = params?.id ? parseInt(Array.isArray(params.id) ? params.id[0] : params.id) : null;

    useEffect(() => {
        if (jobId) {
            fetchJob();
        }
    }, [jobId]);

    const fetchJob = async () => {
        try {
            const response = await fetch(`/api/jobs/${jobId}/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setJob(data);
            } else {
                // Handle 404 or 403
                console.error('Failed to fetch job');
            }
        } catch (error) {
            console.error('Error fetching job:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
    if (!job) return <div className="p-8 text-center text-red-500">Job introuvable ou accès refusé.</div>;

    const isOwner = user?.id === job.owner.id;
    const isTransporter = user?.role === 'TRANSPORTER';
    const showOfferForm = isTransporter && job.status === 'PUBLISHED';
    const showOffersList = isOwner && (job.status === 'PUBLISHED' || job.status === 'IN_PROGRESS');

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Status Banner */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Détail de la mission #{job.id}
                    </h1>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold 
            ${job.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                            job.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'}`}>
                        {job.status}
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content: Job Preview */}
                    <div className="lg:col-span-2">
                        <JobPreview data={job} />
                    </div>

                    {/* Sidebar: Actions */}
                    <div className="space-y-6">
                        {/* Transporter Actions */}
                        {showOfferForm && (
                            <OfferForm
                                jobId={job.id}
                                onOfferSubmitted={() => {
                                    alert('Offre envoyée avec succès !');
                                    fetchJob(); // Refresh
                                }}
                            />
                        )}

                        {/* Client Actions: Offers List */}
                        {showOffersList && (
                            <div className="bg-white rounded-xl shadow-sm p-4 border">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <BadgeCheck className="w-5 h-5 text-purple-600" />
                                    Offres reçues
                                </h3>
                                <OfferList jobId={job.id} isJobOwner={isOwner} />
                            </div>
                        )}

                        {/* In Progress / Completed Status */}
                        {job.status === 'IN_PROGRESS' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800">
                                <h3 className="font-bold flex items-center gap-2 mb-2">
                                    <Clock className="w-5 h-5" />
                                    Mission en cours
                                </h3>
                                <p className="text-sm">
                                    Le transporteur a été assigné. Veuillez procéder à la communication via la messagerie pour la coordination.
                                </p>
                                <div className="mt-4">
                                    <button
                                        onClick={() => router.push(`/messages/${job.id}`)}
                                        className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                                    >
                                        Ouvrir la messagerie
                                    </button>
                                </div>
                            </div>
                        )}

                        {job.status === 'COMPLETED' && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800">
                                <h3 className="font-bold flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-5 h-5" />
                                    Mission terminée
                                </h3>
                                <p className="text-sm">
                                    Le transport a été effectué avec succès.
                                </p>
                                {/* Review Button Placeholder */}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
