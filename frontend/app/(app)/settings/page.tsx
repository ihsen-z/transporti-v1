"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient, ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/tokenManager";
import { config } from "@/lib/config";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Bell,
  Shield,
  Camera,
  Save,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Globe,
  Loader2,
  AlertCircle,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Settings Page — Real API integration                                       */
/* -------------------------------------------------------------------------- */

type SettingsTab = "profile" | "notifications" | "security" | "preferences";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profil", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Sécurité", icon: Shield },
  { id: "preferences", label: "Préférences", icon: Globe },
];

interface ProfileApiResponse {
  user: {
    id: number;
    email: string;
    phone: string;
    role: string;
    first_name: string;
    last_name: string;
    is_phone_verified: boolean;
    verification_status: string | null;
  };
}

interface ProfileUpdateResponse {
  message: string;
  user: ProfileApiResponse["user"];
}

const GOVERNORATES = [
  "Tunis",
  "Ariana",
  "Ben Arous",
  "Manouba",
  "Nabeul",
  "Zaghouan",
  "Bizerte",
  "Béja",
  "Jendouba",
  "Le Kef",
  "Siliana",
  "Sousse",
  "Monastir",
  "Mahdia",
  "Sfax",
  "Kairouan",
  "Kasserine",
  "Sidi Bouzid",
  "Gabès",
  "Médenine",
  "Tataouine",
  "Gafsa",
  "Tozeur",
  "Kébili",
];

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Profile form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState("Tunis");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Status indicators
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  // Security form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  // Notification preferences
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifSms, setNotifSms] = useState(false);
  const [notifNewOffer, setNotifNewOffer] = useState(true);
  const [notifBooking, setNotifBooking] = useState(true);
  const [notifMessage, setNotifMessage] = useState(true);

  // Preferences
  const [language, setLanguage] = useState("fr");
  const [currency, setCurrency] = useState("TND");

  // ─── Fetch profile from API on mount ──────────────────────────────────
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data =
        await apiClient.get<ProfileApiResponse>("/api/auth/profile/");
      const u = data.user;
      setFirstName(u.first_name || "");
      setLastName(u.last_name || "");
      setEmail(u.email || "");
      setPhone(u.phone || "");
      // Load saved avatar
      if ((u as any).avatar_url) {
        setAvatarPreview((u as any).avatar_url);
      }
    } catch (err) {
      // Fallback: use auth context data
      if (user) {
        setFirstName(user.first_name || "");
        setLastName(user.last_name || "");
        setEmail(user.email || "");
        setPhone(user.phone || "");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ─── Save profile to API ──────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveStatus("idle");
    setErrorMessage("");

    try {
      const data = await apiClient.put<ProfileUpdateResponse>(
        "/api/auth/profile/",
        {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          profile: { address_summary: governorate },
        },
      );

      // Update local auth context with new data
      updateUser({
        first_name: data.user.first_name,
        last_name: data.user.last_name,
        name: `${data.user.first_name} ${data.user.last_name}`,
        phone: data.user.phone,
      });

      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
      if (err instanceof ApiError && err.body) {
        const messages = Object.values(err.body).flat();
        setErrorMessage(String(messages[0] || "Erreur lors de la sauvegarde."));
      } else {
        setErrorMessage("Erreur réseau. Veuillez réessayer.");
      }
      setTimeout(() => setSaveStatus("idle"), 5000);
    } finally {
      setSaving(false);
    }
  };

  // ─── Change Password (real API) ─────────────────────────────────────
  const [pwSaving, setPwSaving] = useState(false);
  const [pwStatus, setPwStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [pwError, setPwError] = useState("");

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || newPassword !== confirmPassword)
      return;
    setPwSaving(true);
    setPwStatus("idle");
    setPwError("");

    try {
      await apiClient.post("/api/auth/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwStatus("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwStatus("idle"), 4000);
    } catch (err) {
      setPwStatus("error");
      if (err instanceof ApiError && err.body) {
        const msgs = Object.values(err.body).flat();
        setPwError(String(msgs[0] || "Erreur lors du changement."));
      } else {
        setPwError("Erreur réseau. Veuillez réessayer.");
      }
      setTimeout(() => setPwStatus("idle"), 5000);
    } finally {
      setPwSaving(false);
    }
  };

  // ─── Save notification preferences (local for now) ────────────────────
  const handleSaveNotifications = () => {
    setSaveStatus("success");
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const Toggle = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full relative transition-colors ${
        checked ? "bg-brand-600" : "bg-neutral-300"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Paramètres</h1>
        <p className="text-neutral-500 mt-1">
          Gérez votre profil, vos notifications et votre sécurité.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 bg-neutral-100 lg:bg-transparent rounded-xl lg:rounded-none p-1 lg:p-0 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-white text-neutral-900 shadow-sm lg:bg-brand-600/5 lg:text-brand-600"
                    : "text-neutral-500 hover:text-neutral-700 lg:hover:bg-neutral-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-neutral-900">
                Informations personnelles
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                  <span className="ml-2 text-neutral-500">
                    Chargement du profil...
                  </span>
                </div>
              ) : (
                <>
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-2xl overflow-hidden relative">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        firstName?.[0]?.toUpperCase() || "U"
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="avatar-upload"
                        className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        {avatarPreview
                          ? "Changer la photo"
                          : "Ajouter une photo"}
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          if (file.size > 2 * 1024 * 1024) {
                            setSaveStatus("error");
                            setErrorMessage(
                              "La photo ne doit pas dépasser 2 Mo.",
                            );
                            setTimeout(() => setSaveStatus("idle"), 4000);
                            return;
                          }

                          // Show instant preview
                          if (
                            avatarPreview &&
                            avatarPreview.startsWith("blob:")
                          ) {
                            URL.revokeObjectURL(avatarPreview);
                          }
                          const localPreview = URL.createObjectURL(file);
                          setAvatarPreview(localPreview);

                          // Upload to backend
                          try {
                            setSaving(true);
                            const formData = new FormData();
                            formData.append("avatar", file);

                            const token = getAccessToken();
                            const res = await fetch(
                              `${config.API_BASE_URL}/api/auth/avatar/`,
                              {
                                method: "POST",
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                                body: formData,
                              },
                            );

                            if (res.ok) {
                              const data = await res.json();
                              // Replace blob with server URL
                              URL.revokeObjectURL(localPreview);
                              setAvatarPreview(data.avatar_url);
                              setSaveStatus("success");
                              setTimeout(() => setSaveStatus("idle"), 3000);
                            } else {
                              const err = await res.json();
                              setSaveStatus("error");
                              setErrorMessage(
                                err.error || "Erreur lors de l'upload.",
                              );
                              setTimeout(() => setSaveStatus("idle"), 4000);
                            }
                          } catch {
                            setSaveStatus("error");
                            setErrorMessage(
                              "Erreur réseau. Veuillez réessayer.",
                            );
                            setTimeout(() => setSaveStatus("idle"), 4000);
                          } finally {
                            setSaving(false);
                          }
                        }}
                      />
                      <p className="text-xs text-neutral-400 mt-1">
                        JPG, PNG, WebP. Max 2 Mo.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Prénom
                      </label>
                      <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Votre prénom"
                        className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-accent-500 focus:border-brand-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Nom
                      </label>
                      <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Votre nom"
                        className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-accent-500 focus:border-brand-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      <Mail className="w-4 h-4 inline mr-1" /> Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full p-3 border border-neutral-200 rounded-xl text-sm bg-neutral-50 text-neutral-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-neutral-400 mt-1">
                      L&apos;email ne peut pas être modifié.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      <Phone className="w-4 h-4 inline mr-1" /> Téléphone
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+216 XX XXX XXX"
                      className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-accent-500 focus:border-brand-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      <MapPin className="w-4 h-4 inline mr-1" /> Gouvernorat
                    </label>
                    <select
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                      className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-accent-500 focus:border-brand-600 outline-none"
                    >
                      {GOVERNORATES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Save status messages */}
                  {saveStatus === "success" && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      Profil mis à jour avec succès !
                    </div>
                  )}
                  {saveStatus === "error" && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {errorMessage}
                    </div>
                  )}

                  <button
                    onClick={handleSaveProfile}
                    disabled={saving || !firstName.trim() || !lastName.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : saveStatus === "success" ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {saving
                      ? "Sauvegarde..."
                      : saveStatus === "success"
                        ? "Sauvegardé !"
                        : "Sauvegarder"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-neutral-900">
                Canaux de notification
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      Email
                    </p>
                    <p className="text-xs text-neutral-500">
                      Recevez les notifications par email
                    </p>
                  </div>
                  <Toggle checked={notifEmail} onChange={setNotifEmail} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      Notifications push
                    </p>
                    <p className="text-xs text-neutral-500">
                      Notifications dans le navigateur
                    </p>
                  </div>
                  <Toggle checked={notifPush} onChange={setNotifPush} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">SMS</p>
                    <p className="text-xs text-neutral-500">
                      Alertes importantes par SMS
                    </p>
                  </div>
                  <Toggle checked={notifSms} onChange={setNotifSms} />
                </div>
              </div>

              <hr className="border-neutral-100" />

              <h2 className="text-lg font-semibold text-neutral-900">
                Types de notification
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      Nouvelles offres
                    </p>
                    <p className="text-xs text-neutral-500">
                      Quand un transporteur soumet une offre
                    </p>
                  </div>
                  <Toggle checked={notifNewOffer} onChange={setNotifNewOffer} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      Réservations
                    </p>
                    <p className="text-xs text-neutral-500">
                      Confirmation et mises à jour
                    </p>
                  </div>
                  <Toggle checked={notifBooking} onChange={setNotifBooking} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      Messages
                    </p>
                    <p className="text-xs text-neutral-500">
                      Nouveaux messages reçus
                    </p>
                  </div>
                  <Toggle checked={notifMessage} onChange={setNotifMessage} />
                </div>
              </div>

              <button
                onClick={handleSaveNotifications}
                className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors"
              >
                {saveStatus === "success" ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {saveStatus === "success"
                  ? "Sauvegardé !"
                  : "Sauvegarder les préférences"}
              </button>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-neutral-900">
                Changer le mot de passe
              </h2>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-accent-500 pr-10 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPasswords ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Nouveau mot de passe
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-accent-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Confirmer
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-accent-500 outline-none"
                  />
                </div>
              </div>

              {newPassword &&
                confirmPassword &&
                newPassword !== confirmPassword && (
                  <p className="text-sm text-red-500">
                    Les mots de passe ne correspondent pas.
                  </p>
                )}

              {/* Password status messages */}
              {pwStatus === "success" && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Mot de passe modifié avec succès !
                </div>
              )}
              {pwStatus === "error" && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {pwError}
                </div>
              )}

              <button
                onClick={handleChangePassword}
                disabled={
                  pwSaving ||
                  !currentPassword ||
                  !newPassword ||
                  newPassword !== confirmPassword
                }
                className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pwSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : pwStatus === "success" ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
                {pwSaving
                  ? "Mise à jour..."
                  : pwStatus === "success"
                    ? "Modifié !"
                    : "Mettre à jour le mot de passe"}
              </button>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === "preferences" && (
            <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-neutral-900">
                Préférences
              </h2>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Langue
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-accent-500 outline-none"
                >
                  <option value="fr">Français</option>
                  <option value="ar" disabled>
                    العربية (Bientôt)
                  </option>
                  <option value="en" disabled>
                    English (Coming soon)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Devise
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-accent-500 outline-none"
                >
                  <option value="TND">Dinar Tunisien (TND)</option>
                </select>
              </div>

              <button
                onClick={handleSaveNotifications}
                className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors"
              >
                {saveStatus === "success" ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {saveStatus === "success" ? "Sauvegardé !" : "Sauvegarder"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
