"""
KYC obligatoire : un transporteur non VERIFIED ne peut rien engager de neuf.

Refus attendu : 403, corps {"error", "detail", "code": "KYC_REQUIRED",
"trust_status"} — même forme que COMMISSION_DEBT_LIMIT, contrôle placé AVANT
celui de la dette. Une mission déjà engagée se termine normalement.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from logistics.models import Offer, ReturnTripRequest, TransportJob
from payments.models import Booking, CommissionLedger
from trust.models import TrustOverride, TrustProfile, VerificationStatus
from logistics.tests.aides_kyc import verify_transporter

User = get_user_model()
V1 = '/api/v1'
SANS_LIMITEUR = {'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}}


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR)
class KycObligatoireTests(APITestCase):

    def setUp(self):
        self.transporteur = User.objects.create_user(
            username='kyc_t', email='kyct@test.tn', password='SecurePass123!',
            role='TRANSPORTER', first_name='Slim', last_name='T')
        self.client_user = User.objects.create_user(
            username='kyc_c', email='kycc@test.tn', password='SecurePass123!',
            role='CLIENT', first_name='Amine', last_name='B')

    def _dossier(self, statut):
        return TrustProfile.objects.create(user=self.transporteur, verification_status=statut)

    def _trajet(self):
        return TransportJob.objects.create(
            owner=self.transporteur, status='PUBLISHED', job_type='TRANSPORT',
            is_return_trip=True, pickup_address='Sfax', pickup_governorate='Sfax',
            dropoff_address='Tunis', dropoff_governorate='Tunis',
            scheduled_time=timezone.now() + timedelta(days=2))

    def _assert_kyc(self, reponse, statut):
        self.assertEqual(reponse.status_code, 403, reponse.data)
        self.assertEqual(reponse.data['code'], 'KYC_REQUIRED')
        self.assertEqual(reponse.data['trust_status'], statut)
        self.assertTrue(reponse.data['error'])
        self.assertEqual(reponse.data['error'], reponse.data['detail'])

    # --- (a) publier un trajet retour ---------------------------------------

    def test_sans_dossier_il_ne_publie_pas(self):
        self.client.force_authenticate(self.transporteur)
        reponse = self.client.post(f'{V1}/jobs/return-trip/', {}, format='json')
        self._assert_kyc(reponse, 'NO_PROFILE')

    def test_dossier_en_attente_il_ne_publie_pas(self):
        self._dossier(VerificationStatus.PENDING)
        self.client.force_authenticate(self.transporteur)
        reponse = self.client.post(f'{V1}/jobs/return-trip/', {}, format='json')
        self._assert_kyc(reponse, 'PENDING')

    def test_verifie_il_passe_le_controle(self):
        verify_transporter(self.transporteur)
        self.client.force_authenticate(self.transporteur)
        reponse = self.client.post(f'{V1}/jobs/return-trip/', {}, format='json')
        # Corps vide : refusé pour ses champs (400), plus pour le KYC.
        self.assertEqual(reponse.status_code, 400, reponse.data)

    def test_le_kyc_passe_avant_la_dette(self):
        self._dossier(VerificationStatus.UNVERIFIED)
        CommissionLedger.objects.create(
            transporter=self.transporteur,
            job_reference=TransportJob.objects.create(
                owner=self.transporteur, status='COMPLETED', job_type='TRANSPORT',
                is_return_trip=True, pickup_address='A', dropoff_address='B',
                scheduled_time=timezone.now()),
            amount=Decimal('500.00'))
        self.client.force_authenticate(self.transporteur)
        reponse = self.client.post(f'{V1}/jobs/return-trip/', {}, format='json')
        self._assert_kyc(reponse, 'UNVERIFIED')

    def test_une_derogation_admin_leve_le_controle(self):
        self._dossier(VerificationStatus.PENDING)
        admin = User.objects.create_user(
            username='kyc_a', email='kyca@test.tn', password='SecurePass123!', role='ADMIN')
        TrustOverride.objects.create(
            user=self.transporteur, scope='ACCEPT_OFFER', granted_by=admin,
            reason='Dossier papier vérifié en agence', expires_at=timezone.now() + timedelta(days=1))
        self.client.force_authenticate(self.transporteur)
        reponse = self.client.post(f'{V1}/jobs/return-trip/', {}, format='json')
        self.assertEqual(reponse.status_code, 400, reponse.data)

    # --- (b) faire une offre --------------------------------------------------

    def test_sans_kyc_il_ne_fait_pas_d_offre(self):
        self._dossier(VerificationStatus.REJECTED)
        besoin = TransportJob.objects.create(
            owner=self.client_user, status='PUBLISHED', job_type='TRANSPORT',
            pickup_address='Sfax', dropoff_address='Tunis',
            scheduled_time=timezone.now() + timedelta(days=2))
        self.client.force_authenticate(self.transporteur)
        reponse = self.client.post(f'{V1}/offers/', {
            'job': besoin.id, 'price_net': '100.00', 'message': 'Dispo demain',
            'valid_until': (timezone.now() + timedelta(days=2)).isoformat(),
        }, format='json')
        self._assert_kyc(reponse, 'REJECTED')
        self.assertFalse(Offer.objects.filter(job=besoin).exists())

    # --- (c) accepter ou contre-proposer sur une demande ----------------------

    def _demande(self):
        trajet = self._trajet()
        return ReturnTripRequest.objects.create(
            job=trajet, client=self.client_user, description='Deux palettes',
            proposed_price=Decimal('200.00'), payment_method='COD')

    def test_sans_kyc_il_n_accepte_ni_ne_contre_propose(self):
        self._dossier(VerificationStatus.PARTIALLY_REVIEWED)
        demande = self._demande()
        self.client.force_authenticate(self.transporteur)
        url = f'{V1}/trip-requests/{demande.id}/respond/'

        self._assert_kyc(self.client.post(url, {'action': 'accept'}, format='json'), 'PARTIALLY_REVIEWED')
        self._assert_kyc(
            self.client.post(url, {'action': 'counter', 'counter_price': '250'}, format='json'),
            'PARTIALLY_REVIEWED')
        demande.refresh_from_db()
        self.assertEqual(demande.status, 'PENDING')

        # Refuser reste possible.
        refuse = self.client.post(url, {'action': 'reject'}, format='json')
        self.assertEqual(refuse.status_code, 200, refuse.data)

    # --- une mission déjà engagée se termine -----------------------------------

    def test_une_mission_engagee_se_termine_meme_apres_perte_du_kyc(self):
        dossier = verify_transporter(self.transporteur)
        trajet = self._trajet()
        trajet.status = 'MATCHED'
        trajet.save()
        offre = Offer.objects.create(
            job=trajet, transporter=self.transporteur, status='ACCEPTED',
            price_net=Decimal('100'), commission_amount=Decimal('8'),
            total_price=Decimal('108'), valid_until=timezone.now() + timedelta(days=1))
        ReturnTripRequest.objects.create(
            job=trajet, client=self.client_user, description='Un frigo',
            proposed_price=Decimal('108'), payment_method='COD', status='ACCEPTED')
        Booking.objects.create(
            job=trajet, accepted_offer=offre, final_price=Decimal('108'),
            commission_rate=Decimal('0.08'), payment_method='COD', delivery_pin='4321')

        # Le dossier repasse en revue (ex. pièce expirée) en cours de mission.
        dossier.verification_status = VerificationStatus.PENDING
        dossier.save()

        self.client.force_authenticate(self.transporteur)
        r = self.client.post(f'{V1}/jobs/{trajet.id}/confirm-start/', {}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        r = self.client.post(f'{V1}/jobs/{trajet.id}/events/', {'event': 'ARRIVED_PICKUP'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        r = self.client.post(f'{V1}/jobs/{trajet.id}/complete/', {'pin': '4321'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
