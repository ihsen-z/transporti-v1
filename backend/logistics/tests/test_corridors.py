"""
Sprint 4 — matching v1 et alertes corridor (funnel client inversé).
"""
from django.test import override_settings
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from logistics.models import TransportJob, CorridorAlert
from trust.models import TrustProfile, VerificationStatus
from notifications.models import Notification

User = get_user_model()


@override_settings(REST_FRAMEWORK={'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}})
class CorridorTestBase(APITestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(
            username='cor_client', email='corclient@test.tn',
            password='SecurePass123!', role='CLIENT',
            first_name='Cli', last_name='Ent')
        self.transporter = User.objects.create_user(
            username='cor_transporter', email='cortransporter@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
            first_name='Trans', last_name='Porter')
        TrustProfile.objects.create(
            user=self.transporter,
            verification_status=VerificationStatus.VERIFIED,
            verified_at=timezone.now())

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _trip(self, pickup='Sfax', dropoff='Tunis', days=2, **extra):
        return TransportJob.objects.create(
            owner=self.transporter, status='PUBLISHED', job_type='TRANSPORT',
            is_return_trip=True,
            pickup_address=f'Centre {pickup}', pickup_governorate=pickup,
            dropoff_address=f'Centre {dropoff}', dropoff_governorate=dropoff,
            scheduled_time=timezone.now() + timedelta(days=days), **extra)


class MatchingV1Tests(CorridorTestBase):
    def test_match_by_corridor(self):
        self._trip('Sfax', 'Tunis', days=2)
        self._trip('Sfax', 'Tunis', days=5)
        self._trip('Sousse', 'Tunis', days=2)   # autre corridor
        self._trip('Sfax', 'Tunis', days=-1)    # passé → exclu

        self._auth(self.client_user)
        resp = self.client.get('/api/return-trips/match/?pickup_governorate=Sfax&dropoff_governorate=Tunis')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['count'], 2)

    def test_match_with_date_window(self):
        near = self._trip('Sfax', 'Tunis', days=2)
        self._trip('Sfax', 'Tunis', days=10)  # hors fenêtre ±48h

        target = (timezone.now() + timedelta(days=2)).date().isoformat()
        self._auth(self.client_user)
        resp = self.client.get(
            f'/api/return-trips/match/?pickup_governorate=Sfax&dropoff_governorate=Tunis&date={target}')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(resp.data['results'][0]['id'], near.id)

    def test_match_requires_corridor(self):
        self._auth(self.client_user)
        resp = self.client.get('/api/return-trips/match/?pickup_governorate=Sfax')
        self.assertEqual(resp.status_code, 400)

    def test_match_excludes_own_trips(self):
        self._trip('Sfax', 'Tunis')
        self._auth(self.transporter)  # le propriétaire cherche son propre corridor
        resp = self.client.get('/api/return-trips/match/?pickup_governorate=Sfax&dropoff_governorate=Tunis')
        self.assertEqual(resp.data['count'], 0)


class CorridorAlertTests(CorridorTestBase):
    def test_create_list_delete(self):
        self._auth(self.client_user)
        resp = self.client.post('/api/corridor-alerts/', {
            'pickup_governorate': 'Sfax', 'dropoff_governorate': 'Tunis'}, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        alert_id = resp.data['alert']['id']

        # Doublon → 200 (déjà existante), pas d'erreur
        resp = self.client.post('/api/corridor-alerts/', {
            'pickup_governorate': 'Sfax', 'dropoff_governorate': 'Tunis'}, format='json')
        self.assertEqual(resp.status_code, 200)

        resp = self.client.get('/api/corridor-alerts/')
        self.assertEqual(resp.data['count'], 1)

        resp = self.client.delete(f'/api/corridor-alerts/{alert_id}/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(self.client.get('/api/corridor-alerts/').data['count'], 0)

    def test_same_governorate_rejected(self):
        self._auth(self.client_user)
        resp = self.client.post('/api/corridor-alerts/', {
            'pickup_governorate': 'Tunis', 'dropoff_governorate': 'Tunis'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_transporter_cannot_subscribe(self):
        self._auth(self.transporter)
        resp = self.client.post('/api/corridor-alerts/', {
            'pickup_governorate': 'Sfax', 'dropoff_governorate': 'Tunis'}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_publication_triggers_alert_notification(self):
        """REC-P5 : publication d'un trajet compatible → notification à l'abonné seul."""
        other_client = User.objects.create_user(
            username='cor_other', email='corother@test.tn',
            password='SecurePass123!', role='CLIENT')
        CorridorAlert.objects.create(
            client=self.client_user, pickup_governorate='Sfax', dropoff_governorate='Tunis')
        CorridorAlert.objects.create(
            client=other_client, pickup_governorate='Gabès', dropoff_governorate='Tunis')

        self._auth(self.transporter)
        resp = self.client.post('/api/jobs/return-trip/', {
            'job_type': 'TRANSPORT',
            'pickup_address': 'Centre Sfax', 'pickup_governorate': 'Sfax',
            'dropoff_address': 'Centre Tunis', 'dropoff_governorate': 'Tunis',
            'scheduled_time': (timezone.now() + timedelta(days=3)).isoformat(),
            'available_capacity': '1 tonne',
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)

        self.assertTrue(Notification.objects.filter(
            user=self.client_user, type='CORRIDOR_TRIP_PUBLISHED').exists())
        self.assertFalse(Notification.objects.filter(
            user=other_client, type='CORRIDOR_TRIP_PUBLISHED').exists())


class ReverseMatchingTests(CorridorTestBase):
    def test_creation_returns_matching_open_requests(self):
        """Sprint 5 — matching inversé : demandes classiques ouvertes du corridor."""
        # 2 demandes classiques ouvertes Sfax→Tunis + 1 hors corridor
        for gov_from, gov_to in [('Sfax', 'Tunis'), ('Sfax', 'Tunis'), ('Sousse', 'Tunis')]:
            TransportJob.objects.create(
                owner=self.client_user, status='PUBLISHED', job_type='TRANSPORT',
                pickup_address=f'X {gov_from}', pickup_governorate=gov_from,
                dropoff_address=f'Y {gov_to}', dropoff_governorate=gov_to,
                scheduled_time=timezone.now() + timedelta(days=2))

        self._auth(self.transporter)
        resp = self.client.post('/api/jobs/return-trip/', {
            'job_type': 'TRANSPORT',
            'pickup_address': 'Centre Sfax', 'pickup_governorate': 'Sfax',
            'dropoff_address': 'Centre Tunis', 'dropoff_governorate': 'Tunis',
            'scheduled_time': (timezone.now() + timedelta(days=3)).isoformat(),
            'available_capacity': '1 tonne',
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(resp.data['matching_requests_count'], 2)
        self.assertEqual(len(resp.data['matching_requests']), 2)
        # Le serializer de liste expose la distance (G2)
        self.assertIn('distance_km', resp.data['matching_requests'][0])


class AdminPivotStatsTests(CorridorTestBase):
    def test_pivot_section_present(self):
        from decimal import Decimal as D
        from logistics.models import Offer as OfferModel
        admin = User.objects.create_user(
            username='cor_admin', email='coradmin@test.tn',
            password='SecurePass123!', role='ADMIN', is_staff=True)

        # 1 trajet retour COMPLETED avec distance (alimente la NSM)
        done = self._trip('Sfax', 'Tunis', days=-3)
        done.status = 'COMPLETED'
        done.distance_km = D('294.5')
        done.save()
        OfferModel.objects.create(
            job=done, transporter=self.transporter, status='ACCEPTED',
            price_net=D('185.19'), commission_amount=D('14.81'), total_price=D('200.00'),
            valid_until=timezone.now())
        self._trip('Tunis', 'Sousse', days=2)  # actif corridor A1

        self._auth(admin)
        resp = self.client.get('/api/admin/stats/')
        if resp.status_code == 404:
            # route name variant
            resp = self.client.get('/api/admin/dashboard/stats/')
        self.assertEqual(resp.status_code, 200, getattr(resp, 'data', resp))
        pivot = resp.data['pivot']
        self.assertEqual(pivot['nsmKmTransformed'], 294.5)
        self.assertAlmostEqual(pivot['co2SavedKg'], round(294.5 * 0.35, 1))
        self.assertEqual(pivot['extraTransporterRevenue'], 185.19)
        self.assertEqual(pivot['tripsActive'], 1)
        corridors = {c['corridor'] for c in pivot['corridorA1']}
        self.assertIn('Tunis → Sousse', corridors)
