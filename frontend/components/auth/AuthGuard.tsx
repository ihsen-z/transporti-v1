'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess, type UserRole } from '@/lib/auth';

interface AuthGuardProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
    redirectTo?: string;
}

export default function AuthGuard({
    children,
    allowedRoles,
    redirectTo = '/access-denied',
}: AuthGuardProps) {
    const { role, isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // If specific roles are provided, check against them
        if (allowedRoles) {
            if (!allowedRoles.includes(role)) {
                if (role === 'guest') {
                    router.replace('/login?redirect=' + encodeURIComponent(pathname));
                } else {
                    router.replace(redirectTo);
                }
                return;
            }
        } else {
            // Otherwise use the route access config
            if (!canAccess(role, pathname)) {
                if (role === 'guest') {
                    router.replace('/login?redirect=' + encodeURIComponent(pathname));
                } else {
                    router.replace(redirectTo);
                }
                return;
            }
        }

        setIsChecking(false);
    }, [role, pathname, allowedRoles, redirectTo, router, isAuthenticated]);

    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-neutral-500">Vérification des accès...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
