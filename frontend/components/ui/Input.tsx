"use client";

import React, { useId } from "react";
import { AlertCircle } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Input / Textarea / Select — champs de formulaire accessibles              */
/*                                                                            */
/*  Le label est TOUJOURS associé au champ (htmlFor/id générés), l'erreur     */
/*  est annoncée (role="alert" + aria-describedby) — pattern requis par       */
/*  l'audit a11y : hors pages auth, aucun champ n'avait de label associé.     */
/* -------------------------------------------------------------------------- */

const FIELD_BASE =
  "w-full p-3 border rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:bg-neutral-50 disabled:text-neutral-400";

const fieldStateClasses = (hasError: boolean) =>
  hasError ? "border-error-400 bg-error-50" : "border-neutral-300 bg-white";

interface FieldWrapperProps {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FieldWrapper({
  id,
  label,
  error,
  hint,
  required,
  children,
}: FieldWrapperProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          {label}
          {required && (
            <span className="text-error-600 ms-0.5" aria-hidden>
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
          className="text-sm text-error-600 mt-1 flex items-center gap-1"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-neutral-500 mt-1">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

/* ------------------------------- Input ----------------------------------- */

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, hint, id, className = "", ...rest }, ref) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldWrapper
        id={fieldId}
        label={label}
        error={error}
        hint={hint}
        required={rest.required}
      >
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={`${FIELD_BASE} ${fieldStateClasses(!!error)} ${className}`}
          {...rest}
        />
      </FieldWrapper>
    );
  },
);

/* ------------------------------ Textarea --------------------------------- */

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, hint, id, className = "", ...rest }, ref) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldWrapper
        id={fieldId}
        label={label}
        error={error}
        hint={hint}
        required={rest.required}
      >
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={`${FIELD_BASE} ${fieldStateClasses(!!error)} ${className}`}
          {...rest}
        />
      </FieldWrapper>
    );
  },
);

/* ------------------------------- Select ---------------------------------- */

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { label, error, hint, id, className = "", children, ...rest },
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
      >
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={`${FIELD_BASE} ${fieldStateClasses(!!error)} ${className}`}
          {...rest}
        >
          {children}
        </select>
      </FieldWrapper>
    );
  },
);

export default Input;
