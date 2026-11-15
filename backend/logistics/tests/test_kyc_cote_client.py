"""
KYC appliqué au TRANSPORTEUR quand c'est le CLIENT qui engage la course.

Contre-audit : accepter une offre, réserver un trajet retour en direct ou
accepter une contre-proposition engageait un transporteur non vérifié,
refusé ou suspendu. Réponse attendue : la même que pour un transporteur
bloqué pour dette (409 TRANSPORTER_UNAVAILABLE), sans révéler son statut.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from logistics.models import Offer, ReturnTripRequest, TransportJob
from logistics.tests.aides_kyc import verify_transporter
from trust.models import TrustProfile

User = get_user_model()
SANS_LIMITEUR = {'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}}
STATUTS_BLOQUANTS = ('UNVERIFIED', 'PENDING', 'REJECTED', 'SUSPENDED')


def _user(email, role):
    return User.objects.create_user(username=email, email=email, password='SecurePass123!',
                                    role=role, first_name='A', last_name='B')


def _trajet(owner, **kw):
    return TransportJob.objects.create(
        owner=owner, status='PUBLISHED', job_type='TRANSPORT', is_return_trip=True,
        pickup_address='Sfax', pickup_governorate='Sfax', dropoff_address='Tunis',
        dropoff_governorate='Tunis', scheduled_time=timezone.now() + timedelta(days=2), **kw)


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR)
class KycCoteClientTests(APITestCase):

    def setUp(self):
        self.client_user = _user('c@t.tn', 'CLIENT')
        self.client.force_authenticate(self.client_user)

    def _transporteur(self, statut):
        t = _user(f't-{statut.lower()}@t.tn', 'TRANSPORTER')
        TrustProfile.objects.create(user=t, verification_status=statut)
        return t

    def _assert_neutre(self, r):
        self.assertEqual(r.status_code, 409, r.data)
        self.assertEqual(r.data['code'], 'TRANSPORTER_UNAVAILABLE')
        self.assertNotIn('trust_status', r.data)
        for mot in ('KYC', 'vérif', 'suspendu', 'refus'):
            self.assertNotIn(mot, r.data['error'])

    def test_accepter_l_offre_d_un_transporteur_non_verifie(self):
        for statut in STATUTS_BLOQUANTS:
            with self.subTest(statut=statut):
                t = self._transporteur(statut)
                job = TransportJob.objects.create(
                    owner=self.client_user, status='PUBLISHED', job_type='TRANSPORT',
                    pickup_address='A', dropoff_address='B',
                    scheduled_time=timezone.now() + timedelta(days=2))
                offre = Offer.objects.create(
                    job=job, transporter=t, status='PENDING', total_price=Decimal('100'),
                    price_net=Decimal('90'), commission_amount=Decimal('10'),
                    valid_until=timezone.now() + timedelta(days=3))
                r = self.client.post(f'/api/offers/{offre.id}/accept/', {'payment_method': 'COD'}, format='json')
                self._assert_neutre(r)
                job.refresh_from_db()
                self.assertEqual(job.status, 'PUBLISHED')

    def test_reserver_en_direct_le_trajet_d_un_transporteur_non_verifie(self):
        for statut in STATUTS_BLOQUANTS:
            with self.subTest(statut=statut):
                trajet = _trajet(self._transporteur(statut), instant_booking=True)
                r = self.client.post(f'/api/jobs/{trajet.id}/book-return/',
                                     {'proposed_price': '120', 'payment_method': 'COD'}, format='json')
                self._assert_neutre(r)

    def test_accepter_la_contre_proposition_d_un_transporteur_non_verifie(self):
        for statut in STATUTS_BLOQUANTS:
            with self.subTest(statut=statut):
                trajet = _trajet(self._transporteur(statut))
                demande = ReturnTripRequest.objects.create(
                    job=trajet, client=self.client_user, description='x',
                    proposed_price=Decimal('200'), payment_method='COD',
                    status='COUNTERED', counter_price=Decimal('210'))
                r = self.client.post(f'/api/trip-requests/{demande.id}/accept-counter/', {}, format='json')
                self._assert_neutre(r)

    def test_une_derogation_admin_ne_leve_pas_une_suspension(self):
        from logistics.kyc import is_transporter_verified
        from trust.services_admin import has_active_override  # noqa: F401 (portée réelle)
        t = self._transporteur('SUSPENDED')
        from unittest import mock
        with mock.patch('trust.services_admin.has_active_override', return_value=True):
            self.assertFalse(is_transporter_verified(t))
        # La dérogation lève encore un simple défaut de vérification.
        t2 = self._transporteur('PENDING')
        with mock.patch('trust.services_admin.has_active_override', return_value=True):
            self.assertTrue(is_transporter_verified(t2))

    def test_transporteur_verifie_reste_reservable(self):
        t = _user('ok@t.tn', 'TRANSPORTER')
        verify_transporter(t)
        trajet = _trajet(t, instant_booking=True)
        r = self.client.post(f'/api/jobs/{trajet.id}/book-return/',
                             {'proposed_price': '120', 'payment_method': 'COD'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR)
class ModificationTrajetNonVerifieTests(APITestCase):

    def test_non_verifie_ne_modifie_pas_mais_peut_supprimer(self):
        t = _user('tp@t.tn', 'TRANSPORTER')
        TrustProfile.objects.create(user=t, verification_status='SUSPENDED')
        trajet = _trajet(t)
        self.client.force_authenticate(t)
        r = self.client.patch(f'/api/jobs/{trajet.id}/return-trip/', {'pickup_address': 'Gabès'}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data['code'], 'KYC_REQUIRED')
        trajet.refresh_from_db()
        self.assertEqual(trajet.pickup_address, 'Sfax')
        r = self.client.delete(f'/api/jobs/{trajet.id}/return-trip/')
        self.assertEqual(r.status_code, 200)


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR)
class ReservationDirecteJusquALaLivraisonTests(APITestCase):
    """
    Contre-audit 9a : sans demande ACCEPTED, le client d'une réservation
    directe n'était pas reconnu comme payeur et ne voyait jamais son code :
    le transporteur ne pouvait pas terminer la mission.
    """

    def test_reservation_directe_code_visible_et_livraison(self):
        transporteur = _user('td@t.tn', 'TRANSPORTER')
        verify_transporter(transporteur)
        client_user = _user('cd@t.tn', 'CLIENT')
        trajet = _trajet(transporteur, instant_booking=True)

        self.client.force_authenticate(client_user)
        r = self.client.post(f'/api/jobs/{trajet.id}/book-return/',
                             {'proposed_price': '120', 'payment_method': 'COD'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(ReturnTripRequest.objects.filter(
            job=trajet, client=client_user, status='ACCEPTED').exists())

        self.client.force_authenticate(transporteur)
        r = self.client.post(f'/api/jobs/{trajet.id}/confirm-start/')
        self.assertEqual(r.status_code, 200, r.data)

        self.client.force_authenticate(client_user)
        r = self.client.get(f'/api/jobs/{trajet.id}/')
        pin = r.data.get('delivery_pin')
        self.assertTrue(pin and len(pin) == 4, r.data.get('delivery_pin'))

        # Le client écrit au transporteur (participant reconnu par la demande).
        r = self.client.post(f'/api/jobs/{trajet.id}/messages/', {'content': 'Je suis là'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)

        self.client.force_authenticate(transporteur)
        r = self.client.post(f'/api/jobs/{trajet.id}/complete/', {'pin': pin}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        trajet.refresh_from_db()
        self.assertEqual(trajet.status, 'COMPLETED')
