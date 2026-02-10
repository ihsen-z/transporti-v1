'use client';

import {
    Users,
    Truck,
    CreditCard,
    TrendingUp,
    AlertTriangle,
    DollarSign,
    CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import StatCard from '@/components/admin/StatCard';
import DataTable from '@/components/admin/DataTable';
import { JobStatusBadge } from '@/components/admin/StatusBadge';
import {
    formatCurrency,
    formatTimeAgoShort,
    getActivityIcon,
    getAlertSeverityColor,
    type AdminJob,
} from '@/lib/admin';
import { useAdminStats, useAdminJobs, useActivityLogs, useSystemAlerts } from '@/hooks/useAdminData';
import LoadingState from '@/components/ui/LoadingState';
import DataSourceBadge from '@/components/ui/DataSourceBadge';

export default function AdminDashboardPage() {
    const { data: stats, loading: statsLoading, source } = useAdminStats();
    const { data: allJobs, loading: jobsLoading } = useAdminJobs();
    const { data: activityLogs } = useActivityLogs();
    const { data: systemAlerts } = useSystemAlerts();

    const loading = statsLoading || jobsLoading;

    if (loading) {
        return <LoadingState variant="page" />;
    }

    const recentJobs = allJobs.slice(0, 5);

    const jobColumns = [
        {
            key: 'id',
            header: 'ID',
            render: (job: AdminJob) => (
                <span className="font-mono text-slate-600">#{job.id}</span>
            ),
        },
        {
            key: 'clientName',
            header: 'Client',
        },
        {
            key: 'transporterName',
            header: 'Transporteur',
            render: (job: AdminJob) => (
                <span className={job.transporterName ? '' : 'text-slate-400'}>
                    {job.transporterName || 'Non assigné'}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Statut',
            render: (job: AdminJob) => <JobStatusBadge status={job.status} />,
        },
        {
            key: 'price',
            header: 'Montant',
            render: (job: AdminJob) => (
                <span className="font-medium">{formatCurrency(job.price)}</span>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
                    <p className="text-slate-500">Vue d&apos;ensemble de la plateforme Transporti</p>
                </div>
                <div className="text-sm text-slate-500">
                    Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
                </div>
            </div>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Utilisateurs"
                    value={stats.totalUsers.toLocaleString()}
                    subtitle={`${stats.activeUsers} actifs`}
                    icon={Users}
                    trend="up"
                    trendValue="+12%"
                    color="primary"
                />
                <StatCard
                    title="Jobs Actifs"
                    value={stats.activeJobs}
                    subtitle={`${stats.pendingJobs} en attente`}
                    icon={Truck}
                    trend="up"
                    trendValue="+5"
                    color="accent"
                />
                <StatCard
                    title="Escrow Total"
                    value={formatCurrency(stats.totalEscrow)}
                    subtitle={`${formatCurrency(stats.pendingEscrow)} en attente`}
                    icon={CreditCard}
                    color="warning"
                />
                <StatCard
                    title="Revenu Plateforme"
                    value={formatCurrency(stats.platformRevenue)}
                    subtitle="Commission 10%"
                    icon={DollarSign}
                    trend="up"
                    trendValue="+8.5%"
                    color="accent"
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    title="Jobs Complétés"
                    value={stats.completedJobs.toLocaleString()}
                    icon={CheckCircle}
                    color="accent"
                />
                <StatCard
                    title="Transporteurs Vérifiés"
                    value={`${stats.verifiedTransporters}/${stats.totalTransporters}`}
                    icon={Truck}
                    color="primary"
                />
                <StatCard
                    title="Litiges Actifs"
                    value={stats.activeDisputes}
                    icon={AlertTriangle}
                    color="danger"
                />
                <StatCard
                    title="Score Confiance Moyen"
                    value={`${stats.avgTrustScore}/100`}
                    icon={TrendingUp}
                    color="neutral"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Jobs Table */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900">Jobs Récents</h2>
                        <Link
                            href="/admin/jobs"
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                            Voir tout →
                        </Link>
                    </div>
                    <DataTable columns={jobColumns} data={recentJobs} />
                </div>

                {/* Sidebar - Activity & Alerts */}
                <div className="space-y-6">
                    {/* System Alerts */}
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Alertes Système</h2>
                        <div className="space-y-3">
                            {systemAlerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`p-4 rounded-lg border ${getAlertSeverityColor(alert.severity)}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium text-sm">{alert.title}</p>
                                            <p className="text-xs mt-1 opacity-80">{alert.description}</p>
                                        </div>
                                        {!alert.isRead && (
                                            <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1"></span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Activité Récente</h2>
                        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                            {activityLogs.slice(0, 5).map((log) => (
                                <div key={log.id} className="p-4 flex items-start gap-3">
                                    <span className="text-lg">{getActivityIcon(log.type)}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-700">{log.message}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-slate-500">
                                                {log.userName}
                                            </span>
                                            <span className="text-xs text-slate-400">•</span>
                                            <span className="text-xs text-slate-400">
                                                {formatTimeAgoShort(log.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <DataSourceBadge source={source} />
        </div>
    );
}
