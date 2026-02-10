'use client';

import { useState } from 'react';
import NotificationBell from '@/components/notifications/NotificationBell';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import { mockNotifications, getUnreadCount } from '@/lib/notifications';
import type { Notification } from '@/lib/notifications';

export default function Header() {
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const unreadCount = getUnreadCount(notifications);

    const handleMarkAsRead = (id: number) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
    };

    const handleMarkAllAsRead = () => {
        setNotifications(prev =>
            prev.map(n => ({ ...n, is_read: true }))
        );
    };

    return (
        <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-fixed">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                            <svg className="h-8 w-8" viewBox="0 0 40 40" fill="none">
                                <path d="M8 20L20 8L32 20L20 32L8 20Z" fill="#10b981" />
                                <path d="M20 8L32 20L20 32" fill="#1e40af" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-gray-900">Transporti V1</span>
                            <span className="text-xs text-gray-500">Transporti.com</span>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center space-x-8">
                        <a href="#" className="text-blue-700 font-medium border-b-2 border-blue-700 pb-1">
                            Accueil
                        </a>
                        <a href="#" className="text-gray-700 hover:text-blue-700 font-medium">
                            Services
                        </a>
                        <a href="#" className="text-gray-700 hover:text-blue-700 font-medium">
                            Transporteurs
                        </a>
                        <a href="#" className="text-gray-700 hover:text-blue-700 font-medium">
                            Aide
                        </a>
                    </nav>

                    <div className="flex items-center gap-3">
                        {/* Notification Bell */}
                        <div className="relative">
                            <NotificationBell
                                unreadCount={unreadCount}
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            />
                            <NotificationDropdown
                                notifications={notifications}
                                isOpen={isDropdownOpen}
                                onClose={() => setIsDropdownOpen(false)}
                                onMarkAsRead={handleMarkAsRead}
                                onMarkAllAsRead={handleMarkAllAsRead}
                            />
                        </div>

                        {/* Login Button */}
                        <button className="bg-blue-700 hover:bg-blue-800 text-white font-medium px-6 py-2 rounded-lg">
                            Se connecter
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
