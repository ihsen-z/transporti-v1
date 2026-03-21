'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Truck, Shield, ArrowRight, Sparkles, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth, getDefaultRedirect } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { roleLabels, type UserRole } from '@/lib/auth';

type SelectableRole = 'client' | 'transporter' | 'admin';

const roles: { value: SelectableRole; icon: typeof User; description: string }[] = [
    {
        value: 'client',
        icon: User,
        description: 'Envoyer des colis et marchandises',
    },
    {
        value: 'transporter',
        icon: Truck,
        description: 'Proposer des services de transport',
    },
    {
        value: 'admin',
        icon: Shield,
        description: 'Administrer la plateforme',
    },
];

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDemoMode, setShowDemoMode] = useState(false);
    const [selectedRole, setSelectedRole] = useState<SelectableRole>('client');
    const { login, loginWithCredentials } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleRealLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email || !password) {
            setError('Veuillez remplir tous les champs.');
            return;
        }

        setIsLoading(true);
        const result = await loginWithCredentials(email, password);

        if (result.success) {
            showToast('success', 'Connexion réussie !');
            const redirectTo = searchParams.get('redirect') || '/dashboard';
            router.push(redirectTo);
        } else {
            setError(result.error || 'Email ou mot de passe incorrect.');
        }

        setIsLoading(false);
    };

    const handleDemoLogin = async () => {
        setIsLoading(true);
        await new Promise(r => setTimeout(r, 800));
        login(selectedRole);
        showToast('success', `Connexion réussie en tant que ${roleLabels[selectedRole]}`);
        const redirectTo = searchParams.get('redirect') || getDefaultRedirect(selectedRole);
        router.push(redirectTo);
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <svg className="h-10 w-10" viewBox="0 0 40 40" fill="none">
                        <path d="M8 20L20 8L32 20L20 32L8 20Z" fill="#10b981" />
                        <path d="M20 8L32 20L20 32" fill="white" fillOpacity="0.3" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Bienvenue sur Transporti</h1>
                <p className="text-primary-100 text-sm">Connectez-vous pour accéder à votre espace</p>
            </div>

            {showDemoMode ? (
                <>
                    {/* Demo Mode UI */}
                    <div className="mx-6 mt-6 mb-4">
                        <div className="bg-accent-50 border border-accent-200 rounded-lg p-3 flex items-start gap-2">
                            <Sparkles className="w-5 h-5 text-accent-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-accent-800">Mode Démonstration</p>
                                <p className="text-xs text-accent-600 mt-0.5">
                                    Sélectionnez un rôle pour explorer l&apos;application
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 pb-4">
                        <p className="text-sm font-medium text-neutral-700 mb-3">Choisissez votre profil</p>
                        <div className="space-y-3">
                            {roles.map(({ value, icon: Icon, description }) => (
                                <button
                                    key={value}
                                    onClick={() => setSelectedRole(value)}
                                    className={`
                                        w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all
                                        ${selectedRole === value
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-neutral-200 hover:border-neutral-300 bg-white'
                                        }
                                    `}
                                >
                                    <div className={`
                                        w-12 h-12 rounded-lg flex items-center justify-center
                                        ${selectedRole === value
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-neutral-100 text-neutral-600'
                                        }
                                    `}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className={`font-semibold ${selectedRole === value ? 'text-primary-700' : 'text-neutral-800'}`}>
                                            {roleLabels[value]}
                                        </p>
                                        <p className="text-sm text-neutral-500">{description}</p>
                                    </div>
                                    {selectedRole === value && (
                                        <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="px-6 pb-4">
                        <button
                            onClick={handleDemoLogin}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Connexion en cours...
                                </>
                            ) : (
                                <>
                                    Entrer en mode démo
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="px-6 pb-4 text-center">
                        <button
                            onClick={() => setShowDemoMode(false)}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                            ← Retour à la connexion réelle
                        </button>
                    </div>
                </>
            ) : (
                <>
                    {/* Real Login Form */}
                    <form onSubmit={handleRealLogin} className="px-6 pt-6 pb-4 space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                                Adresse email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="votre@email.com"
                                    className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
                                Mot de passe
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-12 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Connexion en cours...
                                </>
                            ) : (
                                <>
                                    Se connecter
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Demo Mode Toggle */}
                    <div className="px-6 pb-4">
                        <button
                            onClick={() => setShowDemoMode(true)}
                            className="w-full flex items-center justify-center gap-2 text-sm text-accent-600 hover:text-accent-700 font-medium py-2 border border-accent-200 rounded-xl hover:bg-accent-50 transition-colors"
                        >
                            <Sparkles className="w-4 h-4" />
                            Explorer en mode démonstration
                        </button>
                    </div>
                </>
            )}

            {/* Footer Links */}
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 text-center">
                <p className="text-sm text-neutral-500">
                    Pas encore de compte ?{' '}
                    <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                        S&apos;inscrire
                    </Link>
                </p>
            </div>
        </div>
    );
}
