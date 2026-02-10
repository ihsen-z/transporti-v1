'use client';

import { useState } from 'react';
import { Package, CreditCard, Shield, AlertCircle, Star, Bell as BellIcon, Check, CheckCheck, Filter } from 'lucide-react';
import { mockNotifications, formatTimeAgo, getCategoryColor } from '@/lib/notifications';
import type { Notification } from '@/lib/notifications';

const categoryIcons = {
    PAYMENT: CreditCard,
    TRUST: Shield,
    JOB: Package,
    DISPUTE: AlertCircle,
    REVIEW: Star,
    SYSTEM: BellIcon,
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.is_read)
        : notifications;

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleMarkAsRead = (id: number) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
    };

    const handleMarkAllAsRead = () => {
        setNotifications(prev =>
            prev.map(n => ({ ...n, is_read: true }))
        );
    };

    return (
        <div className="min-h-screen bg-neutral-50 pt-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-neutral-900 mb-2">Notifications</h1>
                    <p className="text-neutral-600">
                        Restez informé de toutes vos activités sur Transporti V1
                    </p>
                </div>

                {/* Controls */}
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 mb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        {/* Filter Tabs */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                                        ? 'bg-primary-700 text-white'
                                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                    }`}
                            >
                                Toutes ({notifications.length})
                            </button>
                            <button
                                onClick={() => setFilter('unread')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'unread'
                                        ? 'bg-primary-700 text-white'
                                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                    }`}
                            >
                                Non lues ({unreadCount})
                            </button>
                        </div>

                        {/* Mark All Read */}
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="flex items-center gap-2 px-4 py-2 text-primary-700 hover:text-primary-800 hover:bg-primary-50 rounded-lg font-medium transition-colors"
                            >
                                <CheckCheck className="w-5 h-5" />
                                Tout marquer comme lu
                            </button>
                        )}
                    </div>
                </div>

                {/* Notifications List */}
                {filteredNotifications.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12">
                        <div className="flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                                <BellIcon className="w-10 h-10 text-neutral-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                                {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
                            </h3>
                            <p className="text-neutral-600 max-w-md">
                                {filter === 'unread'
                                    ? 'Vous avez lu toutes vos notifications. Bon travail !'
                                    : 'Vous n\'avez pas encore de notifications. Elles apparaîtront ici.'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredNotifications.map((notification) => {
                            const Icon = categoryIcons[notification.category];
                            const colorClasses = getCategoryColor(notification.category);

                            return (
                                <div
                                    key={notification.id}
                                    className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-md ${!notification.is_read
                                            ? 'border-primary-200 bg-blue-50/30'
                                            : 'border-neutral-200'
                                        }`}
                                >
                                    <div className="p-6">
                                        <div className="flex gap-4">
                                            {/* Icon */}
                                            <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses}`}>
                                                <Icon className="w-6 h-6" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={`text-lg font-semibold ${!notification.is_read ? 'text-neutral-900' : 'text-neutral-700'
                                                            }`}>
                                                            {notification.title}
                                                        </h3>
                                                        {!notification.is_read && (
                                                            <span className="flex-shrink-0 w-2.5 h-2.5 bg-cta-500 rounded-full animate-pulse" />
                                                        )}
                                                    </div>
                                                    <span className="flex-shrink-0 text-sm text-neutral-500">
                                                        {formatTimeAgo(notification.created_at)}
                                                    </span>
                                                </div>

                                                <p className="text-neutral-700 mb-4 leading-relaxed">
                                                    {notification.message}
                                                </p>

                                                {/* Metadata */}
                                                {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        {notification.metadata.amount && (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent-50 text-accent-700">
                                                                {notification.metadata.amount} TND
                                                            </span>
                                                        )}
                                                        {notification.metadata.job_id && (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-700">
                                                                Job #{notification.metadata.job_id}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                {!notification.is_read && (
                                                    <button
                                                        onClick={() => handleMarkAsRead(notification.id)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        Marquer comme lu
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
