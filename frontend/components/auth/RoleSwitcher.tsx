'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels, roleColors, type UserRole } from '@/lib/auth';
import { Users, ChevronDown, Check } from 'lucide-react';

const demoRoles: Exclude<UserRole, 'guest'>[] = ['client', 'transporter', 'admin'];

export default function RoleSwitcher() {
    const { role, switchRole, logout, isAuthenticated } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="relative">
                {/* Toggle Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
                >
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">Mode: {roleLabels[role]}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-lg shadow-xl border border-neutral-200 overflow-hidden">
                        <div className="p-3 bg-neutral-50 border-b border-neutral-200">
                            <p className="text-xs font-medium text-neutral-500 uppercase">Changer de rôle (démo)</p>
                        </div>
                        <div className="p-2">
                            {demoRoles.map((r) => (
                                <button
                                    key={r}
                                    onClick={() => {
                                        switchRole(r);
                                        setIsOpen(false);
                                    }}
                                    className={`
                                        w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                        ${role === r
                                            ? 'bg-primary-50 text-primary-700'
                                            : 'hover:bg-neutral-100 text-neutral-700'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-xs ${roleColors[r]}`}>
                                            {roleLabels[r]}
                                        </span>
                                    </div>
                                    {role === r && <Check className="w-4 h-4 text-primary-600" />}
                                </button>
                            ))}
                        </div>
                        <div className="p-2 border-t border-neutral-200">
                            <button
                                onClick={() => {
                                    logout();
                                    setIsOpen(false);
                                }}
                                className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                            >
                                Déconnexion
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
