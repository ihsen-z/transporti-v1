'use client';

import React from 'react';
import { TrendingUp, CheckCircle2, Clock, Truck } from 'lucide-react';

interface Props {
    completionRate: number;
    totalJobsCompleted: number;
    responseTimeMinutes?: number;
    trustScore: number;
}

export function StatsGrid({ completionRate, totalJobsCompleted, responseTimeMinutes, trustScore }: Props) {
    const stats = [
        {
            icon: TrendingUp,
            label: 'Score de confiance',
            value: `${trustScore}/100`,
            color: trustScore >= 80 ? 'text-emerald-600 bg-emerald-50' : trustScore >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50',
        },
        {
            icon: CheckCircle2,
            label: 'Taux de complétion',
            value: `${completionRate.toFixed(1)}%`,
            color: completionRate >= 90 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50',
        },
        {
            icon: Truck,
            label: 'Missions terminées',
            value: totalJobsCompleted.toString(),
            color: 'text-blue-600 bg-blue-50',
        },
        {
            icon: Clock,
            label: 'Temps de réponse',
            value: responseTimeMinutes ? `${responseTimeMinutes} min` : 'N/A',
            color: responseTimeMinutes && responseTimeMinutes < 30 ? 'text-emerald-600 bg-emerald-50' : 'text-neutral-600 bg-neutral-50',
        },
    ];

    return (
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100">
                <h3 className="text-lg font-semibold text-neutral-900">Statistiques</h3>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-neutral-50">
                {stats.map((stat) => (
                    <div key={stat.label} className="p-5 text-center">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${stat.color}`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <p className="text-xl font-bold text-neutral-900">{stat.value}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
