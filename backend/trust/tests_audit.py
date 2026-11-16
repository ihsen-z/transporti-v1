"""Correctif d'audit : revues KYC et liens signés journalisés (AdminAuditLog)."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from admin_audit.models import AdminAuditLog
from trust.models import TrustProfile, VerificationDocument

User = get_user_model()
TRUST = '/api/v1/trust'


class KycAuditTrailTests(APITestCase):

    def setUp(self):
        self.moderator = User.objects.create_user(
            username='kyc_mod', email='kyc_mod@test.tn', password='SecurePass123!',
            role='MODERATOR', first_name='Mod', last_name='Erateur',
        )
        self.transporter = User.objects.create_user(
            username='kyc_tr', email='kyc_tr@test.tn', password='SecurePass123!',
            role='TRANSPORTER', first_name='Sami', last_name='Trans',
        )
        self.profile, _ = TrustProfile.objects.get_or_create(user=self.transporter)
        self.doc = VerificationDocument.objects.create(
            profile=self.profile, document_type='CIN_FRONT',
            s3_key=f'verification_docs/{self.transporter.id}/cin.png',
            encryption_iv='0' * 32, file_hash='0' * 64,
        )
        self.client.force_authenticate(user=self.moderator)

    def test_reject_is_logged_with_who_what_whom_decision_and_reason(self):
        resp = self.client.patch(
            f'{TRUST}/admin/documents/{self.doc.id}/review/',
            {'action': 'reject', 'reason': 'Photo floue'}, format='json',
        )
        self.assertEqual(resp.status_code, 200)
        entry = AdminAuditLog.objects.get(action='DOCUMENT_REJECTED')
        self.assertEqual(entry.admin_user, self.moderator)
        self.assertEqual(entry.target_type, 'document')
        self.assertEqual(entry.target_id, self.doc.id)
        self.assertEqual(entry.details['transporter_id'], self.transporter.id)
        self.assertEqual(entry.details['decision'], 'reject')
        self.assertEqual(entry.details['reason'], 'Photo floue')

    def test_approve_is_logged(self):
        resp = self.client.patch(
            f'{TRUST}/admin/documents/{self.doc.id}/review/', {'action': 'approve'}, format='json',
        )
        self.assertEqual(resp.status_code, 200)
        entry = AdminAuditLog.objects.get(action='DOCUMENT_APPROVED')
        self.assertEqual(entry.details['decision'], 'approve')

    def test_signed_link_issuance_to_moderator_is_logged(self):
        resp = self.client.get(f'{TRUST}/admin/verifications/{self.profile.id}/documents/')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['documents'][0]['fileUrl'])
        entry = AdminAuditLog.objects.get(action='DOCUMENT_LINK_ISSUED')
        self.assertEqual(entry.admin_user, self.moderator)
        self.assertEqual(entry.target_id, self.profile.id)
        self.assertEqual(entry.details['ids'], [self.doc.id])
