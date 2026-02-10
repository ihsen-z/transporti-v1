interface StatusBadgeProps {
    status: string;
    colorClass: string;
    size?: 'sm' | 'md';
}

export default function StatusBadge({ status, colorClass, size = 'sm' }: StatusBadgeProps) {
    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
    };

    return (
        <span className={`inline-flex items-center font-medium rounded-full ${sizeClasses[size]} ${colorClass}`}>
            {status}
        </span>
    );
}

// Pre-built badge variants for common statuses
export function JobStatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        PENDING: 'bg-orange-100 text-orange-700',
        ACCEPTED: 'bg-blue-100 text-blue-700',
        IN_PROGRESS: 'bg-cyan-100 text-cyan-700',
        COMPLETED: 'bg-green-100 text-green-700',
        CANCELLED: 'bg-slate-100 text-slate-600',
    };
    const labels: Record<string, string> = {
        PENDING: 'En attente',
        ACCEPTED: 'Accepté',
        IN_PROGRESS: 'En cours',
        COMPLETED: 'Terminé',
        CANCELLED: 'Annulé',
    };
    return <StatusBadge status={labels[status] || status} colorClass={colors[status] || colors.PENDING} />;
}

export function UserStatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        ACTIVE: 'bg-green-100 text-green-700',
        SUSPENDED: 'bg-red-100 text-red-700',
        PENDING_VERIFICATION: 'bg-orange-100 text-orange-700',
    };
    const labels: Record<string, string> = {
        ACTIVE: 'Actif',
        SUSPENDED: 'Suspendu',
        PENDING_VERIFICATION: 'Vérification',
    };
    return <StatusBadge status={labels[status] || status} colorClass={colors[status] || colors.ACTIVE} />;
}

export function TrustBadge({ level, score }: { level: string; score: number }) {
    const colors: Record<string, string> = {
        VERIFIED: 'bg-accent-100 text-accent-700 border border-accent-200',
        TRUSTED: 'bg-blue-100 text-blue-700 border border-blue-200',
        NEW: 'bg-slate-100 text-slate-600 border border-slate-200',
        BLOCKED: 'bg-red-100 text-red-700 border border-red-200',
    };

    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-green-600';
        if (s >= 60) return 'text-blue-600';
        if (s >= 40) return 'text-orange-600';
        return 'text-red-600';
    };

    return (
        <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${colors[level] || colors.NEW}`}>
                {level}
            </span>
            <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
                {score}
            </span>
        </div>
    );
}

export function PaymentStatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        PENDING: 'bg-orange-100 text-orange-700',
        HELD: 'bg-blue-100 text-blue-700',
        RELEASED: 'bg-green-100 text-green-700',
        REFUNDED: 'bg-purple-100 text-purple-700',
        BLOCKED: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
        PENDING: 'En attente',
        HELD: 'Retenu',
        RELEASED: 'Libéré',
        REFUNDED: 'Remboursé',
        BLOCKED: 'Bloqué',
    };
    return <StatusBadge status={labels[status] || status} colorClass={colors[status] || colors.PENDING} />;
}

export function RoleBadge({ role }: { role: string }) {
    const colors: Record<string, string> = {
        CLIENT: 'bg-blue-100 text-blue-700',
        TRANSPORTER: 'bg-purple-100 text-purple-700',
        ADMIN: 'bg-slate-800 text-white',
    };
    const labels: Record<string, string> = {
        CLIENT: 'Client',
        TRANSPORTER: 'Transporteur',
        ADMIN: 'Admin',
    };
    return <StatusBadge status={labels[role] || role} colorClass={colors[role] || colors.CLIENT} />;
}
