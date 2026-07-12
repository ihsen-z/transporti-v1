"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import ClientProfilePage from "./ClientProfilePage";
import TransporterProfilePage from "./TransporterProfilePage";

/* -------------------------------------------------------------------------- */
/*  Smart Profile Router — detects role and renders the right profile          */
/*  (content components live in ClientProfilePage / TransporterProfilePage)    */
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
  return <TransporterProfilePage userId={userId} />;
}
