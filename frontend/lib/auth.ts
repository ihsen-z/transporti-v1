// Auth Types & Route Configuration
// Production — real API authentication

export type UserRole = 'guest' | 'client' | 'transporter' | 'admin';

export interface AuthUser {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    phone?: string;
    role: UserRole;
    avatar?: string;
    trustScore?: number;
    is_verified?: boolean;
}

// Role display labels
export const roleLabels: Record<UserRole, string> = {
    guest: 'Visiteur',
    client: 'Client',
    transporter: 'Transporteur',
    admin: 'Administrateur',
};

// Role colors for badges
export const roleColors: Record<UserRole, string> = {
    guest: 'bg-neutral-100 text-neutral-600',
    client: 'bg-blue-100 text-blue-700',
    transporter: 'bg-purple-100 text-purple-700',
    admin: 'bg-slate-800 text-white',
};

// Route access configuration
export const routeAccess: Record<string, UserRole[]> = {
    // Public routes
    '/': ['guest', 'client', 'transporter', 'admin'],
    '/login': ['guest', 'client', 'transporter', 'admin'],
    '/register': ['guest', 'client', 'transporter', 'admin'],
    '/help': ['guest', 'client', 'transporter', 'admin'],
    '/terms': ['guest', 'client', 'transporter', 'admin'],
    '/privacy': ['guest', 'client', 'transporter', 'admin'],
    '/access-denied': ['guest', 'client', 'transporter', 'admin'],

    // User routes (authenticated)
    '/dashboard': ['client', 'transporter', 'admin'],
    '/jobs': ['client', 'transporter', 'admin'],
    '/jobs/new': ['client', 'admin'],
    '/jobs/browse': ['client', 'transporter', 'admin'],
    '/jobs/return-trip': ['transporter'],
    '/offers': ['transporter'],
    '/messages': ['client', 'transporter', 'admin'],
    '/notifications': ['client', 'transporter', 'admin'],
    '/settings': ['client', 'transporter', 'admin'],
    '/profile': ['client', 'transporter', 'admin'],
    '/verification': ['client', 'transporter', 'admin'],
    '/disputes': ['client', 'transporter', 'admin'],
    '/transporter': ['client', 'transporter', 'admin'],

    // Admin routes
    '/admin': ['admin'],
};

// Check if a role can access a route
export function canAccess(role: UserRole, pathname: string): boolean {
    // Check exact match first
    if (routeAccess[pathname]) {
        return routeAccess[pathname].includes(role);
    }

    // Check prefix matches (e.g., /jobs/1 matches /jobs)
    for (const route of Object.keys(routeAccess)) {
        if (pathname.startsWith(route + '/') || pathname === route) {
            return routeAccess[route].includes(role);
        }
    }

    // Check /admin/* routes
    if (pathname.startsWith('/admin')) {
        return role === 'admin';
    }

    // Check /jobs/*, /notifications/*, etc.
    if (pathname.startsWith('/dashboard') ||
        pathname.startsWith('/jobs') ||
        pathname.startsWith('/notifications')) {
        return ['client', 'transporter', 'admin'].includes(role);
    }

    // Default: deny access (secure by default)
    return false;
}

// Get redirect path after login based on role
export function getDefaultRedirect(role: UserRole): string {
    switch (role) {
        case 'admin':
            return '/admin/dashboard';
        case 'client':
        case 'transporter':
            return '/dashboard';
        default:
            return '/';
    }
}
