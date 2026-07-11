// Shared service types
// Production — real API data only

export type DataSource = 'api';

export interface ServiceResult<T> {
    data: T;
    source: DataSource;
}

/** DRF PageNumberPagination response wrapper */
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

/* -------------------------------------------------------------------------- */
/*  Dashboard domain (ex lib/dashboard.ts)                                    */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  Notifications domain (ex lib/notifications.ts)                            */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  Admin domain (ex lib/admin.ts)                                            */
/* -------------------------------------------------------------------------- */

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
