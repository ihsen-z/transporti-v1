"""
Catalogue de demonstration du corridor pilote (users/seed_corridor.py).

CE QUE CES TESTS PROTEGENT. L'audit de lancement du 06/09 (m-06) a releve que
le jeu de donnees ne contenait qu'un trajet retour reservable : une seule
reservation d'essai vidait la recherche. Ces tests verifient le catalogue
depuis l'API que la cliente appelle reellement (`return-trips/match/`), et
pas seulement en base : un trajet present mais invisible a la recherche ne
servirait a aucune demonstration.
"""
import io

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from logistics.models import TransportJob
from trust.models import VerificationStatus
from users.models import User
from users.seed_corridor import TRAJETS

TRONCONS = (('Tunis', 'Sousse'), ('Sousse', 'Sfax'), ('Tunis', 'Sfax'))


class SeedCorridorTests(TestCase):

    @staticmethod
    def _seed():
        # Sortie capturee : elle contient des emojis, que la console Windows en
        # cp1252 refuse (meme precaution que test_seed_rafraichissement).
        call_command('seed_test_data', stdout=io.StringIO(), stderr=io.StringIO())

    def _recherche(self, depart, arrivee):
        client = APIClient()
        client.force_authenticate(User.objects.get(email='leila.benamor@test.transporti.tn'))
        reponse = client.get('/api/v1/return-trips/match/', {
            'pickup_governorate': depart,
            'dropoff_governorate': arrivee,
        })
        self.assertEqual(reponse.status_code, 200, reponse.content)
        return reponse.json()

    def test_chaque_sens_de_chaque_troncon_a_des_trajets_visibles(self):
        self._seed()
        for a, b in TRONCONS:
            for depart, arrivee in ((a, b), (b, a)):
                with self.subTest(depart=depart, arrivee=arrivee):
                    self.assertGreaterEqual(self._recherche(depart, arrivee)['count'], 1)

    def test_les_trajets_sont_futurs_et_portent_par_des_transporteurs_verifies(self):
        self._seed()
        ids = [t.job_id for t in TRAJETS]
        trajets = TransportJob.objects.filter(id__in=ids).select_related('owner__trust_profile')
        self.assertEqual(trajets.count(), len(TRAJETS))
        for job in trajets:
            with self.subTest(job=job.id):
                self.assertTrue(job.is_return_trip)
                self.assertEqual(job.status, TransportJob.Status.PUBLISHED)
                self.assertGreater(job.scheduled_time, timezone.now())
                self.assertEqual(
                    job.owner.trust_profile.verification_status, VerificationStatus.VERIFIED,
                )
                # La fourchette doit exister : sans elle, pas d'economie
                # estimee sur la carte de resultat.
                self.assertIsNotNone(job.price_tnd_min)
                self.assertLessEqual(job.price_tnd_min, job.price_tnd_max)

    def test_un_rejeu_ne_duplique_rien_et_republie_un_trajet_consomme(self):
        self._seed()
        # Une reservation d'essai a consomme un trajet, et le temps a passe.
        TransportJob.objects.filter(id=201).update(
            status=TransportJob.Status.MATCHED,
            scheduled_time=timezone.now() - timezone.timedelta(days=3),
        )
        avant = TransportJob.objects.filter(is_return_trip=True).count()

        self._seed()

        self.assertEqual(TransportJob.objects.filter(is_return_trip=True).count(), avant)
        job = TransportJob.objects.get(id=201)
        self.assertEqual(job.status, TransportJob.Status.PUBLISHED)
        self.assertGreater(job.scheduled_time, timezone.now())
