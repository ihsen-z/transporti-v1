"use client";

import React from "react";

/* -------------------------------------------------------------------------- */
/*  Boutons sociaux — grille 2 colonnes, gap 12px, hauteur 56px, rayon 16px   */
/*                                                                            */
/*  Charte §3 : sur fond bleu, Google est un aplat BLANC (texte #111827) et   */
/*  Facebook un aplat #1877F2 (texte blanc). Sur fond clair, Google prend un  */
/*  filet #E4E9F2 pour rester détaché de la surface.                          */
/*                                                                            */
/*  Les logos sont les SVG officiels — pas de reconstitution géométrique.     */
/* -------------------------------------------------------------------------- */

type Surface = "on-blue" | "on-light";

function Spinner({ className }: { className: string }) {
  return (
    <span
      className={`h-[18px] w-[18px] animate-spin rounded-full border-2 border-t-transparent ${className}`}
      aria-hidden
    />
  );
}

function GoogleMark() {
  return (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/** Rond blanc portant le « f », comme spécifié par la charte. */
function FacebookMark() {
  return (
    <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-white">
      <svg
        className="h-[14px] w-[14px]"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
          fill="#1877F2"
        />
      </svg>
    </span>
  );
}

export interface SocialAuthButtonsProps {
  onGoogle: () => void;
  onFacebook: () => void;
  /** Fournisseur en cours d'authentification, ou null */
  loadingProvider: "google" | "facebook" | null;
  disabled?: boolean;
  surface?: Surface;
}

export default function SocialAuthButtons({
  onGoogle,
  onFacebook,
  loadingProvider,
  disabled = false,
  surface = "on-blue",
}: SocialAuthButtonsProps) {
  const googleSurface =
    surface === "on-light" ? "border-[#E4E9F2]" : "border-transparent";

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={onGoogle}
        disabled={disabled}
        className={`btn-social btn-social--google ${googleSurface} border transition-colors duration-120 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2`}
      >
        {loadingProvider === "google" ? (
          <Spinner className="border-ink-300" />
        ) : (
          <GoogleMark />
        )}
        Google
      </button>

      <button
        type="button"
        onClick={onFacebook}
        disabled={disabled}
        className="btn-social btn-social--facebook transition-colors duration-120 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {loadingProvider === "facebook" ? (
          <Spinner className="border-white" />
        ) : (
          <FacebookMark />
        )}
        Facebook
      </button>
    </div>
  );
}
