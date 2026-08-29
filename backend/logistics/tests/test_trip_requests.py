"""
Sprint 3 — cœur du pivot.

Couvre :
- demande structurée D5 : création, doublon, garde COD, accept (8 % D13,
  MATCHED + Booking, rejet des concurrentes D12), reject, counter + accept-counter
- D11 : réservation instantanée désactivée par défaut (garde), activable
- C9 : édition / suppression d'un trajet retour par son propriétaire ;
  fin du 403 sur GET /api/jobs/<id>/offers/ pour l'owner transporteur
- NSM : distance_km stockée à la création
- E1 : notification MESSAGE_RECEIVED sur message entrant ;
  OFFER_REJECTED notifié aux perdants d'une acceptation
"""
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from logistics.models import TransportJob, Offer, ReturnTripRequest
from trust.models import TrustProfile, VerificationStatus
from payments.models import Booking
from notifications.models import Notification

User = get_user_model()


@override_settings(
    REST_FRAMEWORK={'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}},
    PAYMENT_GATEWAY='SANDBOX',
)
class TripRequestTestBase(APITestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(
            username='tr_client', email='trclient@test.tn',
            password='SecurePass123!', role='CLIENT',
            first_name='Cli', last_name='Ent',
        )
        self.client_user2 = User.objects.create_user(
            username='tr_client2', email='trclient2@test.tn',
            password='SecurePass123!', role='CLIENT',
            first_name='Cli2', last_name='Ent2',
        )
        self.transporter = User.objects.create_user(
            username='tr_transporter', email='trtransporter@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
            first_name='Trans', last_name='Porter',
        )
        TrustProfile.objects.create(
            user=self.transporter,
            verification_status=VerificationStatus.VERIFIED,
            verified_at=timezone.now(),
        )

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _trip(self, instant_booking=False, **extra):
        return TransportJob.objects.create(
            owner=self.transporter, status='PUBLISHED', job_type='TRANSPORT',
            is_return_trip=True, instant_booking=instant_booking,
            pickup_address='Sousse Centre', pickup_governorate='Sousse',
            dropoff_address='Tunis Centre', dropoff_governorate='Tunis',
            scheduled_time=timezone.now() + timedelta(days=2),
            available_capacity='2 tonnes', **extra,
        )

    def _request(self, trip, user=None, price='200.00', payment='DIGITAL'):
        self._auth(user or self.client_user)
        return self.client.post(f'/api/jobs/{trip.id}/requests/', {
            'description': 'Un frigo et 5 cartons',
            'proposed_price': price,
            'payment_method': payment,
        }, format='json')


class StructuredRequestTests(TripRequestTestBase):
    def test_create_request(self):
        trip = self._trip()
        resp = self._request(trip)
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(resp.data['request']['status'], 'PENDING')
        # Transporter notified
        self.assertTrue(Notification.objects.filter(
            user=self.transporter, type='TRIP_REQUEST_RECEIVED').exists())

    def test_duplicate_pending_rejected(self):
        trip = self._trip()
        self.assertEqual(self._request(trip).status_code, 201)
        resp = self._request(trip)
        self.assertEqual(resp.status_code, 400)

    def test_cod_threshold(self):
        trip = self._trip()
        resp = self._request(trip, price='350.00', payment='COD')
        self.assertEqual(resp.status_code, 400)

    def test_transporter_role_cannot_request(self):
        trip = self._trip()
        self._auth(self.transporter)
        resp = self.client.post(f'/api/jobs/{trip.id}/requests/', {
            'description': 'x', 'proposed_price': '100'}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_accept_applies_8_percent_and_matches(self):
        trip = self._trip()
        req_id = self._request(trip).data['request']['id']
        concurrent_id = self._request(trip, user=self.client_user2, price='210').data['request']['id']

        self._auth(self.transporter)
        resp = self.client.post(f'/api/trip-requests/{req_id}/respond/',
                                {'action': 'accept'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)

        trip.refresh_from_db()
        self.assertEqual(trip.status, 'MATCHED')

        offer = Offer.objects.get(job=trip, status='ACCEPTED')
        # D13 : 8 % — total 200 → net 185.19, commission 14.81
        self.assertEqual(offer.total_price, Decimal('200.00'))
        self.assertEqual(offer.price_net, Decimal('185.19'))
        self.assertEqual(offer.commission_amount, Decimal('14.81'))

        booking = Booking.objects.get(job=trip)
        self.assertEqual(booking.commission_rate, Decimal('0.08'))

        # D12 unitaire : la demande concurrente est rejetée + notifiée
        other = ReturnTripRequest.objects.get(id=concurrent_id)
        self.assertEqual(other.status, 'REJECTED')
        self.assertTrue(Notification.objects.filter(
            user=self.client_user2, type='TRIP_REQUEST_REJECTED').exists())
        # Client accepté notifié
        self.assertTrue(Notification.objects.filter(
            user=self.client_user, type='TRIP_REQUEST_ACCEPTED').exists())

    def test_reject_notifies_client(self):
        trip = self._trip()
        req_id = self._request(trip).data['request']['id']
        self._auth(self.transporter)
        resp = self.client.post(f'/api/trip-requests/{req_id}/respond/',
                                {'action': 'reject', 'message': 'complet'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(Notification.objects.filter(
            user=self.client_user, type='TRIP_REQUEST_REJECTED').exists())

    def test_counter_then_client_accepts(self):
        trip = self._trip()
        req_id = self._request(trip, price='150.00').data['request']['id']

        self._auth(self.transporter)
        resp = self.client.post(f'/api/trip-requests/{req_id}/respond/',
                                {'action': 'counter', 'counter_price': '180.00'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertTrue(Notification.objects.filter(
            user=self.client_user, type='TRIP_REQUEST_COUNTERED').exists())

        self._auth(self.client_user)
        resp = self.client.post(f'/api/trip-requests/{req_id}/accept-counter/', {}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)

        offer = Offer.objects.get(job=trip, status='ACCEPTED')
        self.assertEqual(offer.total_price, Decimal('180.00'))
        # 180 / 1.08 = 166.67
        self.assertEqual(offer.price_net, Decimal('166.67'))

    def test_only_owner_can_respond(self):
        trip = self._trip()
        req_id = self._request(trip).data['request']['id']
        other_transporter = User.objects.create_user(
            username='tr_other', email='trother@test.tn',
            password='SecurePass123!', role='TRANSPORTER')
        self._auth(other_transporter)
        resp = self.client.post(f'/api/trip-requests/{req_id}/respond/',
                                {'action': 'accept'}, format='json')
        self.assertEqual(resp.status_code, 403)


class InstantBookingGuardTests(TripRequestTestBase):
    def test_book_return_blocked_by_default(self):
        trip = self._trip(instant_booking=False)
        self._auth(self.client_user)
        resp = self.client.post(f'/api/jobs/{trip.id}/book-return/',
                                {'proposed_price': '100', 'payment_method': 'DIGITAL'}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data.get('code'), 'REQUEST_REQUIRED')

    def test_book_return_allowed_when_opted_in(self):
        trip = self._trip(instant_booking=True)
        self._auth(self.client_user)
        resp = self.client.post(f'/api/jobs/{trip.id}/book-return/',
                                {'proposed_price': '100', 'payment_method': 'DIGITAL'}, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        trip.refresh_from_db()
        self.assertEqual(trip.status, 'MATCHED')  # D3
        offer = Offer.objects.get(job=trip)
        # D13 : 8 % sur la réservation directe aussi (100/1.08 = 92.59)
        self.assertEqual(offer.price_net, Decimal('92.59'))


class ReturnTripLifecycleTests(TripRequestTestBase):
    def test_owner_can_edit(self):
        trip = self._trip()
        self._auth(self.transporter)
        resp = self.client.patch(f'/api/jobs/{trip.id}/return-trip/', {
            'available_capacity': '1 tonne restante',
            'price_tnd_min': '80.00',
        }, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        trip.refresh_from_db()
        self.assertEqual(trip.available_capacity, '1 tonne restante')

    def test_non_owner_cannot_edit(self):
        trip = self._trip()
        other = User.objects.create_user(
            username='tr_other2', email='trother2@test.tn',
            password='SecurePass123!', role='TRANSPORTER')
        self._auth(other)
        resp = self.client.patch(f'/api/jobs/{trip.id}/return-trip/',
                                 {'available_capacity': 'x'}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_owner_delete_rejects_pending_requests(self):
        trip = self._trip()
        req_id = self._request(trip).data['request']['id']
        self._auth(self.transporter)
        resp = self.client.delete(f'/api/jobs/{trip.id}/return-trip/')
        self.assertEqual(resp.status_code, 200, resp.data)
        trip.refresh_from_db()
        self.assertEqual(trip.status, 'CANCELLED')
        self.assertEqual(ReturnTripRequest.objects.get(id=req_id).status, 'REJECTED')

    def test_owner_sees_offers_no_403(self):
        """C9 : plus de 403 pour le transporteur propriétaire."""
        trip = self._trip()
        self._auth(self.transporter)
        resp = self.client.get(f'/api/jobs/{trip.id}/offers/')
        self.assertEqual(resp.status_code, 200)


class NsmInstrumentationTests(TripRequestTestBase):
    def test_distance_stored_on_job_creation(self):
        self._auth(self.client_user)
        resp = self.client.post('/api/jobs/', {
            'job_type': 'TRANSPORT',
            'pickup_address': 'Tunis', 'pickup_lat': '36.8065', 'pickup_lng': '10.1815',
            'dropoff_address': 'Sfax', 'dropoff_lat': '34.7406', 'dropoff_lng': '10.7603',
            'scheduled_time': (timezone.now() + timedelta(days=2)).isoformat(),
            'description': 'test NSM',
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        job_id = (resp.data.get('job') or resp.data)['id']
        job = TransportJob.objects.get(id=job_id)
        self.assertIsNotNone(job.distance_km)
        # Tunis→Sfax ≈ 235 km à vol d'oiseau × 1.25 ≈ 290 km
        self.assertGreater(float(job.distance_km), 250)
        self.assertLess(float(job.distance_km), 340)


class InboundNotificationTests(TripRequestTestBase):
    def test_message_received_notification(self):
        """E1 (audit C7) : un message entrant notifie le destinataire."""
        # Mission classique assignée pour ouvrir la conversation
        job = TransportJob.objects.create(
            owner=self.client_user, status='IN_PROGRESS', job_type='TRANSPORT',
            pickup_address='Tunis', dropoff_address='Sousse',
            scheduled_time=timezone.now() + timedelta(days=1),
        )
        Offer.objects.create(
            job=job, transporter=self.transporter, status='ACCEPTED',
            price_net=Decimal('100'), commission_amount=Decimal('12'),
            total_price=Decimal('112'),
            valid_until=timezone.now() + timedelta(days=1),
        )
        self._auth(self.client_user)
        resp = self.client.post(f'/api/jobs/{job.id}/messages/',
                                {'content': 'Bonjour, vous arrivez quand ?'}, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertTrue(Notification.objects.filter(
            user=self.transporter, type='MESSAGE_RECEIVED').exists())

    def test_losing_offers_notified_on_accept(self):
        """E1 : OFFER_REJECTED enfin déclenché (audit bug n°6)."""
        job = TransportJob.objects.create(
            owner=self.client_user, status='PUBLISHED', job_type='TRANSPORT',
            pickup_address='Tunis', dropoff_address='Sousse',
            scheduled_time=timezone.now() + timedelta(days=2),
        )
        loser = User.objects.create_user(
            username='tr_loser', email='trloser@test.tn',
            password='SecurePass123!', role='TRANSPORTER')
        TrustProfile.objects.create(user=loser, verification_status=VerificationStatus.VERIFIED)
        winner_offer = Offer.objects.create(
            job=job, transporter=self.transporter, status='PENDING',
            price_net=Decimal('100'), commission_amount=Decimal('12'), total_price=Decimal('112'),
            valid_until=timezone.now() + timedelta(days=1))
        Offer.objects.create(
            job=job, transporter=loser, status='PENDING',
            price_net=Decimal('90'), commission_amount=Decimal('10.80'), total_price=Decimal('100.80'),
            valid_until=timezone.now() + timedelta(days=1))

        self._auth(self.client_user)
        resp = self.client.post(f'/api/offers/{winner_offer.id}/accept/',
                                {'payment_method': 'DIGITAL'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertTrue(Notification.objects.filter(
            user=loser, type='OFFER_REJECTED').exists())


class ReceivedTripRequestsTests(TripRequestTestBase):
    """
    T2.1 (lot 2) — la boîte de réception transporteur.

    Jusqu'ici les demandes n'étaient lisibles que trajet par trajet : un
    transporteur avec trois retours en ligne devait visiter trois écrans pour
    savoir ce qui attendait sa décision. Ces tests verrouillent le vis-à-vis
    transporteur de `trip-requests/my/`.
    """

    URL = '/api/trip-requests/received/'

    def test_consolide_les_demandes_de_tous_les_trajets(self):
        """C'est l'objet même de l'écran : une seule liste, tous trajets."""
        trip_a = self._trip()
        # `_trip` fixe deja gouvernorats ET date : le second trajet est cree
        # directement, sur un corridor different pour rester realiste.
        trip_b = TransportJob.objects.create(
            owner=self.transporter, status='PUBLISHED', job_type='TRANSPORT',
            is_return_trip=True,
            pickup_address='Sfax Centre', pickup_governorate='Sfax',
            dropoff_address='Gabes Centre', dropoff_governorate='Gabès',
            scheduled_time=timezone.now() + timedelta(days=4),
            available_capacity='1 tonne',
        )
        self._request(trip_a, user=self.client_user)
        self._request(trip_b, user=self.client_user2)

        self._auth(self.transporter)
        res = self.client.get(self.URL)

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 2)
        jobs = {ligne['job'] for ligne in res.data['results']}
        self.assertEqual(jobs, {trip_a.id, trip_b.id})

    def test_ne_montre_que_les_demandes_recues_par_ce_transporteur(self):
        """Cloisonnement : les demandes d'un autre transporteur sont invisibles."""
        autre = User.objects.create_user(
            username='tr_autre', email='trautre@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
        )
        trip_autre = TransportJob.objects.create(
            owner=autre, status='PUBLISHED', job_type='TRANSPORT',
            is_return_trip=True,
            pickup_address='Gabes', pickup_governorate='Gabès',
            dropoff_address='Sfax', dropoff_governorate='Sfax',
            scheduled_time=timezone.now() + timedelta(days=2),
        )
        self._request(trip_autre, user=self.client_user)

        self._auth(self.transporter)
        res = self.client.get(self.URL)

        self.assertEqual(res.data['count'], 0)

    def test_filtre_par_statut(self):
        """L'écran a des onglets « à décider » / « en négociation »."""
        trip = self._trip()
        self._request(trip, user=self.client_user)
        demande = ReturnTripRequest.objects.get()
        demande.status = ReturnTripRequest.Status.COUNTERED
        demande.save()

        self._auth(self.transporter)
        self.assertEqual(self.client.get(f'{self.URL}?status=PENDING').data['count'], 0)
        self.assertEqual(self.client.get(f'{self.URL}?status=COUNTERED').data['count'], 1)
        self.assertEqual(
            self.client.get(f'{self.URL}?status=PENDING,COUNTERED').data['count'], 1,
        )

    def test_un_statut_inconnu_est_rejete_et_non_ignore(self):
        """
        Une valeur invalide renverrait sinon une liste vide, indistinguable
        d'une absence de demandes — un compteur à zéro qui ment.
        """
        self._auth(self.transporter)
        res = self.client.get(f'{self.URL}?status=NIMPORTEQUOI')

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('status', res.data)

    def test_interdit_au_client(self):
        """RequireRole : ce vis-à-vis est réservé au transporteur."""
        self._auth(self.client_user)
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_expose_sur_la_surface_v1_du_mobile(self):
        """
        Le plan impose les deux surfaces API : un endpoint absent de /api/v1/
        desynchronise silencieusement le mobile.
        """
        trip = self._trip()
        self._request(trip, user=self.client_user)

        self._auth(self.transporter)
        res = self.client.get('/api/v1/trip-requests/received/')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)


class OffresLisiblesParLeClientTests(TripRequestTestBase):
    """
    Sur un trajet retour, le propriétaire est le TRANSPORTEUR. Le client dont
    la demande vient d'être acceptée doit néanmoins pouvoir lire l'offre pour
    la payer : l'écran /jobs/<id>/book la réclame. Avant ce correctif il
    recevait 404 et le paiement était inatteignable — la négociation aboutissait
    sans pouvoir se conclure.

    L'ouverture est étroite et ces tests en fixent les bornes.
    """

    def _trajet_avec_demande_acceptee(self):
        trip = self._trip()
        self.assertEqual(self._request(trip).status_code, 201)
        demande = ReturnTripRequest.objects.get(job=trip, client=self.client_user)
        self._auth(self.transporter)
        resp = self.client.post(
            f'/api/trip-requests/{demande.id}/respond/',
            {'action': 'accept'}, format='json',
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        return trip

    def test_le_client_accepte_lit_l_offre(self):
        trip = self._trajet_avec_demande_acceptee()
        self._auth(self.client_user)
        resp = self.client.get(f'/api/jobs/{trip.id}/offers/')
        self.assertEqual(resp.status_code, 200, resp.data)
        resultats = resp.data.get('results', resp.data)
        self.assertEqual(len(resultats), 1)
        self.assertEqual(resultats[0]['status'], Offer.Status.ACCEPTED)

    def test_un_autre_client_ne_voit_rien(self):
        trip = self._trajet_avec_demande_acceptee()
        self._auth(self.client_user2)
        resp = self.client.get(f'/api/jobs/{trip.id}/offers/')
        # 404 et non 403 : ne pas révéler qu'un trajet existe et appartient à
        # quelqu'un d'autre.
        self.assertEqual(resp.status_code, 404)

    def test_demande_seulement_en_attente_ne_suffit_pas(self):
        trip = self._trip()
        self.assertEqual(self._request(trip).status_code, 201)
        self._auth(self.client_user)
        resp = self.client.get(f'/api/jobs/{trip.id}/offers/')
        self.assertEqual(resp.status_code, 404)

    def test_le_proprietaire_voit_toujours_tout(self):
        trip = self._trajet_avec_demande_acceptee()
        self._auth(self.transporter)
        resp = self.client.get(f'/api/jobs/{trip.id}/offers/')
        self.assertEqual(resp.status_code, 200, resp.data)
        resultats = resp.data.get('results', resp.data)
        self.assertGreaterEqual(len(resultats), 1)
