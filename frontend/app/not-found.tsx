import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Visual */}
        <div className="mb-6">
          <p className="text-8xl font-bold text-neutral-200">404</p>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Page introuvable
        </h1>
        <p className="text-neutral-500 mb-8">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Accueil
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-200 text-neutral-700 rounded-lg font-medium hover:bg-neutral-300 transition-colors"
          >
            Tableau de bord
          </Link>
        </div>

        {/* Help */}
        <p className="mt-8 text-sm text-neutral-400">
          Besoin d&apos;aide ?{" "}
          <Link href="/help" className="text-brand-600 hover:underline">
            Centre d&apos;aide
          </Link>
        </p>
      </div>
    </div>
  );
}
