import Link from "next/link";
import { ShieldX, Home } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-5">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-error-50 rounded-full flex items-center justify-center mx-auto">
            <ShieldX className="w-10 h-10 text-error-500" />
          </div>
        </div>

        {/* Message */}
        <h1 className="text-[21px] font-extrabold tracking-heading text-ink-900 mb-2">
          Accès Refusé
        </h1>
        <p className="text-neutral-600 mb-8">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette
          page. Veuillez vous connecter avec un compte autorisé.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="btn-base min-h-[48px] rounded-cta bg-blue-700 px-5 text-[15px] text-white shadow-blue transition-colors duration-120 hover:bg-blue-800 active:translate-y-px"
          >
            Se connecter
          </Link>
          <Link
            href="/"
            className="btn-base min-h-[48px] rounded-cta border border-line-strong bg-surface px-5 text-[15px] text-ink-900 transition-colors duration-120 hover:border-blue-700 hover:bg-app active:translate-y-px"
          >
            <Home className="w-4 h-4" />
            Accueil
          </Link>
        </div>

        {/* Help Text */}
        <p className="mt-8 text-sm text-neutral-500">
          Besoin d&apos;aide ?{" "}
          <Link href="/aide" className="text-brand-600 hover:underline">
            Contactez le support
          </Link>
        </p>
      </div>
    </div>
  );
}
