/*
 * Interpolation minimale pour les messages à variables, ex :
 *   interpolate(t.jobs.deletePhoto, { n: index + 1 })
 * avec `deletePhoto: "Supprimer la photo {n}"`.
 * Volontairement hors de l'objet `t` : y intégrer une fonction casserait le
 * typage par accès direct (`typeof fr`).
 */
export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match,
  );
}
