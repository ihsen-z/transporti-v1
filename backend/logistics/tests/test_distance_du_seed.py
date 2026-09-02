"""
Distance des jobs du jeu de donnees fixe, et fiabilite du rattrapage.

CE QUE CES TESTS PROTEGENT, et qui ne se voit sur aucun ecran : un job sans
`distance_km` est compte pour ZERO kilometre par la NSM (km a vide
transformes). Zero est une valeur d'apparence normale -- rien ne distingue
« ce trajet n'a rien transforme » de « on ne sait pas quelle distance il
faisait ». Neuf jobs du seed etaient dans ce cas.

Le seed ecrit ses jobs directement en base, donc contourne l'annotation que
les serializers appliquent a toute publication reelle. C'est le seul chemin de
creation qui pouvait deriver du chemin reel sans qu'un test s'en apercoive.
"""
from decimal import Decimal
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from logistics.models import TransportJob
from logistics.routing import RouteResult
from users.management.commands.seed_test_data import Command as CommandeDeSeed
from users.models import User


def un_proprietaire():
    return User.objects.create_user(
        username='proprio@test.tn', email='proprio@test.tn', password='x',
        role=User.Role.CLIENT,
    )


class DistanceDesJobsDuSeed(TestCase):
    """`_creer_job` reutilise l'annotation du chemin reel."""

    def setUp(self):
        self.seed = CommandeDeSeed()
        self.owner = un_proprietaire()

    def _defauts(self, **extra):
        base = {
            'owner': self.owner,
            'job_type': 'TRANSPORT',
            'status': 'PUBLISHED',
            'pickup_address': 'Depart',
            'dropoff_address': 'Arrivee',
            'scheduled_time': '2026-12-01T10:00:00Z',
        }
        base.update(extra)
        return base

    def test_annote_la_distance_depuis_les_gouvernorats(self):
        # Le cas des trajets retour 8 et 9 : connus par leur gouvernorat seul.
        job = self.seed._creer_job(101, self._defauts(
            pickup_governorate='Sousse', dropoff_governorate='Tunis',
        ))

        self.assertIsNotNone(
            job.distance_km,
            "Sans distance, ce trajet retour compte pour 0 km dans la NSM.",
        )
        self.assertGreater(job.distance_km, 0)

    def test_annote_la_distance_depuis_les_coordonnees(self):
        # Le cas des jobs 2, 3 et 4 : coordonnees precises, gouvernorat vide.
        job = self.seed._creer_job(102, self._defauts(
            pickup_lat=Decimal('36.8008'), pickup_lng=Decimal('10.1860'),
            dropoff_lat=Decimal('35.8256'), dropoff_lng=Decimal('10.6084'),
        ))

        self.assertIsNotNone(job.distance_km)
        self.assertGreater(job.distance_km, 0)

    def test_n_ecrase_pas_une_distance_deja_corrigee(self):
        # `backfill_routes` peut avoir corrige la ligne apres coup. Un seed
        # rejoue ne doit pas la ramener a l'estimation.
        self.seed._creer_job(103, self._defauts(
            pickup_governorate='Sousse', dropoff_governorate='Tunis',
        ))
        TransportJob.objects.filter(id=103).update(distance_km=Decimal('999.9'))

        rendu = self.seed._creer_job(103, self._defauts(
            pickup_governorate='Sousse', dropoff_governorate='Tunis',
        ))

        self.assertEqual(rendu.distance_km, Decimal('999.9'))
        self.assertEqual(TransportJob.objects.filter(id=103).count(), 1)

    def test_le_seed_complet_ne_laisse_aucun_job_sans_distance(self):
        # Le test de bout en bout : c'est l'etat final de la base qui compte,
        # pas le comportement du helper pris isolement.
        call_command('seed_test_data', stdout=StringIO(), verbosity=0)

        sans_distance = TransportJob.objects.filter(distance_km__isnull=True)
        self.assertEqual(
            list(sans_distance.values_list('id', flat=True)), [],
            "Des jobs du seed n'ont pas de distance : la NSM les sous-compte.",
        )


class CacheDuRattrapage(TestCase):
    """
    `backfill_routes` mutualisait ses appels par couple de gouvernorats.

    C'est faux des qu'un job porte des coordonnees precises, car le routeur
    part d'elles et non des centroides. Les jobs 2, 3 et 4 du seed ont un
    gouvernorat VIDE : ils tombaient tous les trois dans la meme entree de
    cache et heritaient du trace du premier -- trois trajets differents, un
    seul kilometrage, aucun signal.
    """

    def setUp(self):
        self.owner = un_proprietaire()

    def _job(self, pickup, dropoff):
        return TransportJob.objects.create(
            owner=self.owner, job_type='TRANSPORT', status='PUBLISHED',
            pickup_address='a', dropoff_address='b',
            scheduled_time='2026-12-01T10:00:00Z',
            pickup_lat=pickup[0], pickup_lng=pickup[1],
            dropoff_lat=dropoff[0], dropoff_lng=dropoff[1],
            route_polyline='',
        )

    def test_deux_jobs_sans_gouvernorat_gardent_chacun_leur_trace(self):
        court = self._job(
            (Decimal('36.8625'), Decimal('10.1956')),
            (Decimal('36.8780'), Decimal('10.3244')),
        )
        long_trajet = self._job(
            (Decimal('36.8008'), Decimal('10.1860')),
            (Decimal('35.8256'), Decimal('10.6084')),
        )

        # Un routeur qui repond selon les coordonnees recues, comme le vrai.
        def router(p_lat, p_lng, d_lat, d_lng, *a, **kw):
            distance = 12.0 if str(d_lng).startswith('10.32') else 143.0
            return RouteResult(polyline='trace-%s' % distance, distance_km=distance)

        cible = 'logistics.management.commands.backfill_routes.resolve_route_for_job'
        with patch(cible, side_effect=router) as appel:
            call_command('backfill_routes', '--sleep', '0', stdout=StringIO(), verbosity=0)

        court.refresh_from_db()
        long_trajet.refresh_from_db()

        self.assertEqual(court.distance_km, Decimal('12.0'))
        self.assertEqual(long_trajet.distance_km, Decimal('143.0'))
        self.assertNotEqual(
            court.route_polyline, long_trajet.route_polyline,
            "Deux trajets distincts ont herite du meme trace.",
        )
        # Un appel PAR job : rien n'est mutualisable quand les coordonnees
        # commandent le resultat.
        self.assertEqual(appel.call_count, 2)

    def test_mutualise_encore_les_jobs_connus_par_leur_seul_corridor(self):
        # La correction ne doit pas supprimer le cache la ou il est valide :
        # sans coordonnees, deux jobs du meme corridor ont bien le meme trace.
        for _ in range(3):
            TransportJob.objects.create(
                owner=self.owner, job_type='TRANSPORT', status='PUBLISHED',
                pickup_address='a', dropoff_address='b',
                scheduled_time='2026-12-01T10:00:00Z',
                pickup_governorate='Sfax', dropoff_governorate='Gabes',
                route_polyline='',
            )

        cible = 'logistics.management.commands.backfill_routes.resolve_route_for_job'
        with patch(
            cible, return_value=RouteResult(polyline='trace', distance_km=137.0),
        ) as appel:
            call_command('backfill_routes', '--sleep', '0', stdout=StringIO(), verbosity=0)

        self.assertEqual(appel.call_count, 1)
