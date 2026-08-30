"""
T5.5 (B-4) — les clients fidèles d'un transporteur.

Pendant de C5.3 : le client met en favori, le transporteur veut savoir qui.
Ces tests fixent surtout ce que le calcul REFUSE de faire — fusionner deux
signaux de nature différente, et compter comme fidèle un client venu une fois.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from logistics.models import TransportJob, Offer, FavoriteTransporter
from logistics.stats_clients import loyal_clients, loyalty_summary

User = get_user_model()


@override_settings(
    REST_FRAMEWORK={'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}},
)
class LoyalClientsTests(APITestCase):
    def setUp(self):
        self.transporteur = User.objects.create_user(
            username='lc_transporteur', email='lct@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
            first_name='Trans', last_name='Porter',
        )
        self.client_a = User.objects.create_user(
            username='lc_client_a', email='lca@test.tn',
            password='SecurePass123!', role='CLIENT',
            first_name='Ali', last_name='Ben Salah',
        )
        self.client_b = User.objects.create_user(
            username='lc_client_b', email='lcb@test.tn',
            password='SecurePass123!', role='CLIENT',
            first_name='Bochra', last_name='Trabelsi',
        )

    def _mission_terminee(self, client):
        job = TransportJob.objects.create(
            owner=client, status=TransportJob.Status.COMPLETED,
            job_type='TRANSPORT',
            pickup_address='Tunis', pickup_governorate='Tunis',
            dropoff_address='Sfax', dropoff_governorate='Sfax',
            scheduled_time=timezone.now() + timedelta(days=1),
        )
        Offer.objects.create(
            job=job, transporter=self.transporteur, status='ACCEPTED',
            price_net=Decimal('80.00'), commission_amount=Decimal('20.00'),
            total_price=Decimal('100.00'),
            valid_until=timezone.now() + timedelta(days=3),
        )
        return job

    def test_compte_les_missions_terminees(self):
        self._mission_terminee(self.client_a)
        self._mission_terminee(self.client_a)
        self._mission_terminee(self.client_b)

        lignes = {l['client_id']: l for l in loyal_clients(self.transporteur)}
        self.assertEqual(lignes[self.client_a.id]['missions'], 2)
        self.assertEqual(lignes[self.client_b.id]['missions'], 1)

    def test_une_mission_en_cours_ne_compte_pas(self):
        """La fidélité se constate après coup, pas pendant."""
        job = self._mission_terminee(self.client_a)
        job.status = TransportJob.Status.IN_PROGRESS
        job.save(update_fields=['status'])

        self.assertEqual(loyal_clients(self.transporteur), [])

    def test_un_favori_sans_mission_apparait_quand_meme(self):
        """
        C'est une intention déclarée : la masquer priverait le transporteur du
        seul signal qu'il a sur un client intéressé mais jamais converti.
        """
        FavoriteTransporter.objects.create(
            client=self.client_b, transporter=self.transporteur
        )
        lignes = loyal_clients(self.transporteur)
        self.assertEqual(len(lignes), 1)
        self.assertEqual(lignes[0]['client_id'], self.client_b.id)
        self.assertEqual(lignes[0]['missions'], 0)
        self.assertTrue(lignes[0]['is_favorite'])
        # `None` distingue « jamais converti » de « perdu de vue ».
        self.assertIsNone(lignes[0]['last_mission_at'])

    def test_ne_fusionne_pas_les_deux_signaux(self):
        """
        Un client à six missions sans favori est plus fidèle qu'un favori qui
        n'a jamais réservé. Les deux champs restent distincts, et aucun score
        combiné n'est renvoyé.
        """
        for _ in range(3):
            self._mission_terminee(self.client_a)
        FavoriteTransporter.objects.create(
            client=self.client_b, transporter=self.transporteur
        )

        lignes = loyal_clients(self.transporteur)
        self.assertEqual(lignes[0]['client_id'], self.client_a.id)
        for ligne in lignes:
            self.assertNotIn('score', ligne)
            self.assertNotIn('loyalty', ligne)

    def test_repeat_clients_exige_au_moins_deux_missions(self):
        """
        Un client venu une seule fois n'est pas fidèle. L'annoncer comme tel
        donnerait au transporteur une image flatteuse et fausse.
        """
        self._mission_terminee(self.client_a)
        resume = loyalty_summary(self.transporteur)
        self.assertEqual(resume['repeat_clients'], 0)

        self._mission_terminee(self.client_a)
        self.assertEqual(loyalty_summary(self.transporteur)['repeat_clients'], 1)

    def test_ignore_les_clients_d_un_autre_transporteur(self):
        autre = User.objects.create_user(
            username='lc_autre', email='lcautre@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
        )
        self._mission_terminee(self.client_a)
        self.assertEqual(loyal_clients(autre), [])

    def test_endpoint_reserve_au_transporteur(self):
        self.client.force_authenticate(user=self.client_a)
        self.assertEqual(
            self.client.get('/api/transporter/loyal-clients/').status_code, 403
        )

    def test_endpoint_repond_au_transporteur(self):
        self._mission_terminee(self.client_a)
        self.client.force_authenticate(user=self.transporteur)
        reponse = self.client.get('/api/transporter/loyal-clients/')
        self.assertEqual(reponse.status_code, 200, reponse.data)
        for cle in ('favorited_by', 'repeat_clients', 'clients'):
            self.assertIn(cle, reponse.data)

    def test_expose_aussi_sur_la_surface_v1(self):
        """Double surface API : sous peine de désynchroniser le mobile."""
        self.client.force_authenticate(user=self.transporteur)
        self.assertEqual(
            self.client.get('/api/v1/transporter/loyal-clients/').status_code,
            200,
        )
