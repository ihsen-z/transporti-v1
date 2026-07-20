/**
 * Feature flags (pivot §8 — Phase B).
 *
 * RETURN_TRIPS_FIRST drives the inverted client funnel: return-trip search
 * becomes the primary client entry, the classic freight request the fallback.
 * Toggle per environment via NEXT_PUBLIC_RETURN_TRIPS_FIRST ("false" to
 * revert the surface in one variable — no redeploy of logic).
 */
export const RETURN_TRIPS_FIRST =
  process.env.NEXT_PUBLIC_RETURN_TRIPS_FIRST !== "false";
