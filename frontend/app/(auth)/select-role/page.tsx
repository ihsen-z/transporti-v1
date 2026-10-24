"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Truck, Check } from "lucide-react";
import { useAuth, getDefaultRedirect } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { AuthCard, AuthError, AuthHeading } from "@/components/auth/AuthScreen";

/* -------------------------------------------------------------------------- */
/*  Choix du rôle — FAMILLE IMMERSIVE (onboarding)                            */
/*  Cartes de choix en verre : sélectionnée = fond plus opaque + bord blanc    */
/*  franc, à l'image de l'état focus des champs verre.                        */
/* -------------------------------------------------------------------------- */

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
    <div className="flex flex-col gap-6">
      <AuthHeading
        title={t.auth.selectRoleTitle}
        subtitle={t.auth.selectRoleSubtitle}
      />

      <AuthCard>
        {/* Accueil nominatif */}
        <p className="text-[14.5px] leading-[1.5] text-on-blue-200">
          {t.auth.welcomeUser.replace(
            "{name}",
            user.first_name || user.name || "",
          )}
        </p>

        {error && <AuthError message={error} />}

        {/* --- Cartes de rôle ---------------------------------------- */}
        <div className="flex flex-col gap-3">
          <p className="label-on-blue">{t.auth.iAmA}</p>

          {roleOptions.map(({ value, icon: Icon, descriptionKey }) => {
            const isSelected = selectedRole === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedRole(value)}
                disabled={isLoading}
                aria-pressed={isSelected}
                className={`flex items-start gap-3.5 rounded-field p-4 text-start
                  transition-all duration-120 ease-out
                  disabled:cursor-not-allowed disabled:opacity-50
                  ${
                    isSelected
                      ? "border-[1.5px] border-white/[0.55] bg-white/[0.22]"
                      : "border border-white/[0.24] bg-white/[0.10] hover:bg-white/[0.16]"
                  }`}
              >
                <span
                  className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-chip border ${
                    isSelected
                      ? "border-white/40 bg-white/25"
                      : "border-white/25 bg-white/[0.14]"
                  }`}
                >
                  <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                </span>

                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15.5px] font-bold text-white">
                    {(t.auth.roles as Record<string, string>)[
                      value.toLowerCase()
                    ] || value}
                  </span>
                  <span className="text-[13px] leading-[1.5] text-on-blue-300">
                    {descriptionKey === "clientDescription"
                      ? t.auth.clientDescription
                      : t.auth.transporterDescription}
                  </span>
                </span>

                {/* Coche verte : le vert porte la valeur, ici le choix retenu */}
                {isSelected && (
                  <span className="ms-auto mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-green-500">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* --- CTA UNIQUE de l'écran -------------------------------- */}
        <button
          type="button"
          onClick={handleConfirmRole}
          disabled={isLoading}
          className="cta btn-base w-full disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span
                className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden
              />
              {t.auth.settingRole}
            </>
          ) : (
            t.auth.confirmRole
          )}
        </button>

        <p className="text-center text-[12.5px] leading-[1.5] text-on-blue-300">
          {t.auth.roleChangeNote}
        </p>
      </AuthCard>
    </div>
  );
}
