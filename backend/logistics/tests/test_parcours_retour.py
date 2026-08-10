"""
Lot 0 — le parcours CLIENT d'un trajet retour, de bout en bout.

Ces tests existent parce que le canal retour — le cœur du modèle — était cassé
côté serveur pour le client, et qu'aucun test ne s'en apercevait. Sur un trajet
retour, ``job.owner`` est le TRANSPORTEUR : le client n'est rattaché au job que
par une ``ReturnTripRequest`` ACCEPTED. Or messagerie, avis, litiges, détail du
job et paiements ne connaissaient que « propriétaire ou transporteur d'une offre
acceptée ». Résultat mesuré avant correctif : 403 sur le détail du job et la
messagerie, 404 sur ``payments/initiate`` et ``confirm-completion``, 400 sur
``reviews/`` et ``disputes/``.

Le contrat testé est celui que consomme le mobile : ``/api/v1/`` exclusivement.

Règle de non-régression : aucun appel légitime de ce parcours ne doit renvoyer
403 ni 404.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from logistics.models import TransportJob, Offer, ReturnTripRequest
from payments.models import Booking, CommissionLedger, EscrowTransaction
from trust.models import TrustProfile, VerificationStatus

User = get_user_model()

V1 = '/api/v1'


@override_settings(
    REST_FRAMEWORK={'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}},
    PAYMENT_GATEWAY='SANDBOX',
)
class ReturnTripJourneyBase(APITestCase):
    """Un transporteur vérifié, un client, un trajet retour publié."""

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='rt_client', email='rtclient@test.tn',
            password='SecurePass123!', role='CLIENT',
            first_name='Amine', last_name='Benali',
        )
        self.transporter = User.objects.create_user(
            username='rt_transporter', email='rttransporter@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
            first_name='Slim', last_name='Trabelsi',
        )
        # COD exige un transporteur vérifié avec un score suffisant
        TrustProfile.objects.create(
            user=self.transporter,
            verification_status=VerificationStatus.VERIFIED,
            verified_at=timezone.now(),
            trust_score=80,
        )
        self.trip = TransportJob.objects.create(
            owner=self.transporter, status='PUBLISHED', job_type='TRANSPORT',
            is_return_trip=True,
            pickup_address='Sfax Centre', pickup_governorate='Sfax',
            dropoff_address='Tunis Centre', dropoff_governorate='Tunis',
            scheduled_time=timezone.now() + timedelta(days=2),
            available_capacity='3 tonnes',
            price_tnd_min=Decimal('150.00'),
        )

    # ------------------------------------------------------------------ utils

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _send_request(self, price='200.00', payment='DIGITAL'):
        self._auth(self.client_user)
        resp = self.client.post(f'{V1}/jobs/{self.trip.id}/requests/', {
            'description': 'Deux palettes de carrelage',
            'proposed_price': price,
            'payment_method': payment,
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        return resp.data['request']['id']

    def _accept(self, request_id):
        self._auth(self.transporter)
        resp = self.client.post(f'{V1}/trip-requests/{request_id}/respond/', {
            'action': 'accept',
        }, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.trip.refresh_from_db()
        return resp

    def _booked(self, payment='DIGITAL'):
        """Raccourci : demande envoyée puis acceptée."""
        request_id = self._send_request(payment=payment)
        self._accept(request_id)
        return request_id

    def _delivery_pin(self):
        return Booking.objects.get(job=self.trip).delivery_pin


class ClientAccessAfterAcceptanceTests(ReturnTripJourneyBase):
    """Le client engagé doit pouvoir voir et suivre SA mission."""

    def test_client_reads_job_detail(self):
        self._booked()
        self._auth(self.client_user)
        resp = self.client.get(f'{V1}/jobs/{self.trip.id}/')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['status'], 'MATCHED')

    def test_client_gets_delivery_pin(self):
        """Sans le PIN, la mission ne peut jamais être terminée."""
        self._booked()
        self._auth(self.client_user)
        resp = self.client.get(f'{V1}/jobs/{self.trip.id}/')
        self.assertEqual(resp.data['delivery_pin'], self._delivery_pin())

    def test_transporter_never_sees_the_pin(self):
        """Le PIN prouve la remise : il n'appartient qu'au client."""
        self._booked()
        self._auth(self.transporter)
        resp = self.client.get(f'{V1}/jobs/{self.trip.id}/')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertIsNone(resp.data['delivery_pin'])

    def test_rejected_client_has_no_access(self):
        """Une demande refusée ne donne aucun droit sur la mission."""
        other = User.objects.create_user(
            username='rt_client2', email='rtclient2@test.tn',
            password='SecurePass123!', role='CLIENT',
            first_name='Nour', last_name='Karray',
        )
        self._booked()  # le trajet part en MATCHED
        self._auth(other)
        resp = self.client.get(f'{V1}/jobs/{self.trip.id}/')
        self.assertEqual(resp.status_code, 403)

    def test_client_reads_and_posts_messages(self):
        self._booked()
        self._auth(self.client_user)

        read = self.client.get(f'{V1}/jobs/{self.trip.id}/messages/')
        self.assertEqual(read.status_code, 200, read.data)

        sent = self.client.post(f'{V1}/jobs/{self.trip.id}/messages/', {
            'content': 'Bonjour, je serai sur place à 9h.',
        }, format='json')
        self.assertIn(sent.status_code, (200, 201), sent.data)

    def test_client_sees_booking_and_escrow(self):
        self._booked()
        self._auth(self.client_user)
        self.assertEqual(
            self.client.get(f'{V1}/jobs/{self.trip.id}/booking/').status_code, 200
        )
        self.assertEqual(
            self.client.get(f'{V1}/jobs/{self.trip.id}/escrow/').status_code, 200
        )


class CodJourneyTests(ReturnTripJourneyBase):
    """Chemin nominal du MVP : paiement à la livraison."""

    def _complete_cod(self):
        self._booked(payment='COD')

        self._auth(self.transporter)
        start = self.client.post(f'{V1}/jobs/{self.trip.id}/confirm-start/')
        self.assertEqual(start.status_code, 200, start.data)

        done = self.client.post(f'{V1}/jobs/{self.trip.id}/complete/', {
            'pin': self._delivery_pin(),
        }, format='json')
        self.assertEqual(done.status_code, 200, done.data)

    def test_cod_mission_completes(self):
        self._complete_cod()
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.status, 'COMPLETED')

    def test_cod_generates_commission_debt(self):
        """Sans cette dette, une livraison COD ne rapporte rien à la plateforme."""
        self._complete_cod()
        ledger = CommissionLedger.objects.filter(
            transporter=self.transporter, job_reference=self.trip
        ).first()
        self.assertIsNotNone(ledger, "Aucune dette de commission créée sur un COD livré")
        self.assertFalse(ledger.is_settled)
        self.assertGreater(ledger.amount, Decimal('0'))

    def test_cod_earnings_are_visible_in_the_wallet(self):
        """Le transporteur voyait 0 TND après avoir encaissé en espèces."""
        self._complete_cod()
        self._auth(self.transporter)
        resp = self.client.get(f'{V1}/wallet/')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertGreater(resp.data['cod_collected_net'], 0)
        self.assertGreater(resp.data['cod_debt'], 0)
        # L'argent est en main, pas chez la plateforme : rien à retirer.
        self.assertLessEqual(resp.data['available'], 0)
        self.assertTrue(any(h['kind'] == 'COD' for h in resp.data['history']))

    def test_client_reviews_the_transporter(self):
        self._complete_cod()
        self._auth(self.client_user)
        resp = self.client.post(f'{V1}/reviews/', {
            'job_id': self.trip.id, 'rating': 5, 'comment': 'Ponctuel et soigneux.',
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)

    def test_transporter_reviews_the_client_without_crashing(self):
        """Régression : le transporteur propriétaire s'auto-évaluait (500)."""
        self._complete_cod()
        self._auth(self.transporter)
        resp = self.client.post(f'{V1}/reviews/', {
            'job_id': self.trip.id, 'rating': 4, 'comment': 'Client disponible et clair.',
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)

    def test_client_opens_a_dispute(self):
        self._complete_cod()
        self._auth(self.client_user)
        resp = self.client.post(f'{V1}/disputes/', {
            'job_id': self.trip.id,
            'reason': 'DAMAGED_ITEMS',
            'description': "Un carton est arrivé écrasé, le carrelage est fendu.",
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)


class DigitalJourneyTests(ReturnTripJourneyBase):
    """Paiement digital en sandbox : la boucle argent complète."""

    def test_full_digital_loop_releases_the_escrow(self):
        self._booked(payment='DIGITAL')

        # 1. Le client paie
        self._auth(self.client_user)
        init = self.client.post(f'{V1}/payments/initiate/', {
            'job_id': self.trip.id, 'platform': 'mobile',
        }, format='json')
        self.assertEqual(init.status_code, 200, init.data)
        gateway_ref = init.data['gateway_ref']

        verify = self.client.post(f'{V1}/payments/verify/', {
            'gateway_ref': gateway_ref,
        }, format='json')
        self.assertEqual(verify.status_code, 200, verify.data)

        escrow = EscrowTransaction.objects.get(gateway_reference=gateway_ref)
        self.assertEqual(escrow.status, EscrowTransaction.Status.HELD)
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.status, 'IN_PROGRESS')

        # 2. Le transporteur livre
        self._auth(self.transporter)
        done = self.client.post(f'{V1}/jobs/{self.trip.id}/complete/', {
            'pin': self._delivery_pin(),
        }, format='json')
        self.assertEqual(done.status_code, 200, done.data)

        # 3. Le client confirme la réception — c'est ce qui libère les fonds
        self._auth(self.client_user)
        confirm = self.client.post(f'{V1}/payments/confirm-completion/', {
            'job_id': self.trip.id,
        }, format='json')
        self.assertEqual(confirm.status_code, 200, confirm.data)

        escrow.refresh_from_db()
        self.assertEqual(escrow.status, EscrowTransaction.Status.RELEASED)

        # 4. Le transporteur voit un solde retirable
        self._auth(self.transporter)
        wallet = self.client.get(f'{V1}/wallet/')
        self.assertEqual(wallet.status_code, 200, wallet.data)
        self.assertGreater(wallet.data['available'], 0)

    def test_payment_status_readable_by_the_paying_client(self):
        self._booked(payment='DIGITAL')
        self._auth(self.client_user)
        init = self.client.post(f'{V1}/payments/initiate/', {
            'job_id': self.trip.id,
        }, format='json')
        ref = init.data['gateway_ref']
        resp = self.client.get(f'{V1}/payments/{ref}/status/')
        self.assertEqual(resp.status_code, 200, resp.data)

    def test_outsider_cannot_pay_for_someone_elses_mission(self):
        """L'ouverture au client ne doit pas ouvrir à n'importe qui."""
        intruder = User.objects.create_user(
            username='rt_intruder', email='rtintruder@test.tn',
            password='SecurePass123!', role='CLIENT',
            first_name='Inconnu', last_name='Passant',
        )
        self._booked(payment='DIGITAL')
        self._auth(intruder)
        resp = self.client.post(f'{V1}/payments/initiate/', {
            'job_id': self.trip.id,
        }, format='json')
        self.assertEqual(resp.status_code, 403)


class ClientCancellationTests(ReturnTripJourneyBase):
    """Le client doit pouvoir sortir d'une mission acceptée."""

    def test_client_cancels_and_the_trip_returns_to_the_market(self):
        request_id = self._booked(payment='COD')

        self._auth(self.client_user)
        resp = self.client.post(f'{V1}/jobs/{self.trip.id}/client-cancel/', {
            'reason': 'Mon fournisseur a décalé la livraison.',
        }, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)

        self.trip.refresh_from_db()
        # Le trajet appartient au transporteur : il repart à la vente.
        self.assertEqual(self.trip.status, 'PUBLISHED')
        self.assertEqual(
            ReturnTripRequest.objects.get(id=request_id).status,
            ReturnTripRequest.Status.CANCELLED,
        )
        self.assertFalse(Booking.objects.filter(job=self.trip).exists())
        self.assertFalse(
            Offer.objects.filter(job=self.trip, status=Offer.Status.ACCEPTED).exists()
        )

    def test_reason_is_required(self):
        self._booked(payment='COD')
        self._auth(self.client_user)
        resp = self.client.post(f'{V1}/jobs/{self.trip.id}/client-cancel/', {}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_a_stranger_cannot_cancel(self):
        other = User.objects.create_user(
            username='rt_client3', email='rtclient3@test.tn',
            password='SecurePass123!', role='CLIENT',
            first_name='Autre', last_name='Client',
        )
        self._booked(payment='COD')
        self._auth(other)
        resp = self.client.post(f'{V1}/jobs/{self.trip.id}/client-cancel/', {
            'reason': 'Je tente ma chance.',
        }, format='json')
        self.assertEqual(resp.status_code, 403)


class TrustSignalsOnMatchingTests(ReturnTripJourneyBase):
    """« Transporteur vérifié » doit être visible AVANT de s'engager."""

    def test_match_results_carry_the_owner_trust_signals(self):
        self._auth(self.client_user)
        resp = self.client.get(f'{V1}/return-trips/match/', {
            'pickup_governorate': 'Sfax',
            'dropoff_governorate': 'Tunis',
        })
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertTrue(resp.data['results'], 'Le trajet publié devrait matcher')

        first = resp.data['results'][0]
        self.assertEqual(first['owner_id'], self.transporter.id)
        self.assertEqual(first['owner_verification_status'], VerificationStatus.VERIFIED)
        self.assertEqual(first['owner_review_count'], 0)
        self.assertIsNone(first['owner_rating'])


class TransporterMissionFilterTests(ReturnTripJourneyBase):
    """?type= évite au mobile de filtrer une page de 20 côté client."""

    def test_owned_and_assigned_are_separable(self):
        self._booked(payment='COD')
        self._auth(self.transporter)

        both = self.client.get(f'{V1}/jobs/transporter/')
        owned = self.client.get(f'{V1}/jobs/transporter/', {'type': 'owned'})
        assigned = self.client.get(f'{V1}/jobs/transporter/', {'type': 'assigned'})

        for resp in (both, owned, assigned):
            self.assertEqual(resp.status_code, 200, resp.data)

        # Sur un trajet retour accepté, le job est à la fois possédé et assigné :
        # les deux vues le contiennent, et l'union reste cohérente.
        self.assertEqual(len(owned.data['results']), 1)
        self.assertEqual(len(assigned.data['results']), 1)
        self.assertEqual(len(both.data['results']), 1)
