'use client';

import { Package, CheckCircle, Star, Wallet, Plus, List, Bell, Shield } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import JobCard from '@/components/dashboard/JobCard';
import { mockUserProfile, mockDashboardStats, mockRecentJobs, getTrustLevelColor, getTrustLevelLabel } from '@/lib/dashboard';
import { mockNotifications } from '@/lib/notifications';
import Link from 'next/link';

export default function DashboardPage() {
    const user = mockUserProfile;
    const stats = mockDashboardStats;
    const recentJobs = mockRecentJobs;
    const recentNotifications = mockNotifications.slice(0, 3);

    const trustLevelColor = getTrustLevelColor(user.trust_level);
    const trustLevelLabel = getTrustLevelLabel(user.trust_level);

    return (
        <div className="min-h-screen bg-neutral-50 pt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Header */}
                <div className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 rounded-2xl shadow-lg p-8 mb-8 text-white">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Bienvenue, {user.name} 👋</h1>
                            <p className="text-blue-100 mb-4">
                                Gérez vos transports en toute simplicité
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    <span className="font-medium">Score de confiance: {user.trust_score}/100</span>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${trustLevelColor}`}>
                                    {trustLevelLabel}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button className="bg-cta-500 hover:bg-cta-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-colors flex items-center gap-2">
                                <Plus className="w-5 h-5" />
                                Nouveau transport
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total transports"
                        value={stats.totalJobs}
                        icon={<Package className="w-6 h-6" />}
                        color="primary"
                        trend="up"
                        trendValue="+2"
                    />
                    <StatCard
                        title="Transports terminés"
                        value={stats.completedJobs}
                        icon={<CheckCircle className="w-6 h-6" />}
                        color="accent"
                        subtitle={`${Math.round((stats.completedJobs / stats.totalJobs) * 100)}% de réussite`}
                    />
                    <StatCard
                        title="Note moyenne"
                        value={stats.averageRating.toFixed(1)}
                        icon={<Star className="w-6 h-6" />}
                        color="cta"
                        subtitle="⭐⭐⭐⭐⭐"
                    />
                    <StatCard
                        title="Solde"
                        value={`${stats.balance.toFixed(2)} TND`}
                        icon={<Wallet className="w-6 h-6" />}
                        color="neutral"
                        subtitle="Disponible"
                    />
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Recent Jobs */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-neutral-900">Transports récents</h2>
                            <Link
                                href="/jobs"
                                className="text-primary-700 hover:text-primary-800 font-medium flex items-center gap-1 transition-colors"
                            >
                                Voir tout
                                <List className="w-4 h-4" />
                            </Link>
                        </div>

                        {recentJobs.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
                                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Package className="w-8 h-8 text-neutral-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                                    Aucun transport
                                </h3>
                                <p className="text-neutral-600 mb-4">
                                    Commencez par créer votre premier transport
                                </p>
                                <button className="bg-primary-700 hover:bg-primary-800 text-white font-medium px-6 py-2 rounded-lg transition-colors">
                                    Créer un transport
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentJobs.map((job) => (
                                    <JobCard key={job.id} job={job} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Recent Notifications */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-neutral-900">Notifications</h3>
                                <Link
                                    href="/notifications"
                                    className="text-sm text-primary-700 hover:text-primary-800 font-medium transition-colors"
                                >
                                    Voir tout
                                </Link>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 divide-y divide-neutral-100">
                                {recentNotifications.map((notification) => (
                                    <div key={notification.id} className="p-4 hover:bg-neutral-50 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <Bell className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-neutral-900 mb-1 line-clamp-1">
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-neutral-600 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                            </div>
                                            {!notification.is_read && (
                                                <span className="w-2 h-2 bg-cta-500 rounded-full flex-shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900 mb-4">Actions rapides</h3>
                            <div className="space-y-3">
                                <button className="w-full bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg p-4 text-left transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary-50 text-primary-700 rounded-lg flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                                            <Plus className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-neutral-900">Nouveau transport</p>
                                            <p className="text-xs text-neutral-600">Créer une demande</p>
                                        </div>
                                    </div>
                                </button>
                                <button className="w-full bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg p-4 text-left transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-accent-50 text-accent-700 rounded-lg flex items-center justify-center group-hover:bg-accent-100 transition-colors">
                                            <List className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-neutral-900">Mes transports</p>
                                            <p className="text-xs text-neutral-600">Voir l&apos;historique</p>
                                        </div>
                                    </div>
                                </button>
                                <button className="w-full bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg p-4 text-left transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-cta-50 text-cta-700 rounded-lg flex items-center justify-center group-hover:bg-cta-100 transition-colors">
                                            <Star className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-neutral-900">Mes avis</p>
                                            <p className="text-xs text-neutral-600">Voir les évaluations</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
