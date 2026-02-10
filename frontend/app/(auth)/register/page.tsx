'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Truck, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth, getDefaultRedirect } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { roleLabels } from '@/lib/auth';

type RegisterRole = 'client' | 'transporter';

const roles: { value: RegisterRole; icon: typeof User; description: string }[] = [
    {
        value: 'client',
        icon: User,
        description: 'Je veux envoyer des colis et marchandises',
    },
    {
        value: 'transporter',
        icon: Truck,
        description: 'Je veux proposer mes services de transport',
    },
];

export default function RegisterPage() {
    const [selectedRole, setSelectedRole] = useState<RegisterRole>('client');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();

    const handleRegister = async () => {
        setIsLoading(true);

        // Simulate network delay
        await new Promise(r => setTimeout(r, 1000));

        login(selectedRole);
        showToast('success', `Inscription réussie ! Bienvenue sur Transporti`);

        router.push(getDefaultRedirect(selectedRole));
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-accent-500 to-accent-600 px-6 py-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <svg className="h-10 w-10" viewBox="0 0 40 40" fill="none">
                        <path d="M8 20L20 8L32 20L20 32L8 20Z" fill="white" />
                        <path d="M20 8L32 20L20 32" fill="#1e40af" fillOpacity="0.3" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Créer un compte</h1>
                <p className="text-accent-100 text-sm">Rejoignez la communauté Transporti</p>
            </div>

            {/* Demo Mode Notice */}
            <div className="mx-6 -mt-4 mb-6">
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-primary-800">Mode Démonstration</p>
                        <p className="text-xs text-primary-600 mt-0.5">
                            Aucune donnée réelle n&apos;est collectée
                        </p>
                    </div>
                </div>
            </div>

            {/* Role Selection */}
            <div className="px-6 pb-6">
                <p className="text-sm font-medium text-neutral-700 mb-3">Je suis un...</p>
                <div className="space-y-3">
                    {roles.map(({ value, icon: Icon, description }) => (
                        <button
                            key={value}
                            onClick={() => setSelectedRole(value)}
                            className={`
                                w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all
                                ${selectedRole === value
                                    ? 'border-accent-500 bg-accent-50'
                                    : 'border-neutral-200 hover:border-neutral-300 bg-white'
                                }
                            `}
                        >
                            <div className={`
                                w-12 h-12 rounded-lg flex items-center justify-center
                                ${selectedRole === value
                                    ? 'bg-accent-500 text-white'
                                    : 'bg-neutral-100 text-neutral-600'
                                }
                            `}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <div className="text-left flex-1">
                                <p className={`font-semibold ${selectedRole === value ? 'text-accent-700' : 'text-neutral-800'}`}>
                                    {roleLabels[value]}
                                </p>
                                <p className="text-sm text-neutral-500">{description}</p>
                            </div>
                            {selectedRole === value && (
                                <div className="w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Submit Button */}
            <div className="px-6 pb-6">
                <button
                    onClick={handleRegister}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-accent-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Création en cours...
                        </>
                    ) : (
                        <>
                            Créer mon compte démo
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </div>

            {/* Footer Links */}
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 text-center">
                <p className="text-sm text-neutral-500">
                    Déjà inscrit ?{' '}
                    <Link href="/login" className="text-accent-600 hover:text-accent-700 font-medium">
                        Se connecter
                    </Link>
                </p>
            </div>
        </div>
    );
}
