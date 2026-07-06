"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Truck,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  UserCircle,
} from "lucide-react";
import { AuthLogo } from "@/components/brand/TransportiLogo";
import { useAuth, getDefaultRedirect } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

type RegisterRole = "client" | "transporter";

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
  const [selectedRole, setSelectedRole] = useState<RegisterRole>("client");
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
    <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-900 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <AuthLogo />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{t.auth.registerTitle}</h1>
        <p className="text-blue-200 text-sm">
          {t.auth.registerSubtitle}
        </p>
      </div>

      <>
        {/* Real Registration Form */}
        <form
          onSubmit={handleRealRegister}
          className="px-6 pt-6 pb-4 space-y-4"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">
              {t.auth.iAmA}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {roleOptions.map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedRole(value)}
                  className={`
                                            flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center
                                            ${
                                              selectedRole === value
                                                ? "border-accent-500 bg-accent-50"
                                                : "border-neutral-200 hover:border-neutral-300 bg-white"
                                            }
                                        `}
                >
                  <Icon
                    className={`w-6 h-6 ${selectedRole === value ? "text-accent-600" : "text-neutral-400"}`}
                  />
                  <span
                    className={`text-sm font-medium ${selectedRole === value ? "text-accent-700" : "text-neutral-600"}`}
                  >
                    {(t.auth.roles as any)[value] || value}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                {t.auth.firstName}
              </label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Leila"
                  className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                  required
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                {t.auth.lastName}
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ben Ali"
                className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              {t.auth.emailLabel}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="leila@email.com"
                className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              {t.auth.phoneLabel}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98 765 432"
                className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              {t.auth.passwordLabel}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="passwordConfirm"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              {t.auth.passwordConfirmLabel}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="passwordConfirm"
                type={showPassword ? "text" : "password"}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-accent-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t.auth.creatingAccount}
              </>
            ) : (
              <>
                {t.auth.registerButton}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </>

      {/* Footer Links */}
      <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 text-center">
        <p className="text-sm text-neutral-500">
          {t.auth.alreadyRegistered}{" "}
          <Link
            href="/login"
            className="text-accent-600 hover:text-accent-700 font-medium"
          >
            {t.auth.loginButton}
          </Link>
        </p>
      </div>
    </div>
  );
}
