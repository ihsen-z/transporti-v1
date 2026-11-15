import { redirect } from "next/navigation";

/**
 * Ancienne page « Détail transporteur » : elle affichait un profil et des avis
 * FICTIFS (MOCK_PROFILE, MOCK_REVIEWS) quel que soit l'identifiant.
 *
 * Le vrai profil public vit dans `/profile/[userId]`. On y redirige au lieu
 * de laisser un faux profil accessible par une URL encore référencée (anciens
 * liens, favoris du navigateur).
 */
export default function TransporteurRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/profile/${encodeURIComponent(params.id)}`);
}
