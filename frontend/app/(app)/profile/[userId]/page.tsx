"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import ImageCropper from "@/components/ImageCropper";
import {
  Star,
  MessageSquare,
  ArrowLeft,
  Loader2,
  BadgeCheck,
  TrendingUp,
  CheckCircle2,
  Truck as TruckIcon,
  Clock,
  ShieldCheck,
  Award,
  Zap,
  Sparkles,
  MapPin,
  Calendar,
  Weight,
  ImageOff,
  Pencil,
  Save,
  X,
  Plus,
  Check,
  Camera,
  Mail,
  Phone,
  Upload,
} from "lucide-react";
import Link from "next/link";
import ClientProfilePage from "./ClientProfilePage";
import ReviewCard from "@/components/reviews/ReviewCard";
import type { ReviewData } from "@/components/reviews/ReviewCard";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface TransporterData {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  is_verified: boolean;
  trust_score: number;
  rating: number;
  review_count: number;
  joined_at: string;
  service_areas: string[];
  specializations: string[];
  vehicle_type?: string;
  vehicle_capacity_kg?: number;
  completion_rate?: number;
  total_jobs_completed?: number;
  avg_response_time_min?: number;
  insurance_valid_until?: string;
  vehicle_photos?: string[];
  avatar_url?: string;
}

/* -------------------------------------------------------------------------- */
/*  Stat Card                                                                  */
/* -------------------------------------------------------------------------- */

function StatItem({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <div
        className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto mb-2`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">
        {label}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Trust Badge                                                                */
/* -------------------------------------------------------------------------- */

function TrustBadge({
  icon: Icon,
  label,
  color,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border ${color} transition-all hover:scale-[1.02]`}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <Sparkles className="w-3.5 h-3.5 opacity-40" />
    </div>
  );
}



/* -------------------------------------------------------------------------- */
/*  Public Profile Page — Matching reference design                           */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Governorates list                                                          */
/* -------------------------------------------------------------------------- */

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

const VEHICLE_TYPES = [
  "Camion bache",
  "Fourgon",
  "Pickup",
  "Camionnette",
  "Semi-remorque",
  "Camion frigorifique",
  "Plateau",
  "Autre",
];

/* -------------------------------------------------------------------------- */
/*  Smart Profile Router — detects role and renders the right profile          */
/* -------------------------------------------------------------------------- */

export default function ProfilePage() {
  const params = useParams();
  const { user } = useAuth();
  const userId = params?.userId ? String(params.userId) : null;

  // Determine profile type via role check
  const isOwner = user?.id !== undefined && userId === String(user.id);
  const userRole = user?.role?.toUpperCase();

  const [targetRole, setTargetRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    // If viewing own profile, we already know the role
    if (isOwner && userRole) {
      setTargetRole(userRole);
      setRoleLoading(false);
      return;
    }

    // For other users, call the lightweight role endpoint
    const fetchRole = async () => {
      try {
        const data = await apiClient.get<{ id: number; role: string }>(
          `/api/user/${userId}/role/`,
        );
        setTargetRole(data.role?.toUpperCase() || "CLIENT");
      } catch {
        // Fallback: default to CLIENT if role endpoint fails
        setTargetRole("CLIENT");
      } finally {
        setRoleLoading(false);
      }
    };
    fetchRole();
  }, [userId, isOwner, userRole]);

  if (roleLoading || !userId) {
    return (
      <div className="min-h-screen bg-neutral-50 animate-fade-in">
        {/* Skeleton: Hero Header */}
        <div className="relative">
          <div className="h-40 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 animate-pulse" />
          <div className="max-w-3xl mx-auto px-6 -mt-12 relative z-10">
            <div className="flex items-end gap-4 mb-6">
              <div className="w-24 h-24 rounded-2xl bg-neutral-200 animate-pulse border-4 border-white shadow-lg" />
              <div className="flex-1 pb-2 space-y-2">
                <div className="h-6 w-40 bg-neutral-200 rounded-lg animate-pulse" />
                <div className="h-4 w-56 bg-neutral-100 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        {/* Skeleton: Stats */}
        <div className="max-w-3xl mx-auto px-6 mt-4">
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 mb-6">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 animate-pulse mx-auto" />
                  <div className="h-6 w-12 bg-neutral-200 rounded animate-pulse mx-auto" />
                  <div className="h-3 w-16 bg-neutral-100 rounded animate-pulse mx-auto" />
                </div>
              ))}
            </div>
          </div>
          {/* Skeleton: Bio */}
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-3">
            <div className="h-5 w-24 bg-neutral-200 rounded animate-pulse" />
            <div className="h-4 w-full bg-neutral-100 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-neutral-100 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-neutral-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (targetRole === "CLIENT") {
    return <ClientProfilePage userId={userId} />;
  }

  // For TRANSPORTER or any other role
  return <TransporterProfileContent userId={userId} />;
}

