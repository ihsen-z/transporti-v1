"""Le jeu de recette doit rester UTILISABLE au fil du temps (lot 5, tache 5.1).

Ce que ces tests verrouillent, et pourquoi ils n'existaient pas avant.

`seed_test_data` etait totalement idempotent : `_creer_job` retrouvait une
ligne existante et la renvoyait sans y toucher. C'est le bon comportement pour
`distance_km` — un rejeu ne doit pas ecraser une distance corrigee depuis. Mais
les scenarios du jeu fixe sont definis RELATIVEMENT a maintenant : « un retour
dans deux jours », « un retour echu depuis deux jours ». Leur date restait donc
celle du premier seed.

Consequence mesuree en recette le 03/09 : les DEUX trajets retour du jeu fixe
etaient expires, la recherche cliente ne renvoyait plus qu'une ligne heritee
sans prix, donc sans economie estimee. L'argument de conversion du produit
etait invisible, et aucun code applicatif n'etait en cause. Un rejeu du seed ne
reparait rien puisqu'il ne touchait pas la date.

Rien ne signalait cette derive : un environnement de recette se degrade
silencieusement, et le seul symptome est « je ne vois plus rien », qu'on
attribue naturellement a l'application.
"""

import io
from datetime import timedelta
from decimal import Decimal

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from logistics.models import TransportJob


class SeedRafraichissementTests(TestCase):
    """Un second seed remet les scenarios datés à l'heure."""

    @staticmethod
    def _seed():
        # La sortie du seed contient des emojis : sur une console Windows en
        # cp1252, `self.stdout.write` leve UnicodeEncodeError. On la capture
        # plutot que de la laisser atteindre l'encodeur du terminal.
        call_command('seed_test_data', stdout=io.StringIO(), stderr=io.StringIO())

    def test_le_trajet_publie_reste_dans_le_futur_apres_un_rejeu(self):
        self._seed()
        trajet = TransportJob.objects.get(id=8)

        # On simule le vieillissement de l'environnement : la date part dans le
        # passé, exactement comme après deux semaines sans rejouer le seed.
        TransportJob.objects.filter(id=8).update(
            scheduled_time=timezone.now() - timedelta(days=10),
        )

        self._seed()
        trajet.refresh_from_db()
        self.assertGreater(
            trajet.scheduled_time,
            timezone.now(),
            "un rejeu du seed doit ramener le trajet publié dans le futur, "
            "sinon la recherche cliente ne renvoie plus rien",
        )
        self.assertEqual(trajet.status, 'PUBLISHED')

    def test_le_trajet_publie_porte_une_economie_calculable(self):
        # C'est l'argument de conversion du pivot : sans fourchette de prix,
        # `estimated_savings` vaut `None` et le bloc ne s'affiche pas du tout.
        self._seed()
        trajet = TransportJob.objects.get(id=8)
        self.assertIsNotNone(trajet.price_tnd_min)
        self.assertIsNotNone(trajet.price_tnd_max)
        self.assertIsNotNone(trajet.distance_km)

        from logistics.serializers import TransportJobListSerializer

        donnees = TransportJobListSerializer(trajet).data
        self.assertIsNotNone(
            donnees['estimated_savings'],
            "le jeu de recette doit permettre de VOIR l'économie estimée",
        )
        self.assertIsNotNone(donnees['savings_basis'])

    def test_un_trajet_porte_la_reservation_immediate(self):
        # Sans lui, ni le badge de la carte de résultat ni le chemin
        # `jobs/<id>/book-return/` ne sont exerçables sur un environnement.
        self._seed()
        publies = TransportJob.objects.filter(
            is_return_trip=True, status='PUBLISHED', instant_booking=True,
        )
        self.assertTrue(
            publies.exists(),
            "aucun trajet retour en réservation immédiate : le badge reste "
            "intestable",
        )

    def test_un_rejeu_n_ecrase_pas_une_distance_corrigee(self):
        # Le pendant du test précédent : le rafraîchissement est opt-in champ
        # par champ, et `distance_km` n'en fait PAS partie. Une distance
        # corrigée par `backfill_routes` doit survivre à un rejeu.
        self._seed()
        TransportJob.objects.filter(id=8).update(distance_km=Decimal('999.9'))

        self._seed()
        self.assertEqual(
            TransportJob.objects.get(id=8).distance_km,
            Decimal('999.9'),
            "un rejeu ne doit pas écraser une distance corrigée depuis",
        )

    def test_le_scenario_d_expiration_reste_echu(self):
        self._seed()
        trajet = TransportJob.objects.get(id=9)
        self.assertLess(
            trajet.scheduled_time,
            timezone.now(),
            "le trajet du scénario d'expiration doit rester échu",
        )
