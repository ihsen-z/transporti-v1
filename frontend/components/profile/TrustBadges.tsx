'use client';

import React from 'react';
import { ShieldCheck, Star, Truck, Clock, CheckCircle2 } from 'lucide-react';

interface Props {
    isVerified: boolean;
    trustScore: number;
    completionRate: number;
    totalJobsCompleted: number;
    averageRating: number;
}

export function TrustBadges({ isVerified, trustScore, completionRate, totalJobsCompleted, averageRating }: Props) {
    const badges = [
        {
            icon: ShieldCheck,
            label: isVerified ? 'Identité vérifiée' : 'Non vérifié',
            active: isVerified,
            color: isVerified ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-neutral-400 bg-neutral-50 border-neutral-200',
        },
        {
            icon: Star,
            label: averageRating >= 4.5 ? 'Top noté' : averageRating >= 4.0 ? 'Bien noté' : 'En progression',
            active: averageRating >= 4.0,
            color: averageRating >= 4.0 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-neutral-400 bg-neutral-50 border-neutral-200',
        },
        {
            icon: CheckCircle2,
            label: completionRate >= 95 ? 'Fiabilité excellente' : completionRate >= 85 ? 'Fiable' : 'En progression',
            active: completionRate >= 85,
            color: completionRate >= 85 ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-neutral-400 bg-neutral-50 border-neutral-200',
        },
        {
            icon: Truck,
            label: totalJobsCompleted >= 50 ? 'Expert' : totalJobsCompleted >= 10 ? 'Expérimenté' : 'Débutant',
            active: totalJobsCompleted >= 10,
            color: totalJobsCompleted >= 10 ? 'text-purple-600 bg-purple-50 border-purple-200' : 'text-neutral-400 bg-neutral-50 border-neutral-200',
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3">
            {badges.map((badge) => (
                <div key={badge.label}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all ${badge.color}`}>
                    <badge.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{badge.label}</span>
                </div>
            ))}
        </div>
    );
}
