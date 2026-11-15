"""
REVIEW_RECEIVED : la personne évaluée est prévenue (type défini, jamais émis).
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from logistics.models import Offer, TransportJob
from notifications.models import Notification

User = get_user_model()


@override_settings(REST_FRAMEWORK={'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}})
class AvisRecuTests(APITestCase):

    def test_le_transporteur_evalue_est_notifie_sans_la_note(self):
        client_user = User.objects.create_user(
            username='rv_c', email='rvc@test.tn', password='SecurePass123!', role='CLIENT')
        transporter = User.objects.create_user(
            username='rv_t', email='rvt@test.tn', password='SecurePass123!', role='TRANSPORTER')
        job = TransportJob.objects.create(
            owner=client_user, status='COMPLETED', job_type='TRANSPORT',
            pickup_address='Sfax', dropoff_address='Tunis',
            scheduled_time=timezone.now() - timedelta(days=1))
        Offer.objects.create(
            job=job, transporter=transporter, status='ACCEPTED',
            price_net=Decimal('100'), commission_amount=Decimal('12'),
            total_price=Decimal('112'), valid_until=timezone.now() + timedelta(days=1))

        self.client.force_authenticate(client_user)
        r = self.client.post('/api/reviews/', {'job_id': job.id, 'rating': 2, 'comment': 'Retard'}, format='json')

        self.assertEqual(r.status_code, 201, r.data)
        notif = Notification.objects.get(user=transporter, type='REVIEW_RECEIVED')
        self.assertEqual(notif.metadata['job_id'], job.id)
        # Double aveugle : ni la note ni le commentaire dans la notification.
        self.assertNotIn('2', notif.message.replace(str(job.id), ''))
        self.assertNotIn('Retard', notif.message)
        self.assertFalse(Notification.objects.filter(user=client_user, type='REVIEW_RECEIVED').exists())
