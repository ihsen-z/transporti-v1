"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Truck, AlertCircle } from "lucide-react";
import { useAuth, getDefaultRedirect } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/* -------------------------------------------------------------------------- */
/*  Inscription — FAMILLE APPLICATIVE (charte §7)                             */
/*                                                                            */
/*  Le bandeau bleu et le fond #F6F8FC viennent de app/(auth)/layout.tsx.     */
/*  Cette page pose la carte blanche qui chevauche le bandeau, les champs      */
/*  clairs (52px, focus bleu + halo 4px) et le CTA orange unique de l'écran.  */
/*  Aucun verre ici : on est sur fond clair.                                  */
/* -------------------------------------------------------------------------- */

type RegisterRole = "client" | "transporter";

/**
 * Rôle pré-sélectionné depuis l'URL : `/register?role=transporter`.
 *
 * C'est la destination du CTA « Devenir transporteur » de la page d'accueil —
 * la SEULE entrée d'acquisition transporteur du site. Le paramètre était
 * ignoré : le formulaire s'ouvrait sur « Client », et un transporteur qui
 * cliquait « Devenir transporteur » créait un compte CLIENT sans que rien ne
 * le signale. Vérifié dans le navigateur avant correction.
 *
 * Toute valeur autre que `transporter` retombe sur `client` : un paramètre
 * fabriqué ne doit pas produire d'état intermédiaire.
 */
function roleDepuisUrl(valeur: string | null): RegisterRole {
  return valeur === "transporter" ? "transporter" : "client";
}

const roleOptions: {
  value: RegisterRole;
  icon: typeof User;
}[] = [
  {
    value: "client",
    icon: User,
  },
  {
    value: "transporter",
    icon: Truck,
  },
];

export default function RegisterPage() {
  const searchParams = useSearchParams();
  // `useState` avec valeur initiale, et non un `useEffect` de synchronisation :
  // le rôle est juste dès le PREMIER rendu, sans étape où « Client » clignote.
  const [selectedRole, setSelectedRole] = useState<RegisterRole>(() =>
    roleDepuisUrl(searchParams?.get("role") ?? null),
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { registerWithCredentials } = useAuth();
  const { showToast } = useToast();
  const { t } = useAppI18n();
  const router = useRouter();

  const handleRealRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !password ||
      !passwordConfirm
    ) {
      setError(t.auth.fillAllFields);
      return;
    }
    if (password !== passwordConfirm) {
      setError(t.auth.passwordsDoNotMatch);
      return;
    }
    if (password.length < 6) {
      setError(t.auth.passwordTooShort);
      return;
    }

    setIsLoading(true);
    const result = await registerWithCredentials({
      email,
      password,
      password_confirm: passwordConfirm,
      username: email.split("@")[0], // derive username from email
      phone,
      role: selectedRole === "client" ? "CLIENT" : "TRANSPORTER",
      first_name: firstName,
      last_name: lastName,
    });

    if (result.success) {
      showToast("success", t.auth.registerSuccess);
      router.push(getDefaultRedirect(selectedRole));
    } else {
      setError(result.error || t.auth.registerError);
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* --- Carte blanche : le formulaire ------------------------------ */}
      <section className="card flex flex-col gap-5 p-5 sm:p-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-[21px] font-extrabold tracking-heading text-ink-900">
            {t.auth.registerTitle}
          </h1>
          <p className="text-[14px] leading-[1.5] text-ink-500">
            {t.auth.registerSubtitle}
          </p>
        </header>

        <form onSubmit={handleRealRegister} className="flex flex-col gap-4">
          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-field border border-error-200 bg-error-50 px-3.5 py-3 text-[13px] font-medium leading-[1.45] text-error-700"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 flex-shrink-0"
                aria-hidden
              />
              {error}
            </p>
          )}

          {/* --- Rôle : deux cartes de choix ------------------------- */}
          <fieldset className="flex flex-col gap-[7px]">
            <legend className="label mb-[7px]">{t.auth.iAmA}</legend>
            <div className="grid grid-cols-2 gap-3">
              {roleOptions.map(({ value, icon: Icon }) => {
                const isSelected = selectedRole === value;
                return (
                  <button
                    key={value}
                    type="button"
                    data-testid={`register-role-${value}`}
                    // `aria-pressed` porte l'etat de selection : sans lui, un
                    // test ne peut lire le role choisi que par ses classes CSS,
                    // qui changent au moindre ajustement de style.
                    aria-pressed={isSelected}
                    onClick={() => setSelectedRole(value)}
                    className={`flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-tile p-3
                      text-center transition-all duration-120 ease-out
                      ${
                        isSelected
                          ? "border-[1.5px] border-blue-700 bg-blue-50"
                          : "border border-line bg-app hover:border-line-strong"
                      }`}
                  >
                    <Icon
                      className={`h-[22px] w-[22px] ${
                        isSelected ? "text-blue-700" : "text-ink-300"
                      }`}
                      strokeWidth={2}
                    />
                    <span
                      className={`text-[14px] font-bold ${
                        isSelected ? "text-blue-700" : "text-ink-500"
                      }`}
                    >
                      {(t.auth.roles as unknown as Record<string, string>)[
                        value
                      ] || value}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* --- Prénom / Nom --------------------------------------- */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-[7px]">
              <label htmlFor="firstName" className="label">
                {t.auth.firstName}
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Leila"
                className="field"
                autoComplete="given-name"
                required
              />
            </div>
            <div className="flex flex-col gap-[7px]">
              <label htmlFor="lastName" className="label">
                {t.auth.lastName}
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ben Ali"
                className="field"
                autoComplete="family-name"
                required
              />
            </div>
          </div>

          {/* --- Email ---------------------------------------------- */}
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="email" className="label">
              {t.auth.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="leila@email.com"
              className="field"
              autoComplete="email"
              required
            />
          </div>

          {/* --- Téléphone ------------------------------------------ */}
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="phone" className="label">
              {t.auth.phoneLabel}
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98 765 432"
              className="field"
              autoComplete="tel"
              required
            />
          </div>

          {/* --- Mot de passe --------------------------------------- */}
          <div className="flex flex-col gap-[7px]">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="password" className="label">
                {t.auth.passwordLabel}
              </label>
              {/* Lien « Afficher » à droite du champ (charte §3) */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[12.5px] font-semibold text-blue-600 underline-offset-4 transition-colors hover:text-blue-700 hover:underline"
              >
                {showPassword ? t.auth.hidePassword : t.auth.showPassword}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="field"
              autoComplete="new-password"
              required
            />
          </div>

          {/* --- Confirmation --------------------------------------- */}
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="passwordConfirm" className="label">
              {t.auth.passwordConfirmLabel}
            </label>
            <input
              id="passwordConfirm"
              type={showPassword ? "text" : "password"}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="••••••••"
              className="field"
              autoComplete="new-password"
              required
            />
          </div>

          {/* --- CTA UNIQUE de l'écran ------------------------------ */}
          <button
            type="submit"
            disabled={isLoading}
            className="cta btn-base mt-1 w-full disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span
                  className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden
                />
                {t.auth.creatingAccount}
              </>
            ) : (
              t.auth.registerButton
            )}
          </button>
        </form>
      </section>

      {/* --- Lien de bas de page --------------------------------------- */}
      <p className="text-center text-[14px] text-ink-500">
        {t.auth.alreadyRegistered}{" "}
        <Link
          href="/login"
          className="font-bold text-blue-700 underline-offset-4 transition-colors hover:underline"
        >
          {t.auth.loginButton}
        </Link>
      </p>
    </div>
  );
}
