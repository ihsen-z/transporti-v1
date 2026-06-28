// Admin Data Service
// Production — Real API data only

import { apiClient } from '@/lib/api/client';
import {
    type AdminStats,
    type AdminJob,
    type AdminUser,
    type AdminPayment,
    type ActivityLog,
    type SystemAlert,
} from '@/lib/admin';

interface ServiceResult<T> {
    data: T;
    source: 'api';
}

/* -------------------------------------------------------------------------- */
/*  Backend Dispute API Types (match DisputeListSerializer)                    */
/* -------------------------------------------------------------------------- */

export interface BackendDispute {
    id: number;
    job: number;
    reason: string;
    status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'REJECTED';
    description: string;
    opened_by: number;
    opened_by_name: string;
    job_summary: {
        id: number;
        type: string;
        status: string;
        pickup?: string;
        dropoff?: string;
    };
    created_at: string;
    updated_at?: string;
    resolved_at: string | null;
    resolved_by?: number;
    resolved_by_name?: string | null;
    resolution_notes?: string;
}

/* -------------------------------------------------------------------------- */
/*  Backend Escrow API Types (match EscrowDetailSerializer)                    */
/* -------------------------------------------------------------------------- */

export interface BackendEscrow {
    id: number;
    job_id: number;
    status: string;
    amount: number;
    gateway_reference: string;
    created_at: string;
    updated_at: string;
    client_name?: string;
    transporter_name?: string;
}

/* -------------------------------------------------------------------------- */
/*  Admin Data Services — API Only                                             */
/* -------------------------------------------------------------------------- */

export async function getAdminStats(): Promise<ServiceResult<AdminStats>> {
    const data = await apiClient.get<AdminStats>('/api/admin/stats/');
    return { data, source: 'api' };
}

export async function getAdminJobs(): Promise<ServiceResult<AdminJob[]>> {
    const response = await apiClient.get<any>('/api/admin/jobs/');
    const data: AdminJob[] = response.results ?? (Array.isArray(response) ? response : []);
    return { data, source: 'api' };
}

export async function getAdminUsers(): Promise<ServiceResult<AdminUser[]>> {
    const response = await apiClient.get<any>('/api/admin/users/');
    const data: AdminUser[] = response.results ?? (Array.isArray(response) ? response : []);
    return { data, source: 'api' };
}

export async function getAdminPayments(): Promise<ServiceResult<AdminPayment[]>> {
    const rawResponse = await apiClient.get<any>('/api/admin/escrow/');
    const raw: BackendEscrow[] = rawResponse.results ?? (Array.isArray(rawResponse) ? rawResponse : []);
    const data: AdminPayment[] = raw.map(e => ({
        id: e.id,
        jobId: e.job_id,
        clientName: e.client_name || '-',
        transporterName: e.transporter_name || '-',
        amount: Number(e.amount),
        type: 'ESCROW' as const,
        status: e.status as AdminPayment['status'],
        createdAt: e.created_at,
        updatedAt: e.updated_at,
    }));
    return { data, source: 'api' };
}

export async function getActivityLogs(): Promise<ServiceResult<ActivityLog[]>> {
    const data = await apiClient.get<ActivityLog[]>('/api/admin/activity/');
    return { data, source: 'api' };
}

export async function getSystemAlerts(): Promise<ServiceResult<SystemAlert[]>> {
    const data = await apiClient.get<SystemAlert[]>('/api/admin/alerts/');
    return { data, source: 'api' };
}

/* -------------------------------------------------------------------------- */
/*  Dispute Admin Services                                                     */
/* -------------------------------------------------------------------------- */

export async function getAdminDisputes(): Promise<ServiceResult<BackendDispute[]>> {
    const response = await apiClient.get<any>('/api/admin/disputes/?all=true');
    const data: BackendDispute[] = response.results ?? (Array.isArray(response) ? response : []);
    return { data, source: 'api' };
}

