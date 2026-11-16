// Le serveur exige un transporteur VÉRIFIÉ pour publier un trajet, faire une
// offre, accepter ou contre-proposer une demande.
//
// - Statut connu et différent de VERIFIED : on prévient.
// - Statut absent (aucun dossier de confiance : réponse sans statut, ou 404) :
//   le serveur refusera aussi (`NO_PROFILE`), donc on prévient, MAIS seulement
//   une fois la requête terminée (`settled`). Tant qu'elle charge, on n'affiche
//   rien : un bandeau qui clignote « non vérifié » avant d'avoir su serait
//   faux pour un transporteur vérifié.
export function needsVerificationNotice(
  status: string | null | undefined,
  settled = false,
): boolean {
  if (status === 'VERIFIED') return false;
  if (status !== undefined && status !== null) return true;
  return settled;
}
