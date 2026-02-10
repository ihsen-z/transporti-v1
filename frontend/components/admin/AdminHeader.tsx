'use client';

import { Bell, Search, Shield, Activity } from 'lucide-react';

interface AdminHeaderProps {
    title?: string;
}

export default function AdminHeader({ title = 'Admin Panel' }: AdminHeaderProps) {
    return (
        <header className="lg:ml-64 fixed top-0 right-0 left-0 lg:left-64 h-16 bg-white border-b border-slate-200 z-30">
            <div className="h-full px-6 flex items-center justify-between">
                {/* Left - Title */}
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-slate-800">{title}</h1>
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm">
                        <Activity className="w-4 h-4" />
                        <span className="font-medium">Système OK</span>
                    </div>
                </div>

                {/* Right - Actions */}
                <div className="flex items-center gap-4">
                    {/* Search (placeholder) */}
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-slate-500">
                        <Search className="w-4 h-4" />
                        <span className="text-sm">Rechercher...</span>
                    </div>

                    {/* Notifications */}
                    <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>

                    {/* Admin Badge */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm font-medium">Admin</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
