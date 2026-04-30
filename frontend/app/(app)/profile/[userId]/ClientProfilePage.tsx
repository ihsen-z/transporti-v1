"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import ImageCropper from "@/components/ImageCropper";
import {
  Loader2,
  ArrowLeft,
  Pencil,
  Save,
  X,
  Camera,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  CheckCircle2,
  Package,
  Star,
  FileText,
  Upload,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface ClientData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  joined_at: string;
  role: string;
  bio?: string;
  address_summary?: string;
  total_jobs_posted: number;
  completed_jobs: number;
  active_jobs: number;
  total_offers_received: number;
  rating: number;
  review_count: number;
}

/* -------------------------------------------------------------------------- */
/*  Stat Card — warm themed                                                    */
/* -------------------------------------------------------------------------- */

function ClientStatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${accent}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      <p className="text-sm text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Client Profile Component                                                   */
/* -------------------------------------------------------------------------- */

export default function ClientProfilePage({ userId }: { userId: string }) {
  const router = useRouter();
  const { user } = useAuth();

  const [client, setClient] = useState<ClientData | null>(null);
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
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAddress, setEditAddress] = useState("");

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  /* --- Data Fetching --- */
  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ClientData>(
        `/api/client/profile/${userId}/`,
      );
      setClient(data);
    } catch (e: any) {
      console.error("Error fetching client profile:", e);
      setError(e?.message || "Profil introuvable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchProfile();
  }, [userId]);

  /* --- Edit Handlers --- */
  const startEditing = useCallback(() => {
    if (!client) return;
    setEditFirstName(client.first_name);
    setEditLastName(client.last_name);
    setEditEmail(client.email || "");
    setEditPhone(client.phone || "");
    setEditBio(client.bio || "");
    setEditAddress(client.address_summary || "");
    setEditAvatarUrl(client.avatar_url || null);
    setEditing(true);
    setSaveMsg(null);
  }, [client]);

  const cancelEditing = () => {
    setEditing(false);
    setAvatarCropSrc(null);
    setSaveMsg(null);
  };

  /* --- Avatar upload flow --- */
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarCropSrc(url);
    e.target.value = "";
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

  /* --- Save --- */
  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload: Record<string, unknown> = {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        bio: editBio.trim(),
        address_summary: editAddress.trim(),
      };
      const res = await apiClient.patch<{
        message: string;
        profile: ClientData;
      }>("/api/client/profile/me/", payload);
      setClient(res.profile);
      setEditing(false);
      setSaveMsg({ type: "ok", text: "Profil enregistré avec succès !" });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err: any) {
      const msg =
        typeof err?.message === "string"
          ? err.message
          : "Erreur lors de la sauvegarde.";
      setSaveMsg({ type: "err", text: msg });
    } finally {
      setSaving(false);
    }
  };

  /* --- Loading / Error --- */
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
          <p className="text-neutral-500">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "Profil introuvable."}</p>
          <Link
            href="/dashboard"
            className="text-brand-600 hover:underline text-sm font-medium"
          >
            ← Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  const c = client;
  const fullName = `${c.first_name} ${c.last_name}`;
  const initials =
    `${c.first_name.charAt(0)}${c.last_name.charAt(0)}`.toUpperCase();
  const avatarSrc = editing ? editAvatarUrl : c.avatar_url;

  const joinDate = (() => {
    try {
      return new Date(c.joined_at).toLocaleDateString("fr-TN", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return "";
    }
  })();

  /* --- RENDER --- */
  return (
    <div className="min-h-screen bg-neutral-50 p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Avatar Cropper Modal */}
      {avatarCropSrc && (
        <ImageCropper
          imageSrc={avatarCropSrc}
          onCrop={handleAvatarCropped}
          onCancel={() => setAvatarCropSrc(null)}
          aspect={1}
          cropShape="round"
        />
      )}

      {/* Hidden File Input */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileSelect}
      />

      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-700 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        {isOwner && !editing && (
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-all shadow-md hover:shadow-lg text-sm"
          >
            <Pencil className="w-4 h-4" />
            Modifier le profil
          </button>
        )}

        {editing && (
          <div className="flex items-center gap-2">
            <button
              onClick={cancelEditing}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-neutral-600 bg-neutral-100 rounded-xl text-sm font-medium hover:bg-neutral-200 transition-colors"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-all shadow-md text-sm disabled:opacity-50"
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

      {/* Save message toast */}
      {saveMsg && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            saveMsg.type === "ok"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {saveMsg.text}
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== LEFT COLUMN — Hero Card ===== */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Card — warm amber gradient */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-8 text-white relative">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10 flex items-start gap-6">
                {/* Avatar */}
                <div className="relative group flex-shrink-0">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={fullName}
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-white/30 shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold border-4 border-white/30 shadow-lg">
                      {initials}
                    </div>
                  )}
                  {editing && (
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      {avatarUploading ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <Camera className="w-6 h-6 text-white" />
                      )}
                    </button>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <div className="flex gap-3 mb-3">
                      <input
                        type="text"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        placeholder="Prénom"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-lg font-bold"
                      />
                      <input
                        type="text"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        placeholder="Nom"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-lg font-bold"
                      />
                    </div>
                  ) : (
                    <h1 className="text-2xl font-bold mb-1 truncate">
                      {fullName}
                    </h1>
                  )}

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium mb-3">
                    <UserIcon className="w-3.5 h-3.5" />
                    Client
                  </span>

                  {/* Contact Info */}
                  <div className="flex flex-wrap gap-4 text-sm text-white/80 mt-2">
                    {editing ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded border border-white/30 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-1 focus:ring-white/50"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded border border-white/30 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-1 focus:ring-white/50"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {c.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4" />
                            {c.email}
                          </span>
                        )}
                        {c.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4" />
                            {c.phone}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-white/70 mt-2">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      Membre depuis {joinDate}
                    </span>
                    {c.address_summary && !editing && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {c.address_summary}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />À propos
            </h3>
            {editing ? (
              <div className="space-y-3">
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  placeholder="Décrivez-vous en quelques mots..."
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all resize-none text-sm"
                />
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Adresse / Ville"
                    className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all text-sm"
                  />
                </div>
              </div>
            ) : (
              <p className="text-neutral-600 text-sm leading-relaxed">
                {c.bio || "Aucune description ajoutée."}
              </p>
            )}
          </div>

          {/* Activity Summary */}
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-500" />
              Historique d&apos;activité
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-neutral-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-neutral-700">
                    Total annonces publiées
                  </span>
                </div>
                <span className="text-lg font-bold text-neutral-900">
                  {c.total_jobs_posted}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-neutral-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-neutral-700">
                    Transports terminés
                  </span>
                </div>
                <span className="text-lg font-bold text-neutral-900">
                  {c.completed_jobs}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-neutral-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-neutral-700">
                    Annonces actives
                  </span>
                </div>
                <span className="text-lg font-bold text-neutral-900">
                  {c.active_jobs}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-neutral-700">
                    Offres reçues
                  </span>
                </div>
                <span className="text-lg font-bold text-neutral-900">
                  {c.total_offers_received}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== RIGHT COLUMN — Stats ===== */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <ClientStatCard
              icon={Package}
              label="Annonces"
              value={c.total_jobs_posted}
              accent="bg-amber-50 text-amber-600"
            />
            <ClientStatCard
              icon={CheckCircle2}
              label="Terminées"
              value={c.completed_jobs}
              accent="bg-green-50 text-green-600"
            />
            <ClientStatCard
              icon={Briefcase}
              label="En cours"
              value={c.active_jobs}
              accent="bg-blue-50 text-blue-600"
            />
            <ClientStatCard
              icon={Star}
              label="Note"
              value={c.rating > 0 ? `${c.rating}/5` : "--"}
              accent="bg-amber-50 text-amber-500"
            />
          </div>

          {/* Member Card */}
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-neutral-900 mb-4">
              Informations
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <div>
                  <p className="text-neutral-500 text-xs">Membre depuis</p>
                  <p className="font-medium text-neutral-800">{joinDate}</p>
                </div>
              </div>
              {c.address_summary && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-neutral-400" />
                  <div>
                    <p className="text-neutral-500 text-xs">Localisation</p>
                    <p className="font-medium text-neutral-800">
                      {c.address_summary}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Star className="w-4 h-4 text-neutral-400" />
                <div>
                  <p className="text-neutral-500 text-xs">Évaluations</p>
                  <p className="font-medium text-neutral-800">
                    {c.review_count > 0
                      ? `${c.rating}/5 (${c.review_count} avis)`
                      : "Aucun avis"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions for Owner */}
          {isOwner && !editing && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-6">
              <h3 className="text-base font-semibold text-neutral-900 mb-3">
                Actions rapides
              </h3>
              <div className="space-y-2">
                <Link
                  href="/jobs/new"
                  className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl text-sm font-medium text-neutral-700 hover:bg-amber-50 hover:text-amber-700 transition-colors border border-neutral-100"
                >
                  <Package className="w-4 h-4" />
                  Publier une annonce
                </Link>
                <Link
                  href="/jobs"
                  className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl text-sm font-medium text-neutral-700 hover:bg-amber-50 hover:text-amber-700 transition-colors border border-neutral-100"
                >
                  <Briefcase className="w-4 h-4" />
                  Mes transports
                </Link>
                <Link
                  href="/messages"
                  className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl text-sm font-medium text-neutral-700 hover:bg-amber-50 hover:text-amber-700 transition-colors border border-neutral-100"
                >
                  <Mail className="w-4 h-4" />
                  Messages
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
