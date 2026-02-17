'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Truck, Bell, Play, PlusCircle, Search, ShieldCheck, FileText, MessageSquare, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import NavItem from './NavItem';

export default function AppSidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    const commonItems = [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
        { href: '/jobs', icon: Truck, label: 'Mes Transports' },
        { href: '/notifications', icon: Bell, label: 'Notifications' },
        { href: '/settings', icon: Settings, label: 'Paramètres' },
    ];

    const clientItems = [
        { href: '/jobs/new', icon: PlusCircle, label: 'Publier une annonce' },
        { href: '/messages', icon: MessageSquare, label: 'Messages' },
    ];

    const transporterItems = [
        { href: '/jobs/browse', icon: Search, label: 'Trouver une mission' },
        { href: '/offers', icon: FileText, label: 'Mes offres' },
        { href: '/messages/1', icon: MessageSquare, label: 'Messages' },
        { href: '/verification', icon: ShieldCheck, label: 'Vérification' },
    ];

    let items = [...commonItems];
    if (user?.role === 'CLIENT') {
        items = [...clientItems, ...items];
    } else if (user?.role === 'TRANSPORTER') {
        items = [...items, ...transporterItems];
    }

    // Always include simulation for prototype
    items.push({ href: '/simulation/delivery', icon: Play, label: 'Simulation MVP' });

    return (
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-neutral-200 h-screen fixed left-0 top-0 pt-0 z-sidebar">
            {/* Logo Area */}
            <div className="px-6 py-6 border-b border-neutral-100 h-16 flex items-center">
                <Link href="/" className="flex items-center gap-3">
                    <div className="flex items-center text-blue-600">
                        <Truck className="w-8 h-8" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-bold text-neutral-900 leading-none">Transporti</span>
                        <span className="text-[10px] text-neutral-500 font-medium">PARTNER</span>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {items.map((item) => (
                    <NavItem key={item.href} {...item} isActive={pathname === item.href} />
                ))}
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-neutral-100">
                <div className="px-4 py-3 bg-neutral-50 rounded-lg">
                    <p className="text-xs text-neutral-500 mb-1">Connecté en tant que</p>
                    <p className="text-sm font-bold text-neutral-900 truncate">
                        {user?.first_name || 'Utilisateur'}
                    </p>
                    <p className="text-xs text-blue-600 font-medium">{user?.role || 'Guest'}</p>
                </div>
            </div>
        </aside>
    );
}

