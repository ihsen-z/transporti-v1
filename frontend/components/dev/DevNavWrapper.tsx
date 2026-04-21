"use client";

import { DevNavMenu } from "@/components/dev/DevNavMenu";

/**
 * ⚠️ PROVISOIRE — Wrapper client pour le menu de navigation dev.
 * À supprimer avant la mise en production.
 */
export function DevNavWrapper() {
  // Only render in development
  if (process.env.NODE_ENV !== "development") return null;
  return <DevNavMenu />;
}
