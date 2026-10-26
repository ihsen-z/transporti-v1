"use client";

import Link from "next/link";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

export default function NotFound() {
  const { t } = useAppI18n();
  return (
    <div className="min-h-screen bg-app flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* Animated 404 Number */}
        <div className="relative mb-8">
          <h1 className="select-none bg-gradient-to-br from-blue-700 to-blue-900 bg-clip-text text-[120px] font-extrabold leading-none tracking-title text-transparent sm:text-[160px]">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-blue-50">
              <svg
                className="h-11 w-11 text-blue-700"
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
        <h2 className="text-[21px] font-extrabold tracking-heading text-ink-900 mb-3">
          {t.errors.pageNotFound}
        </h2>
        <p className="mb-8 text-[15px] leading-[1.55] text-ink-500">
          {t.errors.pageNotFoundDesc}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="btn-base min-h-[48px] rounded-cta bg-blue-700 px-5 text-[15px] text-white shadow-blue transition-colors duration-120 hover:bg-blue-800 active:translate-y-px"
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
            {t.errors.backToDashboard}
          </Link>
          <Link
            href="/aide"
            className="btn-base min-h-[48px] rounded-cta border border-line-strong bg-surface px-5 text-[15px] text-ink-900 transition-colors duration-120 hover:border-blue-700 hover:bg-app active:translate-y-px"
          >
            {t.errors.helpCenter || "Centre d'aide"}
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-12 text-[12.5px] text-ink-300">
          Transporti — Simple, rapide, fiable.
        </p>
      </div>
    </div>
  );
}
