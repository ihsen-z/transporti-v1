"""
recalculate_profile_status : le score de confiance est recalculé à la
vérification (il restait au 0 de la création du dossier).
"""
from django.contrib.auth import get_user_model
from django.test import TestCase

from trust.models import TrustProfile, VerificationDocument, VerificationStatus
from trust.services import recalculate_profile_status

User = get_user_model()


class RecalculScoreTests(TestCase):

    def test_le_score_est_synchronise_quand_le_dossier_devient_verifie(self):
        user = User.objects.create_user(
            username='rs_t', email='rst@test.tn', password='SecurePass123!', role='TRANSPORTER')
        profil = TrustProfile.objects.create(user=user, verification_status=VerificationStatus.PENDING)
        self.assertEqual(profil.trust_score, 0)
        VerificationDocument.objects.create(
            profile=profil, document_type='CIN_FRONT', s3_key='kyc/cin.enc',
            encryption_iv='iv', file_hash='0' * 64, is_valid=True)

        self.assertEqual(recalculate_profile_status(profil), 'VERIFIED')

        profil.refresh_from_db()
        self.assertGreater(profil.trust_score, 0)
        self.assertIsNotNone(profil.trust_score_updated_at)
