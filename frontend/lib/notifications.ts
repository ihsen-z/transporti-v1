// Notification types & helpers
// Production — real API data only
export interface Notification {
    id: number;
    category: 'PAYMENT' | 'TRUST' | 'JOB' | 'DISPUTE' | 'REVIEW' | 'SYSTEM';
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    metadata?: Record<string, any>;
}

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
