'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Truck, ArrowRight, Sparkles, Mail, Lock, Eye, EyeOff, Phone, UserCircle } from 'lucide-react';
import { useAuth, getDefaultRedirect } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { roleLabels } from '@/lib/auth';

type RegisterRole = 'client' | 'transporter';

const roleOptions: { value: RegisterRole; icon: typeof User; description: string }[] = [
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
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDemoMode, setShowDemoMode] = useState(false);
    const { login, registerWithCredentials } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();

    const handleRealRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!firstName || !lastName || !email || !phone || !password || !passwordConfirm) {
            setError('Veuillez remplir tous les champs.');
            return;
        }
        if (password !== passwordConfirm) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }
        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }

        setIsLoading(true);
        const result = await registerWithCredentials({
            email,
            password,
            password_confirm: passwordConfirm,
            username: email.split('@')[0], // derive username from email
            phone,
            role: selectedRole === 'client' ? 'CLIENT' : 'TRANSPORTER',
            first_name: firstName,
            last_name: lastName,
        });

        if (result.success) {
            showToast('success', 'Inscription réussie ! Bienvenue sur Transporti');
            router.push(getDefaultRedirect(selectedRole));
        } else {
            setError(result.error || 'Erreur lors de l\'inscription.');
        }

        setIsLoading(false);
    };

    const handleDemoRegister = async () => {
        setIsLoading(true);
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

            {showDemoMode ? (
                <>
                    {/* Demo Mode UI */}
                    <div className="mx-6 mt-6 mb-4">
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

                    <div className="px-6 pb-4">
                        <p className="text-sm font-medium text-neutral-700 mb-3">Je suis un...</p>
                        <div className="space-y-3">
                            {roleOptions.map(({ value, icon: Icon, description }) => (
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

                    <div className="px-6 pb-4">
                        <button
                            onClick={handleDemoRegister}
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

                    <div className="px-6 pb-4 text-center">
                        <button
                            onClick={() => setShowDemoMode(false)}
                            className="text-sm text-accent-600 hover:text-accent-700 font-medium"
                        >
                            ← Retour à l&apos;inscription réelle
                        </button>
                    </div>
                </>
            ) : (
                <>
                    {/* Real Registration Form */}
                    <form onSubmit={handleRealRegister} className="px-6 pt-6 pb-4 space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {/* Role Selection */}
                        <div>
                            <p className="text-sm font-medium text-neutral-700 mb-2">Je suis un...</p>
                            <div className="grid grid-cols-2 gap-3">
                                {roleOptions.map(({ value, icon: Icon, description }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setSelectedRole(value)}
                                        className={`
                                            flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center
                                            ${selectedRole === value
                                                ? 'border-accent-500 bg-accent-50'
                                                : 'border-neutral-200 hover:border-neutral-300 bg-white'
                                            }
                                        `}
                                    >
                                        <Icon className={`w-6 h-6 ${selectedRole === value ? 'text-accent-600' : 'text-neutral-400'}`} />
                                        <span className={`text-sm font-medium ${selectedRole === value ? 'text-accent-700' : 'text-neutral-600'}`}>
                                            {roleLabels[value]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Name */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700 mb-1">Prénom</label>
                                <div className="relative">
                                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                                    <input
                                        id="firstName"
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Leila"
                                        className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 mb-1">Nom</label>
                                <input
                                    id="lastName"
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Ben Ali"
                                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="leila@email.com"
                                    className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1">Téléphone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                                <input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="98 765 432"
                                    className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">Mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-12 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
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

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="passwordConfirm" className="block text-sm font-medium text-neutral-700 mb-1">Confirmer le mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                                <input
                                    id="passwordConfirm"
                                    type={showPassword ? 'text' : 'password'}
                                    value={passwordConfirm}
                                    onChange={(e) => setPasswordConfirm(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
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
                                    Créer mon compte
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Demo Mode Toggle */}
                    <div className="px-6 pb-4">
                        <button
                            onClick={() => setShowDemoMode(true)}
                            className="w-full flex items-center justify-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium py-2 border border-primary-200 rounded-xl hover:bg-primary-50 transition-colors"
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
                    Déjà inscrit ?{' '}
                    <Link href="/login" className="text-accent-600 hover:text-accent-700 font-medium">
                        Se connecter
                    </Link>
                </p>
            </div>
        </div>
    );
}
