"""
Tests WS-H — expiration des documents de vérification transporteur.

Couvre :
- les helpers de modèle is_expired / expires_soon ;
- la validation d'upload : un document qui expire (permis, assurance, carte
  grise) exige une date d'expiration future ; les autres (CIN, selfie) non.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from trust.models import VerificationDocument
from trust.serializers import VerificationDocumentUploadSerializer

User = get_user_model()


class ExpiryHelpersTests(TestCase):
    """Helpers calculés côté serveur (règle d'or n°2)."""

    def _doc(self, days):
        d = VerificationDocument()
        d.expires_at = None if days is None else timezone.localdate() + timedelta(days=days)
        return d

    def test_past_date_is_expired(self):
        d = self._doc(-1)
        self.assertTrue(d.is_expired)
        self.assertFalse(d.expires_soon)

    def test_within_30_days_expires_soon(self):
        d = self._doc(10)
        self.assertFalse(d.is_expired)
        self.assertTrue(d.expires_soon)

    def test_far_future_is_neither(self):
        d = self._doc(100)
        self.assertFalse(d.is_expired)
        self.assertFalse(d.expires_soon)

    def test_no_date_is_neither(self):
        d = self._doc(None)
        self.assertFalse(d.is_expired)
        self.assertFalse(d.expires_soon)


class UploadExpiryValidationTests(TestCase):
    """Validation de la date d'expiration à l'upload."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="transporter_wsh",
            email="transporter@test.tn",
            password="Test@123!",
            role="TRANSPORTER",
        )
        self.factory = APIRequestFactory()

    def _serializer(self, data):
        request = self.factory.post("/api/trust/documents/")
        request.user = self.user
        # Un petit fichier PNG valide (type MIME + extension acceptés).
        data["document_file"] = SimpleUploadedFile(
            "doc.png", b"\x89PNG\r\n", content_type="image/png"
        )
        return VerificationDocumentUploadSerializer(
            data=data, context={"request": request}
        )

    def test_expiring_type_requires_date(self):
        s = self._serializer({"document_type": "LICENSE"})
        self.assertFalse(s.is_valid())
        self.assertIn("expires_at", s.errors)

    def test_expiring_type_rejects_past_date(self):
        past = timezone.localdate() - timedelta(days=1)
        s = self._serializer({"document_type": "INSURANCE", "expires_at": past})
        self.assertFalse(s.is_valid())
        self.assertIn("expires_at", s.errors)

    def test_expiring_type_accepts_future_date(self):
        future = timezone.localdate() + timedelta(days=90)
        s = self._serializer({"document_type": "INSURANCE", "expires_at": future})
        self.assertTrue(s.is_valid(), s.errors)

    def test_non_expiring_type_needs_no_date(self):
        s = self._serializer({"document_type": "CIN_FRONT"})
        self.assertTrue(s.is_valid(), s.errors)
