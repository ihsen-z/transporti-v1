'use client';

import React from 'react';
import { User, ShieldCheck, Star, MapPin, Calendar } from 'lucide-react';

interface Props {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    isVerified: boolean;
    trustScore: number;
    rating: number;
    reviewCount: number;
    joinedAt: string;
    serviceAreas: string[];
    specializations: string[];
}

export function TransporterProfileCard({
    firstName, lastName, avatarUrl, isVerified, trustScore,
    rating, reviewCount, joinedAt, serviceAreas, specializations,
}: Props) {
    return (
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            {/* Banner */}
            <div className="h-32 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
            </div>

            {/* Avatar + Info */}
            <div className="px-6 pb-6 -mt-12 relative">
                <div className="flex items-end gap-4 mb-4">
                    <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={`${firstName} ${lastName}`} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                                <User className="w-10 h-10 text-blue-500" />
                            </div>
                        )}
                    </div>
                    <div className="pb-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-neutral-900">{firstName} {lastName}</h1>
                            {isVerified && (
                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center" title="Vérifié">
                                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                <span className="text-sm font-semibold text-neutral-900">{rating.toFixed(1)}</span>
                                <span className="text-sm text-neutral-500">({reviewCount} avis)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trust Score Bar */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-neutral-500">Score de confiance</span>
                        <span className="text-sm font-bold text-neutral-900">{trustScore}/100</span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-2.5">
                        <div
                            className={`h-2.5 rounded-full transition-all ${trustScore >= 80 ? 'bg-emerald-500' : trustScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                            style={{ width: `${trustScore}%` }}
                        />
                    </div>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 text-sm text-neutral-500">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        Membre depuis {new Date(joinedAt).toLocaleDateString('fr-TN', { month: 'long', year: 'numeric' })}
                    </div>
                    {serviceAreas.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            {serviceAreas.slice(0, 3).join(', ')}
                            {serviceAreas.length > 3 && ` +${serviceAreas.length - 3}`}
                        </div>
                    )}
                </div>

                {/* Specializations */}
                {specializations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                        {specializations.map(spec => (
                            <span key={spec} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                                {spec}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
