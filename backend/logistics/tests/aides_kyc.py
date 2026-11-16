"""
Aides de test partagées pour la vérification KYC (rangées avec les tests :
ce n'est pas du code applicatif).

Depuis que le KYC est imposé (logistics/kyc.py), un transporteur doit être
VERIFIED pour publier un trajet retour, faire une offre ou répondre à une
demande. Les tests qui exercent ces parcours vérifient leurs transporteurs
avec `verify_transporter` ; ils n'affaiblissent pas la règle, ils posent
simplement l'état qu'aurait un vrai transporteur validé par l'équipe.
"""
from django.utils import timezone

from trust.models import TrustProfile, VerificationStatus


def verify_transporter(user) -> TrustProfile:
    """Crée ou met à jour le dossier de confiance de `user` au statut VERIFIED."""
    profile, _ = TrustProfile.objects.get_or_create(user=user)
    profile.verification_status = VerificationStatus.VERIFIED
    profile.verified_at = timezone.now()
    profile.save(update_fields=['verification_status', 'verified_at'])
    return profile
