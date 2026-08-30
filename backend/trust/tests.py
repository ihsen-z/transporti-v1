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
from rest_framework.test import APIRequestFactory, APITestCase

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


class TrustScoreBreakdownTests(APITestCase):
    """
    T5.3 — la décomposition du score de confiance.

    Le point de ces tests n'est pas de figer les valeurs du barème, qui
    relèvent du produit, mais d'empêcher la seule dérive vraiment coûteuse :
    que le détail montré à l'utilisateur cesse de correspondre au score montré
    partout ailleurs.
    """

    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.transporteur = User.objects.create_user(
            username='ts_transporteur', email='tst@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
        )
        self.client_user = User.objects.create_user(
            username='ts_client', email='tsc@test.tn',
            password='SecurePass123!', role='CLIENT',
        )

    def test_la_somme_des_composantes_egale_le_score(self):
        """
        L'invariant qui justifie la refonte : `get_user_trust_score` EST la
        somme de `trust_score_components`. Si quelqu'un modifie l'un sans
        l'autre, ce test tombe.
        """
        from analytics.services import (
            trust_score_components, get_user_trust_score,
        )
        composantes = trust_score_components(self.transporteur)
        somme = sum(c['earned'] for c in composantes)
        attendu = min(100, max(0, int(somme)))
        self.assertEqual(get_user_trust_score(self.transporteur), attendu)

    def test_les_plafonds_totalisent_cent(self):
        from analytics.services import trust_score_components
        composantes = trust_score_components(self.transporteur)
        self.assertEqual(sum(c['max'] for c in composantes), 100)

    def test_distingue_qualite_de_service_et_usage_de_l_app(self):
        """
        Deux composantes sur cinq mesurent l'USAGE de l'application, pas le
        service rendu. Le drapeau permet à l'interface de ne pas présenter
        « connecte-toi plus souvent » comme un levier de fiabilité.
        """
        from analytics.services import trust_score_components
        par_cle = {c['key']: c for c in trust_score_components(self.transporteur)}
        self.assertTrue(par_cle['completion']['is_service_quality'])
        self.assertTrue(par_cle['disputes']['is_service_quality'])
        self.assertTrue(par_cle['payment']['is_service_quality'])
        self.assertFalse(par_cle['engagement']['is_service_quality'])
        self.assertFalse(par_cle['recency']['is_service_quality'])

    def test_endpoint_repond_a_l_utilisateur_connecte(self):
        self.client.force_authenticate(user=self.transporteur)
        reponse = self.client.get('/api/trust/score-breakdown/')
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertIn('trust_score', reponse.data)
        self.assertEqual(len(reponse.data['components']), 5)

    def test_endpoint_sert_aussi_un_client(self):
        """Un client a lui aussi un score : la vue n'est pas réservée."""
        self.client.force_authenticate(user=self.client_user)
        self.assertEqual(
            self.client.get('/api/trust/score-breakdown/').status_code, 200
        )

    def test_endpoint_refuse_l_anonyme(self):
        self.assertEqual(
            self.client.get('/api/trust/score-breakdown/').status_code, 401
        )

    def test_aucun_identifiant_en_parametre(self):
        """
        La vue est STRICTEMENT personnelle. Exposer le detail du score d'autrui
        donnerait une carte pour le contester ou le manipuler.
        """
        self.client.force_authenticate(user=self.client_user)
        reponse = self.client.get(
            '/api/trust/score-breakdown/?user_id=%d' % self.transporteur.id
        )
        from analytics.services import get_user_trust_score
        self.assertEqual(
            reponse.data['trust_score'], get_user_trust_score(self.client_user)
        )
