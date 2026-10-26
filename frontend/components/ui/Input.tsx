"use client";

import React, { useId } from "react";
import { AlertCircle } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Input / Textarea / Select — champs de formulaire accessibles              */
/*                                                                            */
/*  Le label est TOUJOURS associé au champ (htmlFor/id générés), l'erreur     */
/*  est annoncée (role="alert" + aria-describedby) — pattern requis par       */
/*  l'audit a11y : hors pages auth, aucun champ n'avait de label associé.     */
/*                                                                            */
/*  Design system « Verre & Lumière » :                                       */
/*    - `light` (défaut) : champ 52px, fond #F6F8FC, filet #E4E9F2, rayon     */
/*      14px. Au focus : fond blanc, filet bleu 1.5px, halo bleu 4px.         */
/*    - `on-blue` : champ verre, pour les écrans immersifs. Au focus, le      */
/*      fond devient plus opaque et le bord plus franc.                       */
/*    Le libellé suit la surface : 12.5px/600, #6B7280 sur clair,             */
/*    #DBE6FB sur bleu.                                                       */
/* -------------------------------------------------------------------------- */

type FieldSurface = "light" | "on-blue";

const BASE =
  "w-full min-h-[52px] rounded-field text-[15px] transition-all duration-150 ease-out focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed";

const SURFACE_CLASSES: Record<FieldSurface, string> = {
  light:
    "bg-app border border-[#E4E9F2] px-[15px] text-ink-900 placeholder:text-ink-300 focus:bg-surface focus:border-[1.5px] focus:border-blue-700 focus:shadow-focus disabled:bg-neutral-100 disabled:text-ink-300",
  "on-blue":
    "bg-white/[0.16] border border-white/[0.24] px-[15px] text-white font-medium placeholder:text-white/60 focus:bg-white/[0.22] focus:border-[1.5px] focus:border-white/[0.55]",
};

const ERROR_CLASSES: Record<FieldSurface, string> = {
  light:
    "border-error-400 bg-error-50 focus:border-error-500 focus:shadow-none",
  "on-blue": "border-error-300 bg-error-500/20 focus:border-error-200",
};

const LABEL_CLASSES: Record<FieldSurface, string> = {
  light: "text-ink-500",
  "on-blue": "text-on-blue-200",
};

const HINT_CLASSES: Record<FieldSurface, string> = {
  light: "text-ink-500",
  "on-blue": "text-on-blue-300",
};

const ERROR_TEXT_CLASSES: Record<FieldSurface, string> = {
  light: "text-error-600",
  "on-blue": "text-error-200",
};

interface FieldWrapperProps {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  surface: FieldSurface;
  children: React.ReactNode;
}

function FieldWrapper({
  id,
  label,
  error,
  hint,
  required,
  surface,
  children,
}: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-[7px]">
      {label && (
        <label
          htmlFor={id}
          className={`block text-[12.5px] font-semibold ${LABEL_CLASSES[surface]}`}
        >
          {label}
          {required && (
            <span
              className={
                surface === "on-blue"
                  ? "text-green-300 ms-0.5"
                  : "text-error-600 ms-0.5"
              }
              aria-hidden
            >
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className={`text-[12.5px] font-medium flex items-center gap-1 ${ERROR_TEXT_CLASSES[surface]}`}
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-hint`}
          className={`text-[12.5px] ${HINT_CLASSES[surface]}`}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

const fieldClasses = (
  surface: FieldSurface,
  hasError: boolean,
  extra: string,
) =>
  `${BASE} ${SURFACE_CLASSES[surface]} ${hasError ? ERROR_CLASSES[surface] : ""} ${extra}`;

/* ------------------------------- Input ----------------------------------- */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  surface?: FieldSurface;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { label, error, hint, id, surface = "light", className = "", ...rest },
    ref,
  ) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldWrapper
        id={fieldId}
        label={label}
        error={error}
        hint={hint}
        required={rest.required}
        surface={surface}
      >
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={fieldClasses(surface, !!error, className)}
          {...rest}
        />
      </FieldWrapper>
    );
  },
);

/* ------------------------------ Textarea --------------------------------- */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  surface?: FieldSurface;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, error, hint, id, surface = "light", className = "", ...rest },
    ref,
  ) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldWrapper
        id={fieldId}
        label={label}
        error={error}
        hint={hint}
        required={rest.required}
        surface={surface}
      >
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={fieldClasses(
            surface,
            !!error,
            `py-[13px] leading-[1.55] ${className}`,
          )}
          {...rest}
        />
      </FieldWrapper>
    );
  },
);

/* ------------------------------- Select ---------------------------------- */

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  surface?: FieldSurface;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      label,
      error,
      hint,
      id,
      surface = "light",
      className = "",
      children,
      ...rest
    },
    ref,
  ) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldWrapper
        id={fieldId}
        label={label}
        error={error}
        hint={hint}
        required={rest.required}
        surface={surface}
      >
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={fieldClasses(
            surface,
            !!error,
            `appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pe-10 ${
              surface === "on-blue"
                ? "[background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]"
                : "[background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]"
            } ${className}`,
          )}
          {...rest}
        >
          {children}
        </select>
      </FieldWrapper>
    );
  },
);

export default Input;
