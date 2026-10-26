"""Cloture de compte a la demande de l'utilisateur (lot 2, tache 2.1).

Exigence de recevabilite des stores. Ces tests verrouillent trois choses qui,
si elles lachaient, feraient soit refuser l'application, soit perdre des faits
comptables :

  1. le compte devient inaccessible et cesse d'etre identifiable ;
  2. les missions et les offres SURVIVENT a la cloture ;
  3. une cloture est refusee tant que de l'argent ou une marchandise est
     engage, avec un motif que l'utilisateur peut lever.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from logistics.models import Offer, TransportJob
from users.services_account_closure import (
    ClotureImpossible,
    cloturer_compte,
    verifier_cloture_possible,
)

User = get_user_model()

MDP = 'SecurePass123!'


def _job(owner, statut, **extra):
    return TransportJob.objects.create(
        owner=owner,
        job_type='TRANSPORT',
        status=statut,
        pickup_address='Centre Sfax',
        dropoff_address='Centre Tunis',
        pickup_governorate='Sfax',
        dropoff_governorate='Tunis',
        scheduled_time=timezone.now() + timedelta(days=2),
        description='Deux palettes',
        **extra,
    )


class ClotureCompteServiceTests(TestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(
            username='ferme_client', email='ferme_client@test.tn',
            password=MDP, role='CLIENT', phone='+21650990001',
            first_name='Leila', last_name='Ben Amor',
        )

    def test_anonymise_l_identite_et_coupe_l_acces(self):
        ancien_id = self.client_user.id
        cloturer_compte(self.client_user)

        self.client_user.refresh_from_db()
        self.assertFalse(self.client_user.is_active)
        self.assertFalse(self.client_user.has_usable_password())
        # Plus rien ne doit permettre de remonter a la personne.
        self.assertNotIn('ferme_client@test.tn', self.client_user.email)
        self.assertTrue(self.client_user.email.endswith('@transporti.invalid'))
        self.assertIsNone(self.client_user.phone)
        self.assertEqual(self.client_user.last_name, 'supprimé')
        # La ligne existe toujours : c'est ce qui protege les faits comptables.
        self.assertTrue(User.objects.filter(id=ancien_id).exists())

    def test_date_la_fermeture(self):
        # Point de depart de la conservation des pieces sans date (CIN,
        # selfie) : 5 ans apres cette date, trust/retention.py les supprime.
        self.assertIsNone(self.client_user.closed_at)
        cloturer_compte(self.client_user)

        self.client_user.refresh_from_db()
        self.assertIsNotNone(self.client_user.closed_at)

    def test_libere_le_numero_de_telephone(self):
        # `phone` est `unique=True` : sans mise a NULL, personne ne pourrait
        # se reinscrire avec ce numero.
        cloturer_compte(self.client_user)
        autre = User.objects.create_user(
            username='repreneur', email='repreneur@test.tn', password=MDP,
            role='CLIENT', phone='+21650990001',
        )
        self.assertEqual(autre.phone, '+21650990001')

    def test_les_missions_terminees_survivent(self):
        job = _job(self.client_user, 'COMPLETED')
        cloturer_compte(self.client_user)
        job.refresh_from_db()
        self.assertEqual(job.status, 'COMPLETED')
        self.assertEqual(job.owner_id, self.client_user.id)

    def test_refuse_tant_qu_une_mission_est_engagee(self):
        for statut in ('MATCHED', 'IN_PROGRESS', 'DISPUTED'):
            with self.subTest(statut=statut):
                job = _job(self.client_user, statut)
                with self.assertRaises(ClotureImpossible) as ctx:
                    verifier_cloture_possible(self.client_user)
                # Le motif doit dire quoi faire, pas seulement que c'est refuse.
                self.assertIn('mission', ctx.exception.message.lower())
                job.delete()

    def test_refuse_le_transporteur_qui_a_une_mission_acceptee(self):
        # Cote transporteur, l'engagement ne passe pas par `owner` mais par
        # une offre ACCEPTED : c'est le cas que la premiere version du
        # garde-fou aurait laisse passer.
        client = self.client_user
        transporteur = User.objects.create_user(
            username='ferme_transporteur', email='ferme_t@test.tn',
            password=MDP, role='TRANSPORTER', phone='+21650990002',
            first_name='Mehdi', last_name='Khelifi',
        )
        job = _job(client, 'IN_PROGRESS')
        Offer.objects.create(
            job=job, transporter=transporteur, status='ACCEPTED',
            price_net=Decimal('110.00'),
            commission_amount=Decimal('10.00'),
            total_price=Decimal('120.00'),
            valid_until=timezone.now() + timedelta(days=1),
        )
        with self.assertRaises(ClotureImpossible):
            verifier_cloture_possible(transporteur)

    def test_autorise_quand_rien_n_est_engage(self):
        _job(self.client_user, 'COMPLETED')
        _job(self.client_user, 'CANCELLED')
        # Ne doit rien lever.
        verifier_cloture_possible(self.client_user)


class ClotureCompteEndpointTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.user = User.objects.create_user(
            username='endpoint_client', email='endpoint@test.tn',
            password=MDP, role='CLIENT', phone='+21650990003',
            first_name='Ahmed', last_name='Trabelsi',
        )
        self.api.force_authenticate(user=self.user)
        self.url = reverse('auth_delete_account')

    def test_exige_le_mot_de_passe(self):
        reponse = self.api.delete(self.url, {}, format='json')
        self.assertEqual(reponse.status_code, 400)
        self.assertIn('password', reponse.data)

    def test_refuse_un_mot_de_passe_faux(self):
        reponse = self.api.delete(self.url, {'password': 'MauvaisMdp1!'}, format='json')
        self.assertEqual(reponse.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_cloture_avec_le_bon_mot_de_passe(self):
        reponse = self.api.delete(self.url, {'password': MDP}, format='json')
        self.assertEqual(reponse.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_renvoie_le_motif_quand_une_mission_est_en_cours(self):
        _job(self.user, 'MATCHED')
        reponse = self.api.delete(self.url, {'password': MDP}, format='json')
        self.assertEqual(reponse.status_code, 400)
        # Forme `{'error': ...}` : celle que le mobile affiche telle quelle
        # depuis le lot 1.
        self.assertIn('error', reponse.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_exige_une_authentification(self):
        anonyme = APIClient()
        reponse = anonyme.delete(self.url, {'password': MDP}, format='json')
        self.assertIn(reponse.status_code, (401, 403))
