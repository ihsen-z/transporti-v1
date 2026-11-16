"""Correctif d'audit : GET jobs/<id>/conversation/ réservé aux participants."""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from logistics.models import TransportJob, Offer
from messaging.models import Conversation
from messaging.services import send_message

User = get_user_model()
V1 = '/api/v1'


class JobConversationAccessTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username='conv_owner', email='conv_owner@test.tn',
            password='SecurePass123!', first_name='Test', last_name='User', role='CLIENT',
        )
        self.transporter = User.objects.create_user(
            username='conv_tr', email='conv_tr@test.tn',
            password='SecurePass123!', first_name='Test', last_name='User', role='TRANSPORTER',
        )
        self.stranger = User.objects.create_user(
            username='conv_stranger', email='conv_stranger@test.tn',
            password='SecurePass123!', first_name='Test', last_name='User', role='CLIENT',
        )
        self.moderator = User.objects.create_user(
            username='conv_mod', email='conv_mod@test.tn',
            password='SecurePass123!', first_name='Test', last_name='User', role='MODERATOR',
        )
        self.job = TransportJob.objects.create(
            owner=self.owner, status='MATCHED', job_type='TRANSPORT',
            pickup_address='Tunis', pickup_lat=Decimal('36.8065'), pickup_lng=Decimal('10.1815'),
            dropoff_address='Sousse', dropoff_lat=Decimal('35.8256'), dropoff_lng=Decimal('10.6369'),
            scheduled_time=timezone.now() + timedelta(days=1),
        )
        Offer.objects.create(
            job=self.job, transporter=self.transporter, status='ACCEPTED',
            price_net=Decimal('80.00'), commission_amount=Decimal('20.00'),
            total_price=Decimal('100.00'), valid_until=timezone.now() + timedelta(days=3),
        )
        self.url = f'{V1}/jobs/{self.job.id}/conversation/'

    def test_stranger_gets_404_and_no_conversation_is_created(self):
        self.client.force_authenticate(user=self.stranger)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 404)
        self.assertFalse(Conversation.objects.filter(job=self.job).exists())

    def test_stranger_cannot_read_last_message(self):
        send_message(self.owner, self.job, 'Code portail 1234')
        self.client.force_authenticate(user=self.stranger)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 404)
        self.assertNotIn('1234', str(resp.content))

    def test_participant_gets_conversation(self):
        self.client.force_authenticate(user=self.transporter)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(Conversation.objects.filter(job=self.job).exists())

    def test_moderator_reads_existing_but_does_not_create(self):
        self.client.force_authenticate(user=self.moderator)
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertFalse(Conversation.objects.filter(job=self.job).exists())

        send_message(self.owner, self.job, 'Bonjour')
        self.assertEqual(self.client.get(self.url).status_code, 200)
