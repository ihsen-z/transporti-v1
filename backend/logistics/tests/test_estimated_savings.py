"""
C1.2 (lot 3) — l'economie estimee affichee au client.

C'est l'argument de conversion du pivot : « vous payez moins parce que le
camion roulait deja ». Ces tests verrouillent trois choses qui, si elles
lachaient, feraient mentir ce chiffre.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from logistics.models import TransportJob
from logistics.serializers import TransportJobListSerializer

User = get_user_model()


class EstimatedSavingsTests(TestCase):
    def setUp(self):
        self.transporteur = User.objects.create_user(
            username='eco_transporteur', email='eco_t@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
            # `get_owner_name` lit `last_name[0]` : un nom vide le ferait
            # echouer avant meme d'atteindre l'economie.
            first_name='Eco', last_name='Nomie',
        )

    def _retour(self, prix, **extra):
        """Un trajet retour SANS coordonnees : c'est le cas reel."""
        defauts = dict(
            owner=self.transporteur,
            job_type='TRANSPORT',
            status=TransportJob.Status.PUBLISHED,
            is_return_trip=True,
            pickup_address='Centre Sousse', pickup_governorate='Sousse',
            dropoff_address='Centre Tunis', dropoff_governorate='Tunis',
            scheduled_time=timezone.now() + timedelta(days=2),
            price_tnd_min=Decimal(prix) if prix is not None else None,
        )
        defauts.update(extra)
        return TransportJob.objects.create(**defauts)

    def _serialise(self, job):
        return TransportJobListSerializer(job).data

    def test_calcule_sans_coordonnees_via_les_centroides(self):
        """
        Le test qui compte le plus. Les trajets retour sont saisis PAR CORRIDOR
        et n'ont pas de coordonnees : sans repli sur les centroides de
        gouvernorats, l'economie serait absente sur exactement les trajets
        qu'elle doit valoriser.
        """
        job = self._retour('35.00')
        self.assertIsNone(job.pickup_lat)

        data = self._serialise(job)

        self.assertIsNotNone(
            data['estimated_savings'],
            "l'economie doit se calculer a partir des seuls gouvernorats",
        )
        self.assertGreater(data['estimated_savings'], 0)

    def test_la_base_de_comparaison_accompagne_toujours_le_montant(self):
        """
        Decision du 26/08 : jamais un montant nu. Une economie sans reference
        n'est pas verifiable par le client, donc pas credible.
        """
        data = self._serialise(self._retour('35.00'))

        self.assertIsNotNone(data['savings_basis'])
        # La base est bien le prix du dedie : economie = base - prix du retour.
        self.assertAlmostEqual(
            data['savings_basis'] - 35.00, data['estimated_savings'], places=2,
        )

    def test_une_economie_negative_n_est_pas_affichee(self):
        """
        Si le retour coute plus cher qu'un dedie, il n'y a rien a vanter.
        Afficher une economie negative retournerait l'argument contre le
        produit.
        """
        data = self._serialise(self._retour('500.00'))

        self.assertIsNone(data['estimated_savings'])
        self.assertIsNone(data['savings_basis'])

    def test_absente_et_non_nulle_quand_le_calcul_est_impossible(self):
        """
        `None` et non zero : un zero se lirait « aucune economie », ce qui est
        un message DIFFERENT de « economie inconnue ».
        """
        sans_prix = self._retour(None)
        self.assertIsNone(self._serialise(sans_prix)['estimated_savings'])

        gouvernorat_inconnu = self._retour(
            '35.00', pickup_governorate='Atlantide', dropoff_governorate='Utopie',
        )
        self.assertIsNone(
            self._serialise(gouvernorat_inconnu)['estimated_savings'],
        )

    def test_absente_sur_une_demande_classique(self):
        """L'economie n'a de sens que sur un trajet retour."""
        classique = self._retour('35.00', is_return_trip=False)
        self.assertIsNone(self._serialise(classique)['estimated_savings'])
