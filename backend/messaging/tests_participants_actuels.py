"""
Messagerie : l'accès repose sur la participation ACTUELLE à la mission.

Contre-audit : `Conversation.participants` n'était jamais nettoyée. Un
transporteur évincé (annulation) continuait de lire, d'écrire, de recevoir les
notifications du nouveau, et voyait les adresses dans `job`. Un tiers recevait
403 sur une mission existante et 404 sinon (sondage possible). Un modérateur
qui lisait recevait 403 à cause du marquage « lu ».
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from logistics.models import Offer, ReturnTripRequest, TransportJob
from messaging.models import Conversation, Message
from notifications.models import Notification

User = get_user_model()
SANS_LIMITEUR = {'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}}


def _user(email, role, **kw):
    return User.objects.create_user(username=email, email=email, password='SecurePass123!',
                                    role=role, first_name=email[:3], last_name='X', **kw)


def _offer(job, transporter, status='ACCEPTED'):
    return Offer.objects.create(
        job=job, transporter=transporter, status=status, total_price=Decimal('100'),
        price_net=Decimal('90'), commission_amount=Decimal('10'),
        valid_until=timezone.now() + timedelta(days=3))


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR)
class ParticipantsActuelsTests(APITestCase):

    def setUp(self):
        cache.clear()
        self.client_user = _user('cli@t.tn', 'CLIENT', phone='+21622333444')
        self.t1 = _user('t1@t.tn', 'TRANSPORTER', phone='+21611111111')
        self.t2 = _user('t2@t.tn', 'TRANSPORTER', phone='+21622222222')
        self.job = TransportJob.objects.create(
            owner=self.client_user, status='MATCHED', job_type='TRANSPORT',
            pickup_address='12 rue A, code 1234', dropoff_address='B',
            scheduled_time=timezone.now() + timedelta(days=2))
        _offer(self.job, self.t1)

    def _evincer_t1_et_engager_t2(self):
        # T1 ouvre la conversation, puis annule ; T2 est accepté ensuite.
        self.client.force_authenticate(self.t1)
        self.assertEqual(self.client.get(f'/api/jobs/{self.job.id}/conversation/').status_code, 200)
        r = self.client.post(f'/api/jobs/{self.job.id}/transporter-cancel/',
                             {'reason': 'panne'}, format='json')
        self.assertEqual(r.status_code, 200)
        _offer(self.job, self.t2)
        TransportJob.objects.filter(id=self.job.id).update(status='IN_PROGRESS')
        self.job.refresh_from_db()

    def test_le_transporteur_evince_ne_lit_ni_n_ecrit_plus(self):
        self._evincer_t1_et_engager_t2()
        self.client.force_authenticate(self.client_user)
        r = self.client.post(f'/api/jobs/{self.job.id}/messages/', {'content': 'T2, porte 4567'}, format='json')
        self.assertEqual(r.status_code, 201)

        self.client.force_authenticate(self.t1)
        lecture = self.client.get(f'/api/jobs/{self.job.id}/messages/')
        ecriture = self.client.post(f'/api/jobs/{self.job.id}/messages/', {'content': 'coucou'}, format='json')
        conv = self.client.get(f'/api/jobs/{self.job.id}/conversation/')
        for r in (lecture, ecriture, conv):
            self.assertEqual(r.status_code, 404)
            self.assertNotIn('pickup_address', str(r.data))
        liste = self.client.get('/api/conversations/')
        self.assertEqual(liste.status_code, 200)
        self.assertEqual(liste.data['count'] if isinstance(liste.data, dict) else len(liste.data), 0)

    def test_le_nouveau_transporteur_voit_le_client_et_recoit_les_notifications(self):
        self._evincer_t1_et_engager_t2()
        self.client.force_authenticate(self.client_user)
        self.client.post(f'/api/jobs/{self.job.id}/messages/', {'content': 'Bonjour'}, format='json')

        self.assertTrue(Notification.objects.filter(user=self.t2, type='MESSAGE_RECEIVED').exists())
        self.assertFalse(Notification.objects.filter(user=self.t1, type='MESSAGE_RECEIVED').exists())

        # Liste stockée resynchronisée : T1 retiré, T2 ajouté.
        conv = Conversation.objects.get(job=self.job)
        self.assertEqual(set(conv.participants.values_list('id', flat=True)),
                         {self.client_user.id, self.t2.id})

        self.client.force_authenticate(self.t2)
        r = self.client.get(f'/api/jobs/{self.job.id}/messages/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['other_party']['id'], self.client_user.id)
        self.client.force_authenticate(self.client_user)
        r = self.client.get(f'/api/jobs/{self.job.id}/messages/')
        self.assertEqual(r.data['other_party']['id'], self.t2.id)

    def test_un_tiers_recoit_404_comme_pour_une_mission_inexistante(self):
        tiers = _user('tiers@t.tn', 'CLIENT')
        self.client.force_authenticate(tiers)
        for url in (f'/api/jobs/{self.job.id}/messages/', '/api/jobs/999999/messages/'):
            r = self.client.get(url)
            self.assertEqual(r.status_code, 404, url)
            self.assertEqual(r.data, {'detail': 'Mission introuvable.'})
        r = self.client.post(f'/api/jobs/{self.job.id}/messages/', {'content': 'x'}, format='json')
        self.assertEqual(r.status_code, 404)
        r = self.client.get(f'/api/jobs/{self.job.id}/conversation/')
        self.assertEqual(r.data, {'detail': 'Mission introuvable.'})

    def test_un_moderateur_lit_sans_403_ni_marquer_comme_lu(self):
        self.client.force_authenticate(self.client_user)
        self.client.post(f'/api/jobs/{self.job.id}/messages/', {'content': 'Bonjour'}, format='json')
        moderateur = _user('mod@t.tn', 'MODERATOR')
        self.client.force_authenticate(moderateur)
        r = self.client.get(f'/api/jobs/{self.job.id}/messages/')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(len(r.data['messages']), 1)
        self.assertFalse(Message.objects.get().is_read)
        # Il lit, il n'écrit pas.
        r = self.client.post(f'/api/jobs/{self.job.id}/messages/', {'content': 'x'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_avant_la_mise_en_relation_un_transporteur_interesse_n_ecrit_pas(self):
        # Règle inchangée : sur une mission PUBLISHED, une offre en attente ne
        # donne pas accès à la conversation (pas d'échange préalable).
        job = TransportJob.objects.create(
            owner=self.client_user, status='PUBLISHED', job_type='TRANSPORT',
            pickup_address='A', dropoff_address='B',
            scheduled_time=timezone.now() + timedelta(days=2))
        _offer(job, self.t2, status='PENDING')
        self.client.force_authenticate(self.t2)
        r = self.client.post(f'/api/jobs/{job.id}/messages/', {'content': 'Bonjour'}, format='json')
        self.assertEqual(r.status_code, 404)
        self.client.force_authenticate(self.client_user)
        self.assertEqual(self.client.get(f'/api/jobs/{job.id}/messages/').status_code, 200)

    def test_trajet_retour_client_qui_annule_perd_l_acces(self):
        trajet = TransportJob.objects.create(
            owner=self.t1, status='MATCHED', job_type='TRANSPORT', is_return_trip=True,
            pickup_address='Sfax', dropoff_address='Tunis',
            scheduled_time=timezone.now() + timedelta(days=2))
        _offer(trajet, self.t1)
        ReturnTripRequest.objects.create(job=trajet, client=self.client_user, description='x',
                                         proposed_price=Decimal('100'), payment_method='COD',
                                         status='ACCEPTED')
        self.client.force_authenticate(self.client_user)
        self.assertEqual(self.client.get(f'/api/jobs/{trajet.id}/messages/').status_code, 200)
        r = self.client.post(f'/api/jobs/{trajet.id}/client-cancel/', {'reason': 'imprévu'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(self.client.get(f'/api/jobs/{trajet.id}/messages/').status_code, 404)
        conv = Conversation.objects.get(job=trajet)
        self.assertNotIn(self.client_user.id, conv.participants.values_list('id', flat=True))
