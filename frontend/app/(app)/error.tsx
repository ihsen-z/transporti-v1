"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error("[Transporti] App Error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-neutral-900 mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-neutral-600 mb-6">
          Quelque chose s&apos;est mal passé. Veuillez réessayer ou revenir à
          l&apos;accueil.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-medium rounded-lg transition-colors"
          >
            Réessayer
          </button>
          <a
            href="/dashboard"
            className="px-6 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded-lg transition-colors"
          >
            Accueil
          </a>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs text-neutral-400">Réf: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
