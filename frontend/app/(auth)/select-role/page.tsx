"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Truck, ArrowRight, Sparkles } from "lucide-react";
import { AuthLogo } from "@/components/brand/TransportiLogo";
import { useAuth, getDefaultRedirect } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

type SelectableRole = "CLIENT" | "TRANSPORTER";

const roleOptions: {
  value: SelectableRole;
  icon: typeof User;
  descriptionKey: "clientDescription" | "transporterDescription";
}[] = [
  {
    value: "CLIENT",
    icon: User,
    descriptionKey: "clientDescription",
  },
  {
    value: "TRANSPORTER",
    icon: Truck,
    descriptionKey: "transporterDescription",
  },
];

export default function SelectRolePage() {
  const [selectedRole, setSelectedRole] = useState<SelectableRole>("CLIENT");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, setUserRole } = useAuth();
  const { showToast } = useToast();
  const { t } = useAppI18n();
  const router = useRouter();

  // If user is not authenticated, redirect to login
  if (!user) {
    router.push("/login");
    return null;
  }

  const handleConfirmRole = async () => {
    setError(null);
    setIsLoading(true);

    const result = await setUserRole(selectedRole);

    if (result.success) {
      showToast("success", t.auth.roleSetSuccess);
      const userRole = result.role || "client";
      router.push(getDefaultRedirect(userRole));
    } else {
      setError(result.error || t.auth.roleSetError);
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
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-accent-300" />
          <h1 className="text-2xl font-bold text-white">
            {t.auth.selectRoleTitle}
          </h1>
          <Sparkles className="w-5 h-5 text-accent-300" />
        </div>
        <p className="text-blue-200 text-sm">
          {t.auth.selectRoleSubtitle}
        </p>
      </div>

      <div className="px-6 pt-6 pb-4 space-y-5">
        {/* Welcome message */}
        <div className="text-center">
          <p className="text-sm text-neutral-600">
            {t.auth.welcomeUser.replace("{name}", user.first_name || user.name || "")}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Role Selection Cards */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-700">
            {t.auth.iAmA}
          </p>
          <div className="grid grid-cols-1 gap-3">
            {roleOptions.map(({ value, icon: Icon, descriptionKey }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedRole(value)}
                disabled={isLoading}
                className={`
                  flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left
                  ${
                    selectedRole === value
                      ? "border-accent-500 bg-accent-50 shadow-sm"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    selectedRole === value
                      ? "bg-accent-100"
                      : "bg-neutral-100"
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 ${
                      selectedRole === value
                        ? "text-accent-600"
                        : "text-neutral-400"
                    }`}
                  />
                </div>
                <div>
                  <span
                    className={`text-base font-semibold block ${
                      selectedRole === value
                        ? "text-accent-700"
                        : "text-neutral-700"
                    }`}
                  >
                    {(t.auth.roles as Record<string, string>)[value.toLowerCase()] || value}
                  </span>
                  <span className="text-sm text-neutral-500 mt-0.5 block">
                    {(t.auth as unknown as Record<string, string>)[descriptionKey] || ""}
                  </span>
                </div>
                {selectedRole === value && (
                  <div className="ml-auto flex-shrink-0 mt-1">
                    <div className="w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Confirm Button */}
        <button
          type="button"
          onClick={handleConfirmRole}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-accent-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {t.auth.settingRole}
            </>
          ) : (
            <>
              {t.auth.confirmRole}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Info note */}
        <p className="text-xs text-neutral-400 text-center">
          {t.auth.roleChangeNote}
        </p>
      </div>
    </div>
  );
}