export async function investigateDispute(disputeId: number): Promise<BackendDispute> {
    const response = await apiClient.post<{ message: string; dispute: BackendDispute }>(
        `/api/admin/disputes/${disputeId}/investigate/`,
        {}
    );
    return response.dispute;
}

export async function resolveDispute(disputeId: number, resolutionNotes: string): Promise<BackendDispute> {
    const response = await apiClient.post<{ message: string; dispute: BackendDispute }>(
        `/api/admin/disputes/${disputeId}/resolve/`,
        { resolution_notes: resolutionNotes }
    );
    return response.dispute;
}

export async function rejectDispute(disputeId: number, resolutionNotes: string): Promise<BackendDispute> {
    const response = await apiClient.post<{ message: string; dispute: BackendDispute }>(
        `/api/admin/disputes/${disputeId}/reject/`,
        { resolution_notes: resolutionNotes }
    );
    return response.dispute;
}

/* -------------------------------------------------------------------------- */
/*  Verification Admin Services                                                */
/* -------------------------------------------------------------------------- */

export interface BackendVerification {
    id: number;
    transporterName: string;
    transporterEmail: string;
    profileId: number;
    documentType: string;
    status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
    submittedAt: string;
    reviewedAt?: string;
    reviewerNote?: string;
    documentUrl: string;
    trustScore: number;
    documentCount: number;
}

export async function getAdminVerifications(): Promise<ServiceResult<BackendVerification[]>> {
    const data = await apiClient.get<BackendVerification[]>('/api/trust/admin/verifications/');
    return { data, source: 'api' };
}

export async function approveVerification(id: number, notes?: string): Promise<BackendVerification> {
    const response = await apiClient.post<{ message: string; verification: BackendVerification }>(
        `/api/trust/admin/verifications/${id}/approve/`,
        { notes: notes || '' }
    );
    return response.verification;
}

export async function rejectVerification(id: number, reason: string): Promise<BackendVerification> {
    const response = await apiClient.post<{ message: string; verification: BackendVerification }>(
        `/api/trust/admin/verifications/${id}/reject/`,
        { reason }
    );
    return response.verification;
}

/* -------------------------------------------------------------------------- */
/*  Review Admin Services                                                      */
/* -------------------------------------------------------------------------- */

export interface BackendReviewAbuseLog {
    detector: string;
    reason: string;
    severity: string;
    at: string;
}

export interface BackendReview {
    id: number;
    jobId: number;
    reviewerName: string;
    reviewerEmail: string;
    targetName: string;
    role: 'CLIENT' | 'TRANSPORTER';
    rating: number;
    comment: string;
    flagReason: string;
    isHidden: boolean;
    createdAt: string;
    abuseLogs: BackendReviewAbuseLog[];
}

export async function getAdminReviews(): Promise<ServiceResult<BackendReview[]>> {
    const data = await apiClient.get<BackendReview[]>('/api/admin/reviews/');
    return { data, source: 'api' };
}

export async function toggleReviewVisibility(id: number, reason?: string): Promise<BackendReview> {
    const response = await apiClient.patch<{ message: string; review: BackendReview }>(
        `/api/admin/reviews/${id}/visibility/`,
        { reason: reason || '' }
    );
    return response.review;
}

/* -------------------------------------------------------------------------- */
/*  Per-Document Review Services                                               */
/* -------------------------------------------------------------------------- */

export interface AdminDocument {
    id: number;
    documentType: string;
    documentTypeLabel: string;
    isValid: boolean;
    rejectionReason: string;
    fileUrl: string;
    reviewedAt: string | null;
    reviewedBy: string;
    uploadedAt: string;
}

export interface TransporterDocumentsResponse {
    profileId: number;
    transporterName: string;
    transporterEmail: string;
    verificationStatus: string;
    trustScore: number;
    documents: AdminDocument[];
}

