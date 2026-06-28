// Dashboard types & helpers
// Production — real API data only
export interface DashboardStats {
    totalJobs: number;
    completedJobs: number;
    averageRating: number;
    balance: number;
}

export interface Job {
    id: number;
    // Real API fields (TransportJobListSerializer)
    job_type?: 'TRANSPORT' | 'MOVING';
    status: 'DRAFT' | 'PUBLISHED' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED' | 'PENDING' | 'ACCEPTED';
    pickup_address?: string;
    dropoff_address?: string;
    pickup_governorate?: string;
    dropoff_governorate?: string;
    scheduled_time?: string;
    offer_count?: number;
    owner_name?: string;
    created_at: string;
    // Legacy fields (backward compat with existing components)
    title?: string;
    pickup?: string;
    delivery?: string;
    price?: number;
    transporter?: string;
}

export interface UserProfile {
    name: string;
    email: string;
    role: 'CLIENT' | 'TRANSPORTER';
    trust_score: number;
    trust_level: 'VERIFIED' | 'TRUSTED' | 'NEW' | 'SUSPENDED';
}

export function getStatusColor(status: Job['status']): string {
    const colors: Record<string, string> = {
        DRAFT: 'bg-slate-100 text-slate-600',
        PUBLISHED: 'bg-orange-100 text-orange-700',
        MATCHED: 'bg-blue-100 text-blue-700',
        IN_PROGRESS: 'bg-accent-100 text-accent-700',
        COMPLETED: 'bg-green-100 text-green-700',
        CANCELLED: 'bg-neutral-200 text-neutral-700',
        DISPUTED: 'bg-red-100 text-red-700',
        PENDING: 'bg-orange-100 text-orange-700',
        ACCEPTED: 'bg-blue-100 text-blue-700',
    };
    return colors[status] || 'bg-neutral-100 text-neutral-600';
}

export function getStatusLabel(status: Job['status']): string {
    const labels: Record<string, string> = {
        DRAFT: 'Brouillon',
        PUBLISHED: 'Publiée',
        MATCHED: 'Transporteur assigné',
        IN_PROGRESS: 'En cours',
        COMPLETED: 'Terminé',
        CANCELLED: 'Annulé',
        DISPUTED: 'En litige',
        PENDING: 'En attente',
        ACCEPTED: 'Accepté',
    };
    return labels[status] || status;
}

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
