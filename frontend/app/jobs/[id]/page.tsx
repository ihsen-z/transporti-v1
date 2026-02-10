'use client';

import { ArrowLeft, Package, MapPin, Calendar, DollarSign, User, Phone, Mail } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { mockRecentJobs, getStatusColor, getStatusLabel } from '@/lib/dashboard';
import { getCoordinates, generateMockRoute } from '@/lib/map';
import { formatTimeAgo } from '@/lib/notifications';

// Dynamic import to avoid SSR issues with Leaflet
const RouteMap = dynamic(() => import('@/components/map/RouteMap'), {
    ssr: false,
    loading: () => (
        <div className="h-96 bg-neutral-100 rounded-xl flex items-center justify-center">
            <p className="text-neutral-600">Chargement de la carte...</p>
        </div>
    ),
});

export default function JobDetailPage({ params }: { params: { id: string } }) {
    // Find job by ID (mock data)
    const job = mockRecentJobs.find(j => j.id === parseInt(params.id)) || mockRecentJobs[0];

    const pickupCoords = getCoordinates(job.pickup);
    const deliveryCoords = getCoordinates(job.delivery);
    const route = generateMockRoute(pickupCoords, deliveryCoords);

    const statusColor = getStatusColor(job.status);
    const statusLabel = getStatusLabel(job.status);

    return (
        <div className="min-h-screen bg-neutral-50 pt-16">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-800 font-medium mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Retour au tableau de bord
                </Link>

                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-neutral-900">{job.title}</h1>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
                                    {statusLabel}
                                </span>
                            </div>
                            <p className="text-neutral-600">Transport #{job.id}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-primary-700">{job.price} TND</p>
                            <p className="text-sm text-neutral-500">{formatTimeAgo(job.created_at)}</p>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Map */}
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                            <h2 className="text-lg font-bold text-neutral-900 mb-4">Itinéraire</h2>
                            <RouteMap
                                pickup={{
                                    name: job.pickup,
                                    coordinates: pickupCoords,
                                }}
                                delivery={{
                                    name: job.delivery,
                                    coordinates: deliveryCoords,
                                }}
                                route={route}
                                status={job.status}
                                height="400px"
                            />
                        </div>

                        {/* Route Details */}
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                            <h2 className="text-lg font-bold text-neutral-900 mb-4">Détails de l&apos;itinéraire</h2>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-accent-50 text-accent-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-neutral-500 mb-1">Point de départ</p>
                                        <p className="text-lg font-semibold text-neutral-900">{job.pickup}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pl-5">
                                    <div className="w-0.5 h-8 bg-neutral-200"></div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-cta-50 text-cta-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-neutral-500 mb-1">Point de livraison</p>
                                        <p className="text-lg font-semibold text-neutral-900">{job.delivery}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Job Info */}
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                            <h3 className="text-lg font-bold text-neutral-900 mb-4">Informations</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-neutral-400" />
                                    <div>
                                        <p className="text-xs text-neutral-500">Date de création</p>
                                        <p className="text-sm font-medium text-neutral-900">
                                            {new Date(job.created_at).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <DollarSign className="w-5 h-5 text-neutral-400" />
                                    <div>
                                        <p className="text-xs text-neutral-500">Prix</p>
                                        <p className="text-sm font-medium text-neutral-900">{job.price} TND</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Transporter Info */}
                        {job.transporter && (
                            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                                <h3 className="text-lg font-bold text-neutral-900 mb-4">Transporteur</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold">
                                            {job.transporter.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-neutral-900">{job.transporter}</p>
                                            <p className="text-sm text-neutral-600">⭐ 4.8 (124 avis)</p>
                                        </div>
                                    </div>
                                    <div className="pt-3 border-t border-neutral-100 space-y-2">
                                        <button className="w-full flex items-center gap-2 text-sm text-primary-700 hover:text-primary-800 font-medium">
                                            <Phone className="w-4 h-4" />
                                            Appeler
                                        </button>
                                        <button className="w-full flex items-center gap-2 text-sm text-primary-700 hover:text-primary-800 font-medium">
                                            <Mail className="w-4 h-4" />
                                            Envoyer un message
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                            <h3 className="text-lg font-bold text-neutral-900 mb-4">Actions</h3>
                            <div className="space-y-2">
                                {job.status === 'PENDING' && (
                                    <button className="w-full bg-error-500 hover:bg-error-600 text-white font-medium py-2 rounded-lg transition-colors">
                                        Annuler le transport
                                    </button>
                                )}
                                {job.status === 'IN_PROGRESS' && (
                                    <button className="w-full bg-accent-500 hover:bg-accent-600 text-white font-medium py-2 rounded-lg transition-colors">
                                        Confirmer la livraison
                                    </button>
                                )}
                                {job.status === 'COMPLETED' && (
                                    <button className="w-full bg-cta-500 hover:bg-cta-600 text-white font-medium py-2 rounded-lg transition-colors">
                                        Laisser un avis
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
