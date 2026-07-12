// UI formatting helpers (colors, labels, dates, currency)
// Regroupe les helpers des ex-wrappers lib/admin.ts, lib/dashboard.ts, lib/notifications.ts.

import type {
    Job,
    UserProfile,
    Notification,
    AdminUser,
    AdminPayment,
    ActivityLog,
    SystemAlert,
} from './services/types';

/* -------------------------------------------------------------------------- */
/*  Currency & dates                                                          */
/* -------------------------------------------------------------------------- */

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-TN', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount) + ' TND';
}

export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-TN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-TN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatTimeAgoShort(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'À l\'instant';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}j`;
}

export function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/* -------------------------------------------------------------------------- */
/*  Job status : supprimé — utiliser components/ui/StatusBadge (couleurs +    */
/*  libellés i18n unifiés). Ne pas réintroduire de mapping statut→couleur ici. */
/* -------------------------------------------------------------------------- */

export function getTrustLevelColor(level: UserProfile['trust_level']): string {
    const colors = {
        VERIFIED: 'bg-accent-100 text-accent-700',
        TRUSTED: 'bg-blue-100 text-blue-700',
        NEW: 'bg-neutral-100 text-neutral-700',
        SUSPENDED: 'bg-error-100 text-error-700',
    };
    return colors[level];
}

export function getTrustLevelLabel(level: UserProfile['trust_level']): string {
    const labels = {
        VERIFIED: 'Vérifié',
        TRUSTED: 'Fiable',
        NEW: 'Nouveau',
        SUSPENDED: 'Suspendu',
    };
    return labels[level];
}

/* -------------------------------------------------------------------------- */
/*  Notifications (ex lib/notifications.ts)                                   */
/* -------------------------------------------------------------------------- */

export function getUnreadCount(notifications: Notification[]): number {
    return notifications.filter(n => !n.is_read).length;
}

export function getCategoryColor(category: Notification['category']): string {
    const colors = {
        PAYMENT: 'text-accent-600 bg-accent-50',
        TRUST: 'text-primary-600 bg-primary-50',
        JOB: 'text-blue-600 bg-blue-50',
        DISPUTE: 'text-orange-600 bg-orange-50',
        REVIEW: 'text-purple-600 bg-purple-50',
        SYSTEM: 'text-neutral-600 bg-neutral-50',
    };
    return colors[category] || colors.SYSTEM;
}

export function getCategoryIcon(category: Notification['category']): string {
    const icons = {
        PAYMENT: '💰',
        TRUST: '🛡️',
        JOB: '📦',
        DISPUTE: '⚠️',
        REVIEW: '⭐',
        SYSTEM: '🔔',
    };
    return icons[category] || icons.SYSTEM;
}

/* -------------------------------------------------------------------------- */
/*  Admin (ex lib/admin.ts)                                                   */
/* -------------------------------------------------------------------------- */

export function getEscrowStatusColor(status: AdminPayment['status']): string {
    const colors = {
        PENDING: 'bg-orange-100 text-orange-700',
        HELD: 'bg-blue-100 text-blue-700',
        RELEASED: 'bg-green-100 text-green-700',
        REFUNDED: 'bg-purple-100 text-purple-700',
        BLOCKED: 'bg-red-100 text-red-700',
    };
    return colors[status];
}

export function getEscrowStatusLabel(status: AdminPayment['status']): string {
    const labels = {
        PENDING: 'En attente',
        HELD: 'Retenu',
        RELEASED: 'Libéré',
        REFUNDED: 'Remboursé',
        BLOCKED: 'Bloqué',
    };
    return labels[status];
}

export function getUserStatusColor(status: AdminUser['status']): string {
    const colors = {
        ACTIVE: 'bg-green-100 text-green-700',
        SUSPENDED: 'bg-red-100 text-red-700',
        PENDING_VERIFICATION: 'bg-orange-100 text-orange-700',
    };
    return colors[status];
}

export function getUserStatusLabel(status: AdminUser['status']): string {
    const labels = {
        ACTIVE: 'Actif',
        SUSPENDED: 'Suspendu',
        PENDING_VERIFICATION: 'En vérification',
    };
    return labels[status];
}

export function getTrustBadgeColor(level: AdminUser['trustLevel']): string {
    const colors = {
        VERIFIED: 'bg-accent-100 text-accent-700 border-accent-200',
        TRUSTED: 'bg-blue-100 text-blue-700 border-blue-200',
        NEW: 'bg-neutral-100 text-neutral-600 border-neutral-200',
        BLOCKED: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[level];
}

export function getAlertSeverityColor(severity: SystemAlert['severity']): string {
    const colors = {
        LOW: 'bg-blue-50 border-blue-200 text-blue-800',
        MEDIUM: 'bg-orange-50 border-orange-200 text-orange-800',
        HIGH: 'bg-red-50 border-red-200 text-red-800',
        CRITICAL: 'bg-red-100 border-red-400 text-red-900',
    };
    return colors[severity];
}

export function getActivityIcon(type: ActivityLog['type']): string {
    const icons = {
        JOB_CREATED: '📦',
        JOB_COMPLETED: '✅',
        ESCROW_RELEASED: '💰',
        DISPUTE_OPENED: '⚠️',
        USER_REGISTERED: '👤',
        VERIFICATION_APPROVED: '✔️',
        TRUST_UPDATED: '📊',
    };
    return icons[type];
}
