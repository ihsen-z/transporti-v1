'use client';

import { useState } from 'react';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { formatTimeAgoShort } from '@/lib/admin';
import {
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    FileText,
    User,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types & Mock Data                                                         */
/* -------------------------------------------------------------------------- */

type VerificationStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

interface VerificationRequest {
    id: number;
    transporterName: string;
    transporterEmail: string;
    documentType: string;
    status: VerificationStatus;
    submittedAt: string;
    reviewedAt?: string;
    reviewerNote?: string;
    documentUrl: string;
    trustScore: number;
}

const statusColors: Record<VerificationStatus, string> = {
    PENDING_REVIEW: 'bg-orange-100 text-orange-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-slate-100 text-slate-600',
};

const statusLabels: Record<VerificationStatus, string> = {
    PENDING_REVIEW: 'En attente',
    APPROVED: 'Approuvé',
    REJECTED: 'Rejeté',
    EXPIRED: 'Expiré',
};

const mockVerifications: VerificationRequest[] = [
    {
        id: 1,
        transporterName: 'Mohamed Trabelsi',
        transporterEmail: 'mohamed@transport.tn',
        documentType: 'Carte d\'identité nationale',
        status: 'PENDING_REVIEW',
        submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        documentUrl: '/uploads/docs/cin-001.jpg',
        trustScore: 65,
    },
    {
        id: 2,
        transporterName: 'Karim Bouazizi',
        transporterEmail: 'karim@express.tn',
        documentType: 'Permis de conduire',
        status: 'PENDING_REVIEW',
        submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        documentUrl: '/uploads/docs/permis-002.jpg',
        trustScore: 88,
    },
    {
        id: 3,
        transporterName: 'Ali Hammami',
        transporterEmail: 'ali@quick.tn',
        documentType: 'Assurance véhicule',
        status: 'PENDING_REVIEW',
        submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
        documentUrl: '/uploads/docs/assurance-003.jpg',
        trustScore: 72,
    },
    {
        id: 4,
        transporterName: 'Hichem Karray',
        transporterEmail: 'hichem@fast.tn',
        documentType: 'Carte grise',
        status: 'APPROVED',
        submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        documentUrl: '/uploads/docs/cg-004.jpg',
        trustScore: 91,
    },
    {
        id: 5,
        transporterName: 'Sami Ben Ali',
        transporterEmail: 'sami@cargo.tn',
        documentType: 'Carte d\'identité nationale',
        status: 'REJECTED',
        submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
        reviewerNote: 'Document illisible — photo floue',
        documentUrl: '/uploads/docs/cin-005.jpg',
        trustScore: 45,
    },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

type FilterTab = 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export default function AdminVerificationsPage() {
    const [filter, setFilter] = useState<FilterTab>('ALL');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);

    const filterTabs: { value: FilterTab; label: string }[] = [
        { value: 'ALL', label: 'Toutes' },
        { value: 'PENDING_REVIEW', label: 'En attente' },
        { value: 'APPROVED', label: 'Approuvées' },
        { value: 'REJECTED', label: 'Rejetées' },
    ];

    const filtered = filter === 'ALL'
        ? mockVerifications
        : mockVerifications.filter(v => v.status === filter);

    const pendingCount = mockVerifications.filter(v => v.status === 'PENDING_REVIEW').length;

    const handleApprove = (id: number) => {
        // POST /api/trust/admin/{id}/approve/
        alert(`✅ Vérification #${id} approuvée (mock)`);
    };

    const handleReject = (id: number) => {
        setSelectedId(id);
        setShowRejectModal(true);
    };

    const confirmReject = () => {
        // POST /api/trust/admin/{id}/reject/ with { reason }
        alert(`❌ Vérification #${selectedId} rejetée: "${rejectReason}" (mock)`);
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedId(null);
    };

    const columns = [
        {
            key: 'id',
            header: 'ID',
            width: 'w-16',
            render: (v: VerificationRequest) => (
                <span className="font-mono text-slate-500">#{v.id}</span>
            ),
        },
        {
            key: 'transporter',
            header: 'Transporteur',
            render: (v: VerificationRequest) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                        <p className="font-medium text-slate-900">{v.transporterName}</p>
                        <p className="text-xs text-slate-500">{v.transporterEmail}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'documentType',
            header: 'Document',
            render: (v: VerificationRequest) => (
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-sm">{v.documentType}</span>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Statut',
            render: (v: VerificationRequest) => (
                <StatusBadge
                    status={statusLabels[v.status]}
                    colorClass={statusColors[v.status]}
                />
            ),
        },
        {
            key: 'trustScore',
            header: 'Confiance',
            render: (v: VerificationRequest) => (
                <span className={`text-sm font-semibold ${v.trustScore >= 80 ? 'text-green-600' :
                    v.trustScore >= 50 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                    {v.trustScore}/100
                </span>
            ),
        },
        {
            key: 'submittedAt',
            header: 'Soumis',
            render: (v: VerificationRequest) => (
                <span className="text-sm text-slate-500">
                    {formatTimeAgoShort(v.submittedAt)}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (v: VerificationRequest) => (
                <div className="flex items-center gap-2">
                    <button
                        title="Voir le document"
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    {v.status === 'PENDING_REVIEW' && (
                        <>
                            <button
                                onClick={() => handleApprove(v.id)}
                                title="Approuver"
                                className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                            >
                                <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleReject(v.id)}
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
                    <h1 className="text-2xl font-bold text-slate-900">Vérifications</h1>
                    <p className="text-slate-500">File de vérification des transporteurs</p>
                </div>
                {pendingCount > 0 && (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-lg">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">
                            {pendingCount} demande{pendingCount > 1 ? 's' : ''} en attente
                        </span>
                    </div>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
                {filterTabs.map(tab => {
                    const isActive = filter === tab.value;
                    const count = tab.value === 'ALL'
                        ? mockVerifications.length
                        : mockVerifications.filter(v => v.status === tab.value).length;
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
                        <span className="text-slate-500">Affichées:</span>
                        <span className="ml-2 font-semibold text-slate-900">{filtered.length}</span>
                    </div>
                    <div>
                        <span className="text-slate-500">En attente:</span>
                        <span className="ml-2 font-semibold text-orange-600">{pendingCount}</span>
                    </div>
                    <div>
                        <span className="text-slate-500">Approuvées:</span>
                        <span className="ml-2 font-semibold text-green-600">
                            {mockVerifications.filter(v => v.status === 'APPROVED').length}
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-500">Rejetées:</span>
                        <span className="ml-2 font-semibold text-red-600">
                            {mockVerifications.filter(v => v.status === 'REJECTED').length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={filtered}
                emptyMessage="Aucune demande de vérification trouvée"
            />

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Rejeter la vérification</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Indiquez la raison du rejet. Le transporteur sera notifié.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Raison du rejet..."
                            rows={3}
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmReject}
                                disabled={!rejectReason.trim()}
                                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirmer le rejet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
