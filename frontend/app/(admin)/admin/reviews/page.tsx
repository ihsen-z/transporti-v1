'use client';

import { useState } from 'react';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { formatTimeAgoShort } from '@/lib/admin';
import {
    Star,
    Flag,
    Eye,
    EyeOff,
    AlertTriangle,
    User,
    MessageSquare,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types & Mock Data                                                         */
/* -------------------------------------------------------------------------- */

interface FlaggedReview {
    id: number;
    jobId: number;
    reviewerName: string;
    reviewerEmail: string;
    targetName: string;
    role: 'CLIENT' | 'TRANSPORTER';
    rating: number;
    comment: string;
    flagReason: string;
    isHidden: boolean;
    createdAt: string;
    abuseLogs: { detector: string; reason: string; severity: string; at: string }[];
}

const mockFlaggedReviews: FlaggedReview[] = [
    {
        id: 1,
        jobId: 1002,
        reviewerName: 'Ahmed Ben Salem',
        reviewerEmail: 'ahmed@example.tn',
        targetName: 'Karim Bouazizi',
        role: 'CLIENT',
        rating: 1,
        comment: 'ARNAQUEUR !! Ne faites PAS confiance à ce voleur !! Il a détruit tout mon mobilier et refuse de rembourser !!!',
        flagReason: 'Langage abusif détecté',
        isHidden: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        abuseLogs: [
            { detector: 'profanity_filter', reason: 'Mots offensants détectés: "arnaqueur", "voleur"', severity: 'MEDIUM', at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString() },
            { detector: 'caps_detector', reason: 'Plus de 50% du texte en majuscules', severity: 'LOW', at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString() },
        ],
    },
    {
        id: 2,
        jobId: 1005,
        reviewerName: 'Ali Hammami',
        reviewerEmail: 'ali@quick.tn',
        targetName: 'Leila Hamdi',
        role: 'TRANSPORTER',
        rating: 1,
        comment: 'La cliente m\'a donné une fausse adresse intentionnellement. 2 heures perdues.',
        flagReason: 'Avis potentiellement retaliatory',
        isHidden: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        abuseLogs: [
            { detector: 'retaliation_detector', reason: 'Avis 1 étoile déposé immédiatement après un litige ouvert par la cible', severity: 'HIGH', at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
        ],
    },
    {
        id: 3,
        jobId: 999,
        reviewerName: 'Bot12345',
        reviewerEmail: 'bot@fake.tn',
        targetName: 'Mohamed Trabelsi',
        role: 'CLIENT',
        rating: 5,
        comment: 'Excellent service 10/10 je recommande a tous le monde!!!',
        flagReason: 'Possible avis frauduleux',
        isHidden: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        abuseLogs: [
            { detector: 'fake_review_detector', reason: 'Compte créé <24h avant l\'avis, pas d\'historique de commandes', severity: 'CRITICAL', at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
        ],
    },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

type FilterTab = 'ALL' | 'VISIBLE' | 'HIDDEN';

function StarDisplay({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(v => (
                <Star key={v} className={`w-3.5 h-3.5 ${v <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
            ))}
        </div>
    );
}

const severityColors: Record<string, string> = {
    LOW: 'bg-slate-100 text-slate-600',
    MEDIUM: 'bg-orange-100 text-orange-700',
    HIGH: 'bg-red-100 text-red-700',
    CRITICAL: 'bg-red-200 text-red-800 font-bold',
};

export default function AdminReviewsPage() {
    const [filter, setFilter] = useState<FilterTab>('ALL');
    const [selectedReview, setSelectedReview] = useState<FlaggedReview | null>(null);

    const filterTabs: { value: FilterTab; label: string }[] = [
        { value: 'ALL', label: 'Tous' },
        { value: 'VISIBLE', label: 'Visibles' },
        { value: 'HIDDEN', label: 'Masqués' },
    ];

    const filtered = filter === 'ALL'
        ? mockFlaggedReviews
        : filter === 'VISIBLE'
            ? mockFlaggedReviews.filter(r => !r.isHidden)
            : mockFlaggedReviews.filter(r => r.isHidden);

    const handleToggleVisibility = (id: number) => {
        // PATCH /api/admin/reviews/{id}/ { is_hidden: toggle }
        alert(`👁 Visibilité de l'avis #${id} modifiée (mock)`);
    };

    const handleWarnUser = (reviewerEmail: string) => {
        // POST /api/admin/users/warn/ { email, reason }
        alert(`⚠️ Avertissement envoyé à ${reviewerEmail} (mock)`);
    };

    const columns = [
        {
            key: 'id',
            header: 'ID',
            width: 'w-16',
            render: (r: FlaggedReview) => (
                <span className="font-mono text-slate-500">#{r.id}</span>
            ),
        },
        {
            key: 'reviewer',
            header: 'Auteur',
            render: (r: FlaggedReview) => (
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${r.role === 'CLIENT' ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                        <User className={`w-4 h-4 ${r.role === 'CLIENT' ? 'text-blue-600' : 'text-purple-600'}`} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-900">{r.reviewerName}</p>
                        <p className="text-xs text-slate-400">{r.role === 'CLIENT' ? 'Client' : 'Transporteur'}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'target',
            header: 'Cible',
            render: (r: FlaggedReview) => (
                <span className="text-sm text-slate-700">{r.targetName}</span>
            ),
        },
        {
            key: 'rating',
            header: 'Note',
            render: (r: FlaggedReview) => <StarDisplay rating={r.rating} />,
        },
        {
            key: 'flagReason',
            header: 'Signalement',
            render: (r: FlaggedReview) => (
                <div className="flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs text-red-700 font-medium">{r.flagReason}</span>
                </div>
            ),
        },
        {
            key: 'visibility',
            header: 'Visibilité',
            render: (r: FlaggedReview) => (
                <StatusBadge
                    status={r.isHidden ? 'Masqué' : 'Visible'}
                    colorClass={r.isHidden ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-700'}
                />
            ),
        },
        {
            key: 'createdAt',
            header: 'Date',
            render: (r: FlaggedReview) => (
                <span className="text-sm text-slate-500">{formatTimeAgoShort(r.createdAt)}</span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (r: FlaggedReview) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSelectedReview(r)}
                        title="Voir détails"
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleToggleVisibility(r.id)}
                        title={r.isHidden ? 'Rendre visible' : 'Masquer'}
                        className={`p-1.5 rounded-lg transition-colors ${r.isHidden
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                            }`}
                    >
                        {r.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => handleWarnUser(r.reviewerEmail)}
                        title="Avertir l'utilisateur"
                        className="p-1.5 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
                    >
                        <AlertTriangle className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Modération des avis</h1>
                <p className="text-slate-500">Avis signalés pour contenu abusif ou frauduleux</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
                {filterTabs.map(tab => {
                    const isActive = filter === tab.value;
                    const count = tab.value === 'ALL'
                        ? mockFlaggedReviews.length
                        : tab.value === 'VISIBLE'
                            ? mockFlaggedReviews.filter(r => !r.isHidden).length
                            : mockFlaggedReviews.filter(r => r.isHidden).length;
                    return (
                        <button
                            key={tab.value}
                            onClick={() => setFilter(tab.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                        >
                            {tab.label}
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Stats Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                        <span className="text-slate-500">Signalés:</span>
                        <span className="ml-2 font-semibold text-slate-900">{mockFlaggedReviews.length}</span>
                    </div>
                    <div>
                        <span className="text-slate-500">Visibles:</span>
                        <span className="ml-2 font-semibold text-green-600">
                            {mockFlaggedReviews.filter(r => !r.isHidden).length}
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-500">Masqués:</span>
                        <span className="ml-2 font-semibold text-red-600">
                            {mockFlaggedReviews.filter(r => r.isHidden).length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={filtered}
                emptyMessage="Aucun avis signalé trouvé"
            />

            {/* Detail Drawer */}
            {selectedReview && (
                <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
                    <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">
                                Avis #{selectedReview.id}
                            </h2>
                            <button
                                onClick={() => setSelectedReview(null)}
                                className="text-slate-400 hover:text-slate-600 text-xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Rating */}
                            <div className="flex items-center gap-3">
                                <StarDisplay rating={selectedReview.rating} />
                                <span className="text-lg font-bold text-slate-900">{selectedReview.rating}/5</span>
                                <StatusBadge
                                    status={selectedReview.isHidden ? 'Masqué' : 'Visible'}
                                    colorClass={selectedReview.isHidden ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-700'}
                                />
                            </div>

                            {/* Parties */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-1">Auteur</p>
                                    <p className="font-medium text-slate-900 text-sm">{selectedReview.reviewerName}</p>
                                    <p className="text-xs text-slate-400">{selectedReview.reviewerEmail}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-1">Cible</p>
                                    <p className="font-medium text-slate-900 text-sm">{selectedReview.targetName}</p>
                                    <p className="text-xs text-slate-400">Job #{selectedReview.jobId}</p>
                                </div>
                            </div>

                            {/* Comment */}
                            <div>
                                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" /> Commentaire
                                </p>
                                <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4 italic">
                                    "{selectedReview.comment}"
                                </p>
                            </div>

                            {/* Flag Reason */}
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                                <Flag className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-red-900">{selectedReview.flagReason}</p>
                                </div>
                            </div>

                            {/* Abuse Logs */}
                            {selectedReview.abuseLogs.length > 0 && (
                                <div>
                                    <p className="text-xs text-slate-500 mb-2">Détections d'abus</p>
                                    <div className="space-y-2">
                                        {selectedReview.abuseLogs.map((log, idx) => (
                                            <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <StatusBadge
                                                        status={log.severity}
                                                        colorClass={severityColors[log.severity] || severityColors.MEDIUM}
                                                    />
                                                    <span className="text-xs font-mono text-slate-500">{log.detector}</span>
                                                </div>
                                                <p className="text-sm text-slate-600">{log.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => { handleToggleVisibility(selectedReview.id); setSelectedReview(null); }}
                                    className={`flex-1 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${selectedReview.isHidden
                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                            : 'bg-red-600 text-white hover:bg-red-700'
                                        }`}
                                >
                                    {selectedReview.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    {selectedReview.isHidden ? 'Rendre visible' : 'Masquer l\'avis'}
                                </button>
                                <button
                                    onClick={() => { handleWarnUser(selectedReview.reviewerEmail); setSelectedReview(null); }}
                                    className="flex-1 bg-orange-600 text-white py-2.5 rounded-xl font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <AlertTriangle className="w-4 h-4" />
                                    Avertir l'auteur
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
