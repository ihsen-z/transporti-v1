from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase

from logistics.models import TransportJob, Offer
from messaging.services import send_message

User = get_user_model()
V1 = '/api/v1'


class JobMessagesTruncationTests(APITestCase):
    """5.3 — `limit=100` sur GET jobs/<id>/messages/ est une troncature dure,
    pas une pagination. `total_count` doit refléter le total réel, distinct
    de `count` (toujours <= 100)."""

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='msg_client', email='msgclient@test.tn',
            password='SecurePass123!', role='CLIENT',
            first_name='Amine', last_name='Client',
        )
        self.transporter_user = User.objects.create_user(
            username='msg_transporter', email='msgtransporter@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
            first_name='Ahmed', last_name='Transporteur',
        )
        self.job = TransportJob.objects.create(
            owner=self.client_user,
            status='MATCHED',
            job_type='TRANSPORT',
            pickup_address='Tunis Centre',
            pickup_lat=Decimal('36.8065'),
            pickup_lng=Decimal('10.1815'),
            dropoff_address='Sousse Ville',
            dropoff_lat=Decimal('35.8256'),
            dropoff_lng=Decimal('10.6369'),
            scheduled_time=timezone.now() + timedelta(days=1),
        )
        Offer.objects.create(
            job=self.job, transporter=self.transporter_user, status='ACCEPTED',
            price_net=Decimal('80.00'), commission_amount=Decimal('20.00'),
            total_price=Decimal('100.00'), valid_until=timezone.now() + timedelta(days=3),
        )
        self.client.force_authenticate(user=self.client_user)

    def test_total_count_matches_returned_count_under_the_cap(self):
        send_message(self.client_user, self.job, 'Bonjour')
        send_message(self.transporter_user, self.job, 'Salut')

        resp = self.client.get(f'{V1}/jobs/{self.job.id}/messages/')

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['count'], 2)
        self.assertEqual(resp.data['total_count'], 2)

    def test_total_count_exceeds_count_once_the_100_cap_is_hit(self):
        for i in range(105):
            send_message(self.client_user, self.job, f'Message {i}')

        resp = self.client.get(f'{V1}/jobs/{self.job.id}/messages/')

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['count'], 100)
        self.assertEqual(resp.data['total_count'], 105)
