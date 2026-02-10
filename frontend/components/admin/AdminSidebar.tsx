'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Truck,
    Users,
    CreditCard,
    Settings,
    Shield,
    ChevronLeft,
} from 'lucide-react';

const navItems = [
    { href: '/admin/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/admin/jobs', label: 'Transports', icon: Truck },
    { href: '/admin/users', label: 'Utilisateurs', icon: Users },
    { href: '/admin/payments', label: 'Paiements', icon: CreditCard },
];

export default function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white z-40">
            {/* Logo / Brand */}
            <div className="p-6 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg">Transporti</h1>
                        <p className="text-xs text-slate-400">Admin Panel</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                                flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all
                                ${isActive
                                    ? 'bg-primary-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }
                            `}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Retour à l&apos;app
                </Link>
            </div>
        </aside>
    );
}
