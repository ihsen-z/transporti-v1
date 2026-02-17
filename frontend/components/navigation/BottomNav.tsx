'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Truck, Bell, Play, MessageSquare } from 'lucide-react';

const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
    { href: '/jobs', icon: Truck, label: 'Transports' },
    { href: '/messages', icon: MessageSquare, label: 'Messages' },
    { href: '/notifications', icon: Bell, label: 'Notifs' },
    { href: '/simulation/delivery', icon: Play, label: 'Simulation' },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-fixed safe-area-bottom">
            <div className="flex items-center justify-around h-16">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                flex flex-col items-center justify-center flex-1 h-full py-2 px-1
                transition-colors duration-200
                ${isActive
                                    ? 'text-primary-700'
                                    : 'text-neutral-500 hover:text-neutral-700'
                                }
              `}
                        >
                            <div className={`
                relative p-1.5 rounded-lg transition-colors
                ${isActive ? 'bg-primary-100' : ''}
              `}>
                                <Icon className="w-5 h-5" />
                                {isActive && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary-600 rounded-full" />
                                )}
                            </div>
                            <span className={`text-xs mt-1 font-medium ${isActive ? 'text-primary-700' : ''}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
