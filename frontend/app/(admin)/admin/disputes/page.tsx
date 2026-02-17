'use client';

import { useState } from 'react';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { formatTimeAgoShort, formatCurrency } from '@/lib/admin';
import {
    AlertTriangle,
    Eye,
    Search as SearchIcon,
    MessageSquare,
    CheckCircle,
    XCircle,
    User,
    DollarSign,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types & Mock Data                                                         */
/* -------------------------------------------------------------------------- */

type DisputeStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'REJECTED';

interface AdminDispute {
    id: number;
    jobId: number;
    jobTitle: string;
    openedBy: string;
    openedByEmail: string;
    openedByRole: 'CLIENT' | 'TRANSPORTER';
    respondentName: string;
    reason: string;
    status: DisputeStatus;
    createdAt: string;
    resolvedAt?: string;
    escrowAmount: number;
    resolution?: string;
    messages: { from: string; text: string; at: string }[];
}

const statusColors: Record<DisputeStatus, string> = {
    OPEN: 'bg-red-100 text-red-700',
    INVESTIGATING: 'bg-blue-100 text-blue-700',
    RESOLVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-slate-100 text-slate-600',
};

const statusLabels: Record<DisputeStatus, string> = {
    OPEN: 'Ouvert',
    INVESTIGATING: 'Investigation',
    RESOLVED: 'Résolu',
    REJECTED: 'Rejeté',
};

const mockDisputes: AdminDispute[] = [
    {
        id: 1,
        jobId: 1002,
        jobTitle: 'Déménagement appartement — Sfax → Tunis',
        openedBy: 'Fatma Kasri',
        openedByEmail: 'fatma@example.tn',
        openedByRole: 'CLIENT',
        respondentName: 'Karim Bouazizi',
        reason: 'Objets endommagés lors du transport — une table brisée et un miroir fissuré.',
        status: 'OPEN',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        escrowAmount: 350,
        messages: [
            { from: 'Fatma Kasri', text: 'Ma table est cassée, le miroir est fissuré.', at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
            { from: 'Karim Bouazizi', text: 'Les objets étaient mal emballés par le client.', at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
        ],
    },
    {
        id: 2,
        jobId: 1004,
        jobTitle: 'Transport électroménager — Tunis → Monastir',
        openedBy: 'Sami Riahi',
        openedByEmail: 'sami@example.tn',
        openedByRole: 'CLIENT',
        respondentName: 'Ali Hammami',
        reason: 'Transporteur n\'est jamais venu. Pas de réponse après confirmation.',
        status: 'INVESTIGATING',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        escrowAmount: 80,
        messages: [
            { from: 'Sami Riahi', text: 'Le transporteur ne se présente pas et ne répond plus.', at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString() },
        ],
    },
    {
        id: 3,
        jobId: 1005,
        jobTitle: 'Déménagement complet — Gabès → Ariana',
        openedBy: 'Hichem Karray',
        openedByEmail: 'hichem@fast.tn',
        openedByRole: 'TRANSPORTER',
        respondentName: 'Leila Hamdi',
        reason: 'Le client refuse de payer malgré la livraison effectuée.',
        status: 'RESOLVED',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        escrowAmount: 850,
        resolution: 'Paiement libéré en faveur du transporteur après vérification des preuves de livraison.',
        messages: [],
    },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

type FilterTab = 'ALL' | 'OPEN' | 'INVESTIGATING' | 'RESOLVED';

export default function AdminDisputesPage() {
    const [filter, setFilter] = useState<FilterTab>('ALL');
    const [selectedDispute, setSelectedDispute] = useState<AdminDispute | null>(null);

    const filterTabs: { value: FilterTab; label: string }[] = [
        { value: 'ALL', label: 'Tous' },
        { value: 'OPEN', label: 'Ouverts' },
        { value: 'INVESTIGATING', label: 'Investigation' },
        { value: 'RESOLVED', label: 'Résolus' },
    ];

    const filtered = filter === 'ALL'
        ? mockDisputes
        : mockDisputes.filter(d => d.status === filter);

    const openCount = mockDisputes.filter(d => d.status === 'OPEN').length;
    const investigatingCount = mockDisputes.filter(d => d.status === 'INVESTIGATING').length;

    const handleInvestigate = (id: number) => {
        // POST /api/admin/disputes/{id}/investigate/
        alert(`🔍 Investigation ouverte sur litige #${id} (mock)`);
    };

    const handleResolve = (id: number) => {
        // POST /api/admin/disputes/{id}/resolve/
        alert(`✅ Litige #${id} résolu (mock)`);
    };

    const handleReject = (id: number) => {
        // POST /api/admin/disputes/{id}/reject/
        alert(`❌ Litige #${id} rejeté (mock)`);
    };

    const columns = [
        {
            key: 'id',
            header: 'ID',
            width: 'w-16',
            render: (d: AdminDispute) => (
                <span className="font-mono text-slate-500">#{d.id}</span>
            ),
        },
        {
            key: 'job',
            header: 'Mission',
            render: (d: AdminDispute) => (
                <div>
                    <p className="font-medium text-slate-900 text-sm">{d.jobTitle}</p>
                    <p className="text-xs text-slate-400">Job #{d.jobId}</p>
                </div>
            ),
        },
        {
            key: 'openedBy',
            header: 'Ouvert par',
            render: (d: AdminDispute) => (
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${d.openedByRole === 'CLIENT' ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                        <User className={`w-4 h-4 ${d.openedByRole === 'CLIENT' ? 'text-blue-600' : 'text-purple-600'}`} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-900">{d.openedBy}</p>
                        <p className="text-xs text-slate-400">{d.openedByRole === 'CLIENT' ? 'Client' : 'Transporteur'}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Statut',
            render: (d: AdminDispute) => (
                <StatusBadge status={statusLabels[d.status]} colorClass={statusColors[d.status]} />
            ),
        },
        {
            key: 'escrow',
            header: 'Escrow',
            render: (d: AdminDispute) => (
                <span className="text-sm font-medium text-slate-700">
                    {formatCurrency(d.escrowAmount)}
                </span>
            ),
        },
        {
            key: 'createdAt',
            header: 'Ouvert',
            render: (d: AdminDispute) => (
                <span className="text-sm text-slate-500">{formatTimeAgoShort(d.createdAt)}</span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (d: AdminDispute) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSelectedDispute(d)}
                        title="Voir détails"
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    {d.status === 'OPEN' && (
                        <button
                            onClick={() => handleInvestigate(d.id)}
                            title="Investiguer"
                            className="p-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                        >
                            <SearchIcon className="w-4 h-4" />
                        </button>
                    )}
                    {(d.status === 'OPEN' || d.status === 'INVESTIGATING') && (
                        <>
                            <button
                                onClick={() => handleResolve(d.id)}
                                title="Résoudre"
                                className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                            >
                                <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleReject(d.id)}
                                title="Rejeter"
                                className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Litiges</h1>
                    <p className="text-slate-500">Résolution des conflits entre clients et transporteurs</p>
                </div>
                {openCount > 0 && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">
                            {openCount} litige{openCount > 1 ? 's' : ''} ouvert{openCount > 1 ? 's' : ''}
                        </span>
                    </div>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
                {filterTabs.map(tab => {
                    const isActive = filter === tab.value;
                    const count = tab.value === 'ALL'
                        ? mockDisputes.length
                        : mockDisputes.filter(d => d.status === tab.value).length;
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
                        <span className="text-slate-500">Total:</span>
                        <span className="ml-2 font-semibold text-slate-900">{filtered.length}</span>
                    </div>
                    <div>
                        <span className="text-slate-500">Ouverts:</span>
                        <span className="ml-2 font-semibold text-red-600">{openCount}</span>
                    </div>
                    <div>
                        <span className="text-slate-500">En investigation:</span>
                        <span className="ml-2 font-semibold text-blue-600">{investigatingCount}</span>
                    </div>
                    <div>
                        <span className="text-slate-500">Escrow impliqué:</span>
                        <span className="ml-2 font-semibold text-slate-900">
                            {formatCurrency(mockDisputes.reduce((s, d) => s + d.escrowAmount, 0))}
                        </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={filtered}
                emptyMessage="Aucun litige trouvé pour ce filtre"
            />

            {/* Detail Drawer */}
            {selectedDispute && (
                <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
                    <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">
                                Litige #{selectedDispute.id}
                            </h2>
                            <button
                                onClick={() => setSelectedDispute(null)}
                                className="text-slate-400 hover:text-slate-600 text-xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status */}
                            <div className="flex items-center gap-3">
                                <StatusBadge
                                    status={statusLabels[selectedDispute.status]}
                                    colorClass={statusColors[selectedDispute.status]}
                                    size="md"
                                />
                                <span className="text-sm text-slate-500">
                                    Ouvert {formatTimeAgoShort(selectedDispute.createdAt)}
                                </span>
                            </div>

                            {/* Job Info */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-xs text-slate-500 mb-1">Mission concernée</p>
                                <p className="font-medium text-slate-900">{selectedDispute.jobTitle}</p>
                                <p className="text-sm text-slate-500">Job #{selectedDispute.jobId}</p>
                            </div>

                            {/* Parties */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 rounded-xl p-3">
                                    <p className="text-xs text-blue-600 mb-1">Plaignant</p>
                                    <p className="font-medium text-slate-900 text-sm">{selectedDispute.openedBy}</p>
                                    <p className="text-xs text-slate-500">{selectedDispute.openedByRole === 'CLIENT' ? 'Client' : 'Transporteur'}</p>
                                </div>
                                <div className="bg-purple-50 rounded-xl p-3">
                                    <p className="text-xs text-purple-600 mb-1">Mis en cause</p>
                                    <p className="font-medium text-slate-900 text-sm">{selectedDispute.respondentName}</p>
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <p className="text-xs text-slate-500 mb-2">Motif du litige</p>
                                <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4">{selectedDispute.reason}</p>
                            </div>

                            {/* Escrow */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                                <DollarSign className="w-5 h-5 text-amber-600" />
                                <div>
                                    <p className="text-sm font-semibold text-amber-900">
                                        Escrow: {formatCurrency(selectedDispute.escrowAmount)}
                                    </p>
                                    <p className="text-xs text-amber-700">Fonds bloqués en attente de résolution</p>
                                </div>
                            </div>

                            {/* Messages / Chat History */}
                            {selectedDispute.messages.length > 0 && (
                                <div>
                                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" /> Historique
                                    </p>
                                    <div className="space-y-3">
                                        {selectedDispute.messages.map((msg, idx) => (
                                            <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-medium text-slate-700">{msg.from}</span>
                                                    <span className="text-xs text-slate-400">{formatTimeAgoShort(msg.at)}</span>
                                                </div>
                                                <p className="text-sm text-slate-600">{msg.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resolution */}
                            {selectedDispute.resolution && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                    <p className="text-xs text-green-600 mb-1">Résolution</p>
                                    <p className="text-sm text-green-800">{selectedDispute.resolution}</p>
                                </div>
                            )}

                            {/* Actions */}
                            {(selectedDispute.status === 'OPEN' || selectedDispute.status === 'INVESTIGATING') && (
                                <div className="flex gap-3 pt-4 border-t border-slate-100">
                                    {selectedDispute.status === 'OPEN' && (
                                        <button
                                            onClick={() => { handleInvestigate(selectedDispute.id); setSelectedDispute(null); }}
                                            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <SearchIcon className="w-4 h-4" />
                                            Investiguer
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { handleResolve(selectedDispute.id); setSelectedDispute(null); }}
                                        className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Résoudre
                                    </button>
                                    <button
                                        onClick={() => { handleReject(selectedDispute.id); setSelectedDispute(null); }}
                                        className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Rejeter
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
