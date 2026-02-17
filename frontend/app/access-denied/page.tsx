import Link from 'next/link';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';

export default function AccessDeniedPage() {
    return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="mb-6">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                        <ShieldX className="w-10 h-10 text-red-500" />
                    </div>
                </div>

                {/* Message */}
                <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                    Accès Refusé
                </h1>
                <p className="text-neutral-600 mb-8">
                    Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
                    Veuillez vous connecter avec un compte autorisé.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                    >
                        Se connecter
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-200 text-neutral-700 rounded-lg font-medium hover:bg-neutral-300 transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        Accueil
                    </Link>
                </div>

                {/* Help Text */}
                <p className="mt-8 text-sm text-neutral-500">
                    Besoin d&apos;aide ?{' '}
                    <Link href="/help" className="text-primary-600 hover:underline">
                        Contactez le support
                    </Link>
                </p>
            </div>
        </div>
    );
}