/* -------------------------------------------------------------------------- */
/*  Transporter Profile Content                                                */
/* -------------------------------------------------------------------------- */

function TransporterProfileContent({ userId }: { userId: string | null }) {
  const router = useRouter();
  const { user } = useAuth();

  const [transporter, setTransporter] = useState<TransporterData | null>(null);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode
  const isOwner = user?.id !== undefined && userId === String(user.id);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Edit form state
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editVehicleType, setEditVehicleType] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editAreas, setEditAreas] = useState<string[]>([]);
  const [editSpecs, setEditSpecs] = useState<string[]>([]);
  const [newSpec, setNewSpec] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Vehicle photo upload
  const vehicleInputRef = useRef<HTMLInputElement>(null);
  const [vehicleCropSrc, setVehicleCropSrc] = useState<string | null>(null);
  const [editVehiclePhotos, setEditVehiclePhotos] = useState<string[]>([]);
  const [vehicleUploading, setVehicleUploading] = useState(false);
  const startEditing = useCallback(() => {
    if (!transporter) return;
    setEditFirstName(transporter.first_name);
    setEditLastName(transporter.last_name);
    setEditPhone(transporter.phone || "");
    setEditBio((transporter as any).bio || "");
    setEditVehicleType(transporter.vehicle_type || "");
    setEditCapacity(
      transporter.vehicle_capacity_kg
        ? String(transporter.vehicle_capacity_kg)
        : "",
    );
    setEditAreas([...(transporter.service_areas || [])]);
    setEditSpecs([...(transporter.specializations || [])]);
    setEditAvatarUrl(transporter.avatar_url || null);
    setEditVehiclePhotos([...(transporter.vehicle_photos || [])]);
    setNewSpec("");
    setEditing(true);
    setSaveMsg(null);
    setFormErrors({});
  }, [transporter]);

  const cancelEditing = () => {
    if (editFirstName !== transporter?.first_name || editLastName !== transporter?.last_name || editPhone !== (transporter?.phone || '')) {
      if (!window.confirm('Vous avez des modifications non sauvegardées. Quitter sans enregistrer ?')) return;
    }
    setEditing(false);
    setAvatarCropSrc(null);
    setVehicleCropSrc(null);
    setSaveMsg(null);
    setFormErrors({});
  };

  // Warn on page leave with unsaved changes (UX-T3)
  useEffect(() => {
    if (!editing) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [editing]);

  /* --- Avatar upload flow --- */
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarCropSrc(url);
    e.target.value = ""; // reset so same file can be re-selected
  };

  const handleAvatarCropped = async (blob: Blob) => {
    setAvatarCropSrc(null);
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", blob, "avatar.jpg");
      const res = await apiClient.upload<{ avatar_url: string }>(
        "/api/auth/avatar/",
        fd,
      );
      setEditAvatarUrl(res.avatar_url);
      setSaveMsg({ type: "ok", text: "Photo de profil mise à jour !" });
      setTimeout(() => setSaveMsg(null), 2500);
    } catch (err: any) {
      setSaveMsg({
        type: "err",
        text: err?.message || "Erreur upload avatar.",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  /* --- Vehicle photo upload flow --- */
  const handleVehicleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVehicleCropSrc(url);
    e.target.value = "";
  };

  const handleVehicleCropped = async (blob: Blob) => {
    setVehicleCropSrc(null);
    setVehicleUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", blob, "vehicle.jpg");
      const res = await apiClient.upload<{ url: string }>(
        "/api/upload/photo/",
        fd,
      );
      setEditVehiclePhotos([res.url]);
      setSaveMsg({ type: "ok", text: "Photo du véhicule mise à jour !" });
      setTimeout(() => setSaveMsg(null), 2500);
    } catch (err: any) {
      setSaveMsg({
        type: "err",
        text: err?.message || "Erreur upload véhicule.",
      });
    } finally {
      setVehicleUploading(false);
    }
  };

  /* --- Form validation (UX-T1) --- */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (editFirstName.trim().length < 2) errors.first_name = "Minimum 2 caractères.";
    if (editLastName.trim().length < 2) errors.last_name = "Minimum 2 caractères.";
    if (editPhone.trim() && !/^\+?216?\d{8}$/.test(editPhone.trim())) {
      errors.phone = "Format invalide. Ex: +21612345678";
    }
    if (editCapacity.trim()) {
      const cap = parseFloat(editCapacity);
      if (isNaN(cap) || cap <= 0) errors.capacity = "La capacité doit être positive.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload: Record<string, unknown> = {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        phone: editPhone.trim(),
        bio: editBio.trim(),
        vehicle_type: editVehicleType,
        service_areas: editAreas,
        specializations: editSpecs,
        vehicle_photos: editVehiclePhotos,
      };
      if (editCapacity.trim()) {
        payload.vehicle_capacity_kg = parseFloat(editCapacity);
      }
      const res = await apiClient.patch<{
        message: string;
        profile: TransporterData;
      }>("/api/transporter/profile/me/", payload);
      setTransporter(res.profile);
      setEditing(false);
      setSaveMsg({ type: "ok", text: "Profil mis à jour !" });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e: any) {
      const errBody = e?.body;
      const msg =
        errBody?.phone?.[0] ||
        errBody?.first_name?.[0] ||
        errBody?.last_name?.[0] ||
        e?.message ||
        "Erreur de sauvegarde.";
      setSaveMsg({ type: "err", text: msg });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (userId) fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, reviewsData] = await Promise.all([
        apiClient.get<TransporterData>(`/api/transporter/profile/${userId}/`),
        apiClient.get<any>(`/api/reviews/user/${userId}/`),
      ]);
      setTransporter(profileData);
      const reviewsList =
        reviewsData.results ?? (Array.isArray(reviewsData) ? reviewsData : []);
      setReviews(reviewsList);
    } catch (e: any) {
      console.error("Error fetching profile:", e);
      setError(e?.message || "Profil introuvable.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-neutral-500">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (error || !transporter) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "Profil introuvable."}</p>
          <Link
            href="/jobs/browse"
            className="text-brand-600 hover:underline text-sm font-medium"
          >
            ← Retour aux missions
          </Link>
        </div>
      </div>
    );
  }

  const t = transporter;
  const fullName = `${t.first_name} ${t.last_name}`;
  const initials = `${t.first_name.charAt(0)}${t.last_name.charAt(0)}`;

  // Only show revealed reviews with actual ratings
  const visibleReviews = reviews.filter(
    (r) => r.is_revealed && r.rating !== null,
  );

  // Insurance check
  const isInsured =
    t.insurance_valid_until && new Date(t.insurance_valid_until) > new Date();

  // Trust badges based on data
  const trustBadges = [];
  if (t.is_verified) {
    trustBadges.push({
      icon: ShieldCheck,
      label: "Identité vérifiée",
      color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    });
  }
  if (t.rating >= 4.5) {
    trustBadges.push({
      icon: Star,
      label: "Top noté",
      color: "bg-amber-50 border-amber-200 text-amber-700",
    });
  }
  if ((t.completion_rate || 0) >= 90) {
    trustBadges.push({
      icon: Award,
      label: "Fiabilité excellente",
      color: "bg-blue-50 border-blue-200 text-blue-700",
    });
  }
  if ((t.total_jobs_completed || 0) >= 10) {
    trustBadges.push({
      icon: Zap,
      label: "Expérimenté",
      color: "bg-purple-50 border-purple-200 text-purple-700",
    });
  }
  // Fill with defaults if not enough badges
  if (!t.is_verified) {
    trustBadges.push({
      icon: ShieldCheck,
      label: "Identité vérifiée",
      color: "bg-neutral-50 border-neutral-200 text-neutral-400",
    });
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Save message toast — inline (DES-T2) */}
      {saveMsg && (
        <div
          className={`mb-4 px-5 py-3 rounded-xl text-sm font-semibold border ${
            saveMsg.type === "ok"
              ? "bg-accent-50 text-accent-700 border-accent-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {saveMsg.text}
        </div>
      )}

      {/* Back + Edit buttons */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => window.history.length > 1 ? router.back() : router.push('/dashboard')}
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        {isOwner && !editing && (
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors shadow-md"
          >
            <Pencil className="w-4 h-4" />
            Modifier le profil
          </button>
        )}

        {isOwner && editing && (
          <div className="flex items-center gap-2">
            <button
              onClick={cancelEditing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-600 rounded-xl text-sm font-semibold hover:bg-neutral-200 transition-colors"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-accent-600 text-white rounded-xl text-sm font-semibold hover:bg-accent-700 transition-colors shadow-md disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Enregistrer
            </button>
          </div>
        )}
      </div>

      {/* ====== MAIN 2-COLUMN LAYOUT ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─────────── LEFT COLUMN (2/3) ─────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* ── HERO CARD ── */}
          <div className="rounded-2xl overflow-hidden shadow-lg border border-neutral-100">
            {/* Navy gradient hero with profile info */}
            <div className="bg-gradient-to-br from-brand-900 via-brand-700 to-brand-800 px-6 pt-6 pb-6 relative overflow-hidden">
              {/* Decorative orbs */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />

              {/* Verified badge */}
              {t.is_verified && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-accent-500/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg z-10">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Vérifié
                </div>
              )}

              <div className="relative z-10 flex flex-col items-center sm:flex-row sm:items-center gap-5">
                {/* Avatar — clickable in edit mode */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-20 h-20 rounded-full bg-white/10 border-4 border-white/30 flex items-center justify-center overflow-hidden shadow-xl ${editing ? "cursor-pointer group" : ""}`}
                    onClick={() => editing && avatarInputRef.current?.click()}
                  >
                    {(editing ? editAvatarUrl : t.avatar_url) ? (
                      <img
                        src={(editing ? editAvatarUrl : t.avatar_url) || ""}
                        alt={fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-white/90">
                        {initials}
                      </span>
                    )}
                    {editing && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                        {avatarUploading ? (
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        ) : (
                          <Camera className="w-6 h-6 text-white" />
                        )}
                      </div>
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarFileSelect}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  {/* Name */}
                  {editing ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-2">
                        <div className="flex flex-col">
                          <input
                            value={editFirstName}
                            onChange={(e) => { setEditFirstName(e.target.value); setFormErrors((p) => ({...p, first_name: ''})); }}
                            className={`px-2 py-1 rounded-lg bg-white/20 border text-white text-sm font-bold w-28 placeholder:text-white/40 ${formErrors.first_name ? 'border-red-400' : 'border-white/30'}`}
                            placeholder="Prénom"
                          />
                          {formErrors.first_name && <span className="text-red-300 text-[10px] mt-0.5">{formErrors.first_name}</span>}
                        </div>
                        <div className="flex flex-col">
                          <input
                            value={editLastName}
                            onChange={(e) => { setEditLastName(e.target.value); setFormErrors((p) => ({...p, last_name: ''})); }}
                            className={`px-2 py-1 rounded-lg bg-white/20 border text-white text-sm font-bold w-28 placeholder:text-white/40 ${formErrors.last_name ? 'border-red-400' : 'border-white/30'}`}
                            placeholder="Nom"
                          />
                          {formErrors.last_name && <span className="text-red-300 text-[10px] mt-0.5">{formErrors.last_name}</span>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <h1 className="text-xl font-bold text-white truncate">
                      {fullName}
                    </h1>
                  )}

                  {/* Email / Phone in edit mode */}
                  {editing && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-white/50" />
                        <span className="px-2 py-1 rounded-lg bg-white/10 text-white/60 text-xs italic">
                          {t.email || "—"}
                        </span>
                        <span className="text-[9px] text-white/30 font-medium">Non modifiable</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-white/50" />
                          <input
                            value={editPhone}
                            onChange={(e) => { setEditPhone(e.target.value); setFormErrors((p) => ({...p, phone: ''})); }}
                            type="tel"
                            className={`px-2 py-1 rounded-lg bg-white/15 border text-white text-xs w-36 placeholder:text-white/30 ${formErrors.phone ? 'border-red-400' : 'border-white/20'}`}
                            placeholder="+216 XX XXX XXX"
                          />
                        </div>
                        {formErrors.phone && <span className="text-red-300 text-[10px] mt-0.5 ml-5">{formErrors.phone}</span>}
                      </div>
                    </div>
                  )}

                  {/* Email / Phone display in view mode */}
                  {!editing && (t.email || t.phone) && (
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-white/50">
                      {t.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {t.email}
                        </span>
                      )}
                      {t.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {t.phone}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Rating */}
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold text-white">
                      {t.rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-white/60">
                      ({t.review_count} avis)
                    </span>
                  </div>

                  {/* Trust Score bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                        Score de confiance
                      </span>
                      <span className="text-sm font-bold text-white">
                        {t.trust_score}/100
                      </span>
                    </div>
                    <div className="w-full bg-white/15 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${t.trust_score}%`,
                          background:
                            t.trust_score >= 80
                              ? "linear-gradient(90deg, #22C55E, #4ADE80)"
                              : t.trust_score >= 50
                                ? "linear-gradient(90deg, #F59E0B, #FBBF24)"
                                : "linear-gradient(90deg, #EF4444, #F87171)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Member since + locations */}
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-white/60">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Membre depuis{" "}
                      {new Date(t.joined_at).toLocaleDateString("fr-TN", {
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                    {editing ? (
                      <div className="flex items-center gap-1 text-accent-300">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">
                          {editAreas.length > 0
                            ? editAreas.join(", ")
                            : "Aucune zone"}
                        </span>
                      </div>
                    ) : (
                      t.service_areas.length > 0 && (
                        <div className="flex items-center gap-1 text-accent-300">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="font-medium">
                            {t.service_areas.slice(0, 3).join(", ")}
                            {t.service_areas.length > 3 &&
                              ` +${t.service_areas.length - 3}`}
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  {/* Service areas editor (when editing, show below member date) */}
                  {editing && (
                    <div className="mt-3">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40 mb-2">
                        Zones de service
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {GOVERNORATES.map((gov) => {
                          const selected = editAreas.includes(gov);
                          return (
                            <button
                              key={gov}
                              onClick={() =>
                                selected
                                  ? setEditAreas(
                                      editAreas.filter((a) => a !== gov),
                                    )
                                  : setEditAreas([...editAreas, gov])
                              }
                              className={`text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                                selected
                                  ? "bg-accent-500/80 border-accent-400 text-white font-semibold"
                                  : "bg-white/5 border-white/15 text-white/50 hover:bg-white/10"
                              }`}
                            >
                              {selected && (
                                <Check className="w-2.5 h-2.5 inline mr-0.5" />
                              )}
                              {gov}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Specializations tags */}
              {editing ? (
                <div className="relative z-10 mt-4">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-white/50 mb-2">
                    Spécialisations
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {editSpecs.map((spec) => (
                      <span
                        key={spec}
                        className="inline-flex items-center gap-1.5 text-xs bg-white/15 text-white/90 px-3 py-1.5 rounded-full font-medium border border-white/15"
                      >
                        {spec}
                        <button
                          onClick={() =>
                            setEditSpecs(editSpecs.filter((s) => s !== spec))
                          }
                          className="hover:text-red-300 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1">
                      <input
                        value={newSpec}
                        onChange={(e) => setNewSpec(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newSpec.trim()) {
                            e.preventDefault();
                            if (!editSpecs.includes(newSpec.trim())) {
                              setEditSpecs([...editSpecs, newSpec.trim()]);
                            }
                            setNewSpec("");
                          }
                        }}
                        placeholder="Ajouter..."
                        className="px-2 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs w-24 placeholder:text-white/30"
                      />
                      <button
                        onClick={() => {
                          if (
                            newSpec.trim() &&
                            !editSpecs.includes(newSpec.trim())
                          ) {
                            setEditSpecs([...editSpecs, newSpec.trim()]);
                            setNewSpec("");
                          }
                        }}
                        className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-white/70 hover:bg-white/25"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                t.specializations.length > 0 && (
                  <div className="relative z-10 flex flex-wrap gap-2 mt-4">
                    {t.specializations.map((spec) => (
                      <span
                        key={spec}
                        className="text-xs bg-white/10 text-white/80 px-3 py-1.5 rounded-full font-medium border border-white/10 backdrop-blur-sm"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

          {/* ── TRUST BADGES ROW ── */}
          {trustBadges.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {trustBadges.slice(0, 4).map((badge, idx) => (
                <TrustBadge key={idx} {...badge} />
              ))}
            </div>
          )}

          {/* ── BIO / À PROPOS (UX-T5) ── */}
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-900">
                À propos
              </h3>
            </div>
            <div className="p-5">
              {editing ? (
                <div className="space-y-1">
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    maxLength={500}
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                    placeholder="Décrivez votre expérience, vos services, et ce qui vous différencie..."
                  />
                  <p className="text-right text-[10px] text-neutral-400">{editBio.length}/500</p>
                </div>
              ) : (
                <p className="text-sm text-neutral-600 leading-relaxed">
                  {(t as any).bio || <span className="italic text-neutral-400">Aucune description pour le moment.</span>}
                </p>
              )}
            </div>
          </div>

          {/* ── REVIEWS / AVIS CLIENTS ── */}
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900">
                Avis clients
              </h3>
              <span className="text-xs font-semibold bg-brand-600 text-white px-3 py-1 rounded-full">
                {visibleReviews.length} avis
              </span>
            </div>

            <div className="p-4 space-y-3">
              {visibleReviews.length === 0 ? (
                <div className="text-center py-10">
                  <MessageSquare className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm text-neutral-400">
                    Aucun avis pour le moment.
                  </p>
                </div>
              ) : (
                <>
                  {visibleReviews.slice(0, 5).map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                  {visibleReviews.length > 5 && (
                    <div className="text-center pt-2">
                      <button
                        className="text-sm text-brand-600 font-semibold hover:underline"
                        onClick={() => {}}
                      >
                        Voir tous les avis ({visibleReviews.length})
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─────────── RIGHT COLUMN (1/3) ─────────── */}
        <div className="lg:col-span-1 space-y-5">
          {/* ── COMPLÉTUDE PROFIL (owner only, UX-T4) ── */}
          {isOwner && (() => {
            const checks = [
              { label: "Photo de profil", done: !!t.avatar_url, weight: 15 },
              { label: "Photo véhicule", done: !!(t.vehicle_photos && t.vehicle_photos.length > 0), weight: 15 },
              { label: "Type de véhicule", done: !!t.vehicle_type, weight: 10 },
              { label: "Capacité de charge", done: !!t.vehicle_capacity_kg, weight: 10 },
              { label: "Zone de service", done: t.service_areas.length > 0, weight: 15 },
              { label: "Spécialisation", done: t.specializations.length > 0, weight: 10 },
              { label: "Mission complétée", done: (t.total_jobs_completed || 0) > 0, weight: 15 },
              { label: "Avis reçu", done: visibleReviews.length > 0, weight: 10 },
            ];
            const pct = checks.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0);
            const missing = checks.filter(c => !c.done).slice(0, 3);
            if (pct >= 100) return null;
            return (
              <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm">
                <div className="px-5 py-3 bg-gradient-to-r from-brand-600/5 to-accent-500/5 border-b border-neutral-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-700">Complétude du profil</h3>
                  <span className="text-xs font-bold text-brand-600">{pct}%</span>
                </div>
                <div className="p-5 space-y-3">
                  <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-700 bg-gradient-to-r from-brand-600 to-accent-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {missing.length > 0 && (
                    <div className="space-y-1.5">
                      {missing.map(m => (
                        <div key={m.label} className="flex items-center gap-2 text-xs text-neutral-500">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                          Ajouter : <span className="font-semibold text-neutral-700">{m.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── STATISTIQUES CARD ── */}
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-gradient-to-r from-neutral-100 to-neutral-50 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-700">
                Statistiques
              </h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-5">
                <StatItem
                  icon={TrendingUp}
                  value={`${t.trust_score}/100`}
                  label="Score de confiance"
                  color="bg-brand-600/10 text-brand-600"
                />
                <StatItem
                  icon={CheckCircle2}
                  value={`${t.completion_rate || 0}%`}
                  label="Taux de complétion"
                  color="bg-accent-50 text-accent-600"
                />
                <StatItem
                  icon={TruckIcon}
                  value={t.total_jobs_completed || 0}
                  label="Missions terminées"
                  color="bg-purple-50 text-purple-600"
                />
                <StatItem
                  icon={Clock}
                  value={`${t.avg_response_time_min || "--"} min`}
                  label="Temps de réponse"
                  color="bg-amber-50 text-amber-600"
                />
              </div>
            </div>
          </div>

          {/* ── VÉHICULE CARD ── */}
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm">
            {/* Header — navy gradient */}
            <div className="px-5 py-3 bg-gradient-to-r from-brand-900 to-brand-600">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Véhicule
              </h3>
            </div>

            {/* Vehicle photo or placeholder — clickable in edit mode */}
            {(() => {
              const photoUrl = editing
                ? editVehiclePhotos.length > 0
                  ? editVehiclePhotos[0]
                  : null
                : t.vehicle_photos && t.vehicle_photos.length > 0
                  ? t.vehicle_photos[0]
                  : null;

              return photoUrl ? (
                <div
                  className={`aspect-video bg-neutral-100 overflow-hidden relative ${editing ? "cursor-pointer group" : ""}`}
                  onClick={() => editing && vehicleInputRef.current?.click()}
                >
                  <img
                    src={photoUrl}
                    alt="Véhicule"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                  {editing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {vehicleUploading ? (
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      ) : (
                        <div className="text-center">
                          <Camera className="w-8 h-8 text-white mx-auto mb-1" />
                          <span className="text-white text-xs font-semibold">
                            Changer la photo
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`bg-neutral-50 p-6 text-center ${editing ? "cursor-pointer hover:bg-neutral-100 transition-colors" : ""}`}
                  onClick={() => editing && vehicleInputRef.current?.click()}
                >
                  {vehicleUploading ? (
                    <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600/5 to-brand-600/10 flex items-center justify-center mx-auto mb-2">
                      {editing ? (
                        <Upload className="w-6 h-6 text-brand-600/50" />
                      ) : (
                        <ImageOff className="w-6 h-6 text-brand-600/25" />
                      )}
                    </div>
                  )}
                  <p className="text-xs text-neutral-400">
                    {editing
                      ? "Cliquer pour ajouter une photo"
                      : "Aucune photo de véhicule"}
                  </p>
                </div>
              );
            })()}
            <input
              ref={vehicleInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleVehicleFileSelect}
            />

            {/* Vehicle details */}
            <div className="p-5 space-y-4 border-t border-neutral-100">
              {/* Type */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-600/8 flex items-center justify-center flex-shrink-0">
                  <TruckIcon className="w-4 h-4 text-brand-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                    Type de véhicule
                  </p>
                  {editing ? (
                    <select
                      value={editVehicleType}
                      onChange={(e) => setEditVehicleType(e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-900 bg-white"
                    >
                      <option value="">Sélectionner...</option>
                      {VEHICLE_TYPES.map((vt) => (
                        <option key={vt} value={vt}>
                          {vt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm font-semibold text-neutral-900">
                      {t.vehicle_type || "Non spécifié"}
                    </p>
                  )}
                </div>
              </div>

              {/* Capacity */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-500/8 flex items-center justify-center flex-shrink-0">
                  <Weight className="w-4 h-4 text-accent-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                    Capacité de charge
                  </p>
                  {editing ? (
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        value={editCapacity}
                        onChange={(e) => setEditCapacity(e.target.value)}
                        placeholder="ex: 3500"
                        className="w-24 px-2 py-1.5 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-900"
                      />
                      <span className="text-sm text-neutral-500">kg</span>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-neutral-900">
                      {t.vehicle_capacity_kg
                        ? `${t.vehicle_capacity_kg.toLocaleString()} kg`
                        : "Non spécifié"}
                    </p>
                  )}
                </div>
              </div>

              {/* Insurance */}
              {t.insurance_valid_until && (
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isInsured ? "bg-accent-500/8" : "bg-red-500/8"}`}
                  >
                    <ShieldCheck
                      className={`w-4 h-4 ${isInsured ? "text-accent-600" : "text-red-600"}`}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                      Assurance
                    </p>
                    <p
                      className={`text-sm font-semibold ${isInsured ? "text-accent-600" : "text-red-600"}`}
                    >
                      {isInsured ? "✓ Valide" : "✗ Expirée"} — jusqu&apos;au{" "}
                      {new Date(t.insurance_valid_until).toLocaleDateString(
                        "fr-TN",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── IMAGE CROPPER MODALS ── */}
      {avatarCropSrc && (
        <ImageCropper
          imageSrc={avatarCropSrc}
          aspect={1}
          cropShape="round"
          title="Recadrer la photo de profil"
          onCrop={handleAvatarCropped}
          onCancel={() => setAvatarCropSrc(null)}
        />
      )}
      {vehicleCropSrc && (
        <ImageCropper
          imageSrc={vehicleCropSrc}
          aspect={16 / 9}
          cropShape="rect"
          title="Recadrer la photo du véhicule"
          onCrop={handleVehicleCropped}
          onCancel={() => setVehicleCropSrc(null)}
        />
      )}
    </div>
  );
}
