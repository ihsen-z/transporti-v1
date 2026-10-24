"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Briques de présentation des écrans immersifs (authentification)           */
/*                                                                            */
/*  Aucune logique métier ici : uniquement la mise en forme imposée par la    */
/*  charte, afin que chaque page d'auth reste courte et strictement           */
/*  identique aux autres.                                                     */
/* -------------------------------------------------------------------------- */

/** Titre 27–30px/800 + sous-titre 14.5px, posés au-dessus de la carte verre. */
export function AuthHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-2 text-center lg:text-start">
      <h1 className="text-[27px] font-extrabold leading-[1.2] tracking-title text-white sm:text-[30px]">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[14.5px] leading-[1.5] text-on-blue-300">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Carte verre : la surface unique des écrans immersifs. */
export function AuthCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass flex flex-col gap-5 ${className}`}>{children}</div>
  );
}

/** Message d'erreur de formulaire, en verre teinté rouge. */
export function AuthError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-field border border-error-300/60 bg-error-500/20 px-3.5 py-3 text-[13px] font-medium leading-[1.45] text-white"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
      {message}
    </p>
  );
}

/** Séparateur « ou continuer avec » — filet blanc 25 % + libellé 12.5px. */
export function AuthDivider({ label }: { label: string }) {
  return <div className="divider-on-blue">{label}</div>;
}

/** Lien de bas de page centré : 14px #CBD9F5 + lien blanc 700. */
export function AuthFooterLink({
  question,
  href,
  action,
}: {
  question: string;
  href: string;
  action: string;
}) {
  return (
    <p className="text-center text-[14px] text-on-blue-300">
      {question}{" "}
      <Link
        href={href}
        className="font-bold text-white underline-offset-4 transition-opacity hover:opacity-80 hover:underline"
      >
        {action}
      </Link>
    </p>
  );
}

/** Libellé de champ sur bleu : 12.5px/600 #DBE6FB, gap 7px avec le champ. */
export function AuthLabel({
  htmlFor,
  children,
  action,
}: {
  htmlFor: string;
  children: React.ReactNode;
  /** Lien aligné à droite du libellé (« Mot de passe oublié ? », compteur…) */
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="label-on-blue">
        {children}
      </label>
      {action}
    </div>
  );
}

/** Jauge de force du mot de passe : 4 segments de 3px + mot d'appréciation. */
export function PasswordStrength({
  score,
  label,
}: {
  /** 0 à 4 segments remplis */
  score: number;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="pwd-meter pwd-meter--on-blue flex-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`pwd-meter__seg ${i < score ? "pwd-meter__seg--on" : ""}`}
          />
        ))}
      </div>
      {label && (
        <span className="text-[12.5px] font-semibold text-green-300">
          {label}
        </span>
      )}
    </div>
  );
}