export async function getTransporterDocuments(profileId: number): Promise<TransporterDocumentsResponse> {
    return apiClient.get<TransporterDocumentsResponse>(
        `/api/trust/admin/verifications/${profileId}/documents/`
    );
}

export async function reviewDocument(
    docId: number,
    action: 'approve' | 'reject',
    reason?: string
): Promise<{ message: string; document: AdminDocument; profileStatus: string }> {
    return apiClient.patch<{ message: string; document: AdminDocument; profileStatus: string }>(
        `/api/trust/admin/documents/${docId}/review/`,
        { action, reason: reason || '' }
    );
}

/* -------------------------------------------------------------------------- */
/*  Admin Profiles (All Transporters)                                          */
/* -------------------------------------------------------------------------- */

export interface AdminTrustProfile {
    id: number;
    transporterName: string;
    transporterEmail: string;
    verificationStatus: string;
    trustScore: number;
    documentCount: number;
    approvedCount: number;
    rejectedCount: number;
    pendingCount: number;
    createdAt: string;
    verifiedAt: string | null;
}

export async function getAdminProfiles(): Promise<ServiceResult<AdminTrustProfile[]>> {
    const data = await apiClient.get<AdminTrustProfile[]>('/api/trust/admin/profiles/');
    return { data, source: 'api' };
}

/* -------------------------------------------------------------------------- */
/*  Admin User Actions (Sprint 1 R2)                                           */
/* -------------------------------------------------------------------------- */

export async function suspendUser(userId: number, reason?: string): Promise<{ message: string; userId: number; status: string }> {
    return apiClient.patch(`/api/admin/users/${userId}/suspend/`, { reason: reason || '' });
}

export async function activateUser(userId: number): Promise<{ message: string; userId: number; status: string }> {
    return apiClient.patch(`/api/admin/users/${userId}/activate/`, {});
}

export async function resetUserPassword(userId: number): Promise<{ message: string; userId: number; temporaryPassword: string; emailSent: boolean }> {
    return apiClient.post(`/api/admin/users/${userId}/reset-password/`, {});
}

/* -------------------------------------------------------------------------- */
/*  Admin Job Actions (Sprint 5 R9)                                            */
/* -------------------------------------------------------------------------- */

export async function cancelJob(jobId: number, reason: string): Promise<{ message: string; status: string }> {
    return apiClient.post(`/api/admin/jobs/${jobId}/cancel/`, { reason });
}

export async function forceJobStatus(jobId: number, status: string, reason: string): Promise<{ message: string; status: string }> {
    return apiClient.patch(`/api/admin/jobs/${jobId}/status/`, { status, reason });
}

/* -------------------------------------------------------------------------- */
/*  Admin User Warn (R1)                                                       */
/* -------------------------------------------------------------------------- */

export async function warnUser(userId: number, reason: string): Promise<{ message: string; userId: number; notificationSent: boolean; emailSent: boolean }> {
    return apiClient.post(`/api/admin/users/${userId}/warn/`, { reason });
}

/* -------------------------------------------------------------------------- */
/*  Admin Escrow Management (P1)                                               */
/* -------------------------------------------------------------------------- */

export async function releaseEscrow(escrowId: number, reason: string): Promise<{ message: string; escrowId: number; status: string }> {
    return apiClient.post(`/api/admin/escrow/${escrowId}/release/`, { reason });
}

export async function refundEscrow(escrowId: number, reason: string): Promise<{ message: string; escrowId: number; status: string }> {
    return apiClient.post(`/api/admin/escrow/${escrowId}/refund/`, { reason });
}

/* -------------------------------------------------------------------------- */
/*  Admin User Edit (Phase 5 U4)                                               */
/* -------------------------------------------------------------------------- */

export async function editUser(
    userId: number,
    data: { first_name?: string; last_name?: string; phone?: string; role?: string }
): Promise<{ message: string; userId: number; changes: Record<string, { old: string; new: string }> }> {
    return apiClient.patch(`/api/admin/users/${userId}/edit/`, data);
}
