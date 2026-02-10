'use client';

import AppSidebar from '@/components/navigation/AppSidebar';
import AppHeader from '@/components/navigation/AppHeader';
import BottomNav from '@/components/navigation/BottomNav';
import TrustFooter from '@/components/layout/TrustFooter';
import AuthGuard from '@/components/auth/AuthGuard';

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard allowedRoles={['client', 'transporter', 'admin']}>
            <div className="min-h-screen bg-neutral-50 flex flex-col">
                {/* Desktop Sidebar */}
                <AppSidebar />

                {/* App Header */}
                <AppHeader />

                {/* Main Content */}
                <main className="lg:ml-64 pt-16 pb-20 lg:pb-0 flex-1">
                    {children}
                </main>

                {/* Trust Footer (Desktop) */}
                <div className="lg:ml-64 hidden lg:block">
                    <TrustFooter />
                </div>

                {/* Mobile Bottom Navigation */}
                <BottomNav />
            </div>
        </AuthGuard>
    );
}
