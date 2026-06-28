import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-brand-50 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* Animated 404 Number */}
        <div className="relative mb-8">
          <h1 className="text-[160px] font-black text-transparent bg-clip-text bg-gradient-to-br from-brand-600 to-brand-900 leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-brand-600/5 rounded-full flex items-center justify-center animate-pulse">
              <svg
                className="w-12 h-12 text-brand-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-bold text-neutral-900 mb-3">
          Page introuvable
        </h2>
        <p className="text-neutral-500 mb-8 leading-relaxed">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
          <br />
          Pas de panique, retournez sur la bonne route !
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-all hover:shadow-lg hover:shadow-brand-600/20 hover:scale-[1.02]"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Tableau de bord
          </Link>
          <Link
            href="/help"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-neutral-300 text-neutral-700 rounded-xl font-semibold hover:bg-neutral-50 transition-colors"
          >
            Centre d&apos;aide
          </Link>
        </div>

        {/* Footer */}
        <p className="text-xs text-neutral-400 mt-12">
          Transporti — Simple, rapide, fiable.
        </p>
      </div>
    </div>
  );
}
