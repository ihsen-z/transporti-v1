'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import { JobStatusBadge, PaymentStatusBadge } from '@/components/admin/StatusBadge';
import {
    mockAdminJobs,
    formatCurrency,
    formatDate,
    type AdminJob,
} from '@/lib/admin';

type StatusFilter = 'ALL' | 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'Tous' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'ACCEPTED', label: 'Acceptés' },
    { value: 'IN_PROGRESS', label: 'En cours' },
    { value: 'COMPLETED', label: 'Terminés' },
    { value: 'CANCELLED', label: 'Annulés' },
];

export default function AdminJobsPage() {
    const [filter, setFilter] = useState<StatusFilter>('ALL');

    const filteredJobs = filter === 'ALL'
        ? mockAdminJobs
        : mockAdminJobs.filter(job => job.status === filter);

    const columns = [
        {
            key: 'id',
            header: 'ID',
            width: 'w-20',
            render: (job: AdminJob) => (
                <span className="font-mono text-slate-600">#{job.id}</span>
            ),
        },
        {
            key: 'title',
            header: 'Titre',
            render: (job: AdminJob) => (
                <div>
                    <p className="font-medium text-slate-900 truncate max-w-[200px]">{job.title}</p>
                    <p className="text-xs text-slate-500">{job.cityFrom} → {job.cityTo}</p>
                </div>
            ),
        },
        {
            key: 'clientName',
            header: 'Client',
            render: (job: AdminJob) => (
                <div>
                    <p className="font-medium text-slate-700">{job.clientName}</p>
                    <p className="text-xs text-slate-400">{job.clientEmail}</p>
                </div>
            ),
        },
        {
            key: 'transporterName',
            header: 'Transporteur',
            render: (job: AdminJob) => (
                job.transporterName ? (
                    <div>
                        <p className="font-medium text-slate-700">{job.transporterName}</p>
                        <p className="text-xs text-slate-400">{job.transporterEmail}</p>
                    </div>
                ) : (
                    <span className="text-slate-400 italic">Non assigné</span>
                )
            ),
        },
        {
            key: 'status',
            header: 'Statut',
            render: (job: AdminJob) => <JobStatusBadge status={job.status} />,
        },
        {
            key: 'escrowStatus',
            header: 'Paiement',
            render: (job: AdminJob) => (
                <div className="flex flex-col gap-1">
                    <PaymentStatusBadge status={job.escrowStatus} />
                    <span className="text-xs text-slate-500">{job.paymentMethod}</span>
                </div>
            ),
        },
        {
            key: 'price',
            header: 'Montant',
            render: (job: AdminJob) => (
                <span className="font-semibold text-slate-900">{formatCurrency(job.price)}</span>
            ),
        },
        {
            key: 'created_at',
            header: 'Date',
            render: (job: AdminJob) => (
                <span className="text-slate-600">{formatDate(job.created_at)}</span>
            ),
        },
        {
            key: 'actions',
            header: '',
            width: 'w-12',
            render: (job: AdminJob) => (
                <Link
                    href={`/jobs/${job.id}`}
                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                    <ArrowUpRight className="w-4 h-4" />
                </Link>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Transports</h1>
                <p className="text-slate-500">Gestion et suivi de tous les jobs de la plateforme</p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2">
                {statusTabs.map((tab) => {
                    const isActive = filter === tab.value;
                    const count = tab.value === 'ALL'
                        ? mockAdminJobs.length
                        : mockAdminJobs.filter(j => j.status === tab.value).length;

                    return (
                        <button
                            key={tab.value}
                            onClick={() => setFilter(tab.value)}
                            className={`
                                px-4 py-2 rounded-lg text-sm font-medium transition-all
                                ${isActive
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }
                            `}
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
                        <span className="text-slate-500">Total affiché:</span>
                        <span className="ml-2 font-semibold text-slate-900">{filteredJobs.length} jobs</span>
                    </div>
                    <div>
                        <span className="text-slate-500">Valeur totale:</span>
                        <span className="ml-2 font-semibold text-slate-900">
                            {formatCurrency(filteredJobs.reduce((sum, j) => sum + j.price, 0))}
                        </span>
                    </div>
                </div>
            </div>

            {/* Jobs Table */}
            <DataTable
                columns={columns}
                data={filteredJobs}
                emptyMessage="Aucun job trouvé pour ce filtre"
            />
        </div>
    );
}
