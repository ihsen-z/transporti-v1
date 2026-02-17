'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { TransporterProfileCard } from '@/components/profile/TransporterProfileCard';
import { ReviewDisplay } from '@/components/reviews/ReviewDisplay';
import { Star, MessageSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/* -------------------------------------------------------------------------- */
/*  Mock Data                                                                 */
/* -------------------------------------------------------------------------- */

const MOCK_TRANSPORTER = {
    firstName: 'Mohamed',
    lastName: 'T.',
    isVerified: true,
    trustScore: 87,
    rating: 4.6,
    reviewCount: 23,
    joinedAt: '2024-06-15',
    serviceAreas: ['Tunis', 'Sousse', 'Sfax', 'Nabeul'],
    specializations: ['Déménagement', 'Transport fragile', 'Longue distance'],
};

const MOCK_REVIEWS = [
    {
        id: 1,
        reviewer_name: 'Leila B.',
        reviewer_role: 'CLIENT' as const,
        rating: 5,
        comment: 'Excellent service ! Mohamed est arrivé à l\'heure, très soigneux avec les meubles. Je recommande vivement.',
        aspects: { punctuality: 5, care: 5, communication: 4 },
        would_recommend: true,
        created_at: '2026-02-10T00:00:00Z',
    },
    {
        id: 2,
        reviewer_name: 'Ahmed K.',
        reviewer_role: 'CLIENT' as const,
        rating: 4,
        comment: 'Bon transporteur, ponctuel et professionnel. Le prix était correct pour le service.',
        aspects: { punctuality: 4, care: 4, communication: 5 },
        would_recommend: true,
        created_at: '2026-01-28T00:00:00Z',
    },
    {
        id: 3,
        reviewer_name: 'Fatma S.',
        reviewer_role: 'CLIENT' as const,
        rating: 5,
        comment: 'Déménagement parfait ! Tout est arrivé intact. Très bonne communication pendant tout le processus.',
        aspects: { punctuality: 5, care: 5, communication: 5 },
        would_recommend: true,
        created_at: '2026-01-15T00:00:00Z',
    },
    {
        id: 4,
        reviewer_name: 'Nabil M.',
        reviewer_role: 'CLIENT' as const,
        rating: 3,
        comment: 'Service correct mais léger retard de 30 minutes. Le travail en lui-même était bien fait.',
        aspects: { punctuality: 2, care: 4, communication: 3 },
        would_recommend: false,
        created_at: '2025-12-20T00:00:00Z',
    },
];

/* -------------------------------------------------------------------------- */
/*  Public Profile Page                                                       */
/* -------------------------------------------------------------------------- */

export default function TransporterProfilePage() {
    const params = useParams();
    const { user } = useAuth();
    const userId = params?.userId;

    const [reviewFilter, setReviewFilter] = useState<'all' | 'positive' | 'negative'>('all');

    // In production: fetch from /api/users/{userId}/profile/
    const transporter = MOCK_TRANSPORTER;
    const reviews = MOCK_REVIEWS;

    const filteredReviews = reviews.filter(r => {
        if (reviewFilter === 'positive') return r.rating >= 4;
        if (reviewFilter === 'negative') return r.rating < 4;
        return true;
    });

    // Calculate aggregate aspects
    const avgAspects = {
        punctuality: reviews.reduce((s, r) => s + (r.aspects?.punctuality || 0), 0) / reviews.length,
        care: reviews.reduce((s, r) => s + (r.aspects?.care || 0), 0) / reviews.length,
        communication: reviews.reduce((s, r) => s + (r.aspects?.communication || 0), 0) / reviews.length,
    };

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
            {/* Back button */}
            <Link
                href="/jobs/browse"
                className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Retour aux missions
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Profile Card */}
                <div className="lg:col-span-1">
                    <TransporterProfileCard {...transporter} />
                </div>

                {/* Right: Reviews */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Aspect Summary */}
                    <div className="bg-white rounded-xl border border-neutral-200 p-5">
                        <h3 className="text-sm font-semibold text-neutral-900 mb-4">
                            Performance moyenne
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Ponctualité', value: avgAspects.punctuality },
                                { label: 'Soin', value: avgAspects.care },
                                { label: 'Communication', value: avgAspects.communication },
                            ].map(aspect => (
                                <div key={aspect.label} className="text-center">
                                    <p className="text-2xl font-bold text-neutral-900">
                                        {aspect.value.toFixed(1)}
                                    </p>
                                    <div className="flex justify-center my-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star
                                                key={star}
                                                className={`w-3.5 h-3.5 ${star <= Math.round(aspect.value)
                                                        ? 'text-amber-400 fill-amber-400'
                                                        : 'text-neutral-200'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-neutral-500">{aspect.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Review Filters */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-neutral-900">
                            Avis ({reviews.length})
                        </h3>
                        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
                            {[
                                { id: 'all' as const, label: 'Tous' },
                                { id: 'positive' as const, label: '4-5 ★' },
                                { id: 'negative' as const, label: '1-3 ★' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setReviewFilter(tab.id)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${reviewFilter === tab.id
                                            ? 'bg-white text-neutral-900 shadow-sm'
                                            : 'text-neutral-500 hover:text-neutral-700'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Review List */}
                    <div className="space-y-3">
                        {filteredReviews.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
                                <MessageSquare className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                                <p className="text-sm text-neutral-500">
                                    Aucun avis dans cette catégorie.
                                </p>
                            </div>
                        ) : (
                            filteredReviews.map(review => (
                                <ReviewDisplay key={review.id} review={review} />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
