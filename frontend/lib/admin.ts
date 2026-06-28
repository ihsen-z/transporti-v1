// Admin Panel Types & Helpers
// Production — Real API data only

import type { Job } from './dashboard';

// ============================================
// TYPES
// ============================================

export interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    totalTransporters: number;
    verifiedTransporters: number;
    activeJobs: number;
    completedJobs: number;
    pendingJobs: number;
    cancelledJobs: number;
    totalEscrow: number;
    pendingEscrow: number;
    blockedEscrow: number;
    releasedEscrow: number;
    platformRevenue: number;
    activeDisputes: number;
    avgTrustScore: number;
}

export interface AdminJob extends Job {
    clientName: string;
    clientEmail: string;
    transporterName?: string;
    transporterEmail?: string;
    escrowStatus: 'PENDING' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'BLOCKED';
    escrowAmount: number;
    paymentMethod: 'ESCROW' | 'COD';
    cityFrom: string;
    cityTo: string;
}

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: 'CLIENT' | 'TRANSPORTER';
    status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
    trustScore: number;
    trustLevel: 'VERIFIED' | 'TRUSTED' | 'NEW' | 'BLOCKED';
    jobsCompleted: number;
    jobsActive: number;
    createdAt: string;
    lastSeenAt: string;
    totalSpent?: number;
    totalEarned?: number;
}

export interface AdminPayment {
    id: number;
    jobId: number;
    clientName: string;
    transporterName: string;
    amount: number;
    type: 'ESCROW' | 'COD';
    status: 'PENDING' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'BLOCKED';
    createdAt: string;
    updatedAt: string;
}

export interface ActivityLog {
    id: number;
    type: 'JOB_CREATED' | 'JOB_COMPLETED' | 'ESCROW_RELEASED' | 'DISPUTE_OPENED' | 'USER_REGISTERED' | 'VERIFICATION_APPROVED' | 'TRUST_UPDATED';
    message: string;
    userId?: number;
    userName?: string;
    timestamp: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
}

export interface SystemAlert {
    id: number;
    type: 'STUCK_ESCROW' | 'HIGH_DISPUTE_RATE' | 'LOW_TRUST_USER' | 'PAYMENT_FAILURE' | 'SYSTEM_WARNING';
    title: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    createdAt: string;
    isRead: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

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
