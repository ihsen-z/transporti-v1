"""
Canal « classique » fermé (CLASSIC_CHANNEL_ENABLED=False).

Au lancement seul le canal trajet retour est ouvert. Le serveur refuse les
ENTRÉES du canal classique (créer une demande, publier un brouillon, déposer
une offre) avec 403 CLASSIC_CHANNEL_DISABLED ; la liste publique ne montre plus
de demande classique ; tout le reste — trajets retour et missions classiques
déjà engagées — fonctionne comme avant.
"""
from datetime import timedelta
from decimal import Decimal

from django.test import override_settings
from django.utils import timezone

from logistics.classic_channel import (
    CLASSIC_CHANNEL_DISABLED_CODE, CLASSIC_CHANNEL_DISABLED_MESSAGE,
)
from logistics.models import Offer, TransportJob
from logistics.tests.aides_kyc import verify_transporter
from logistics.tests.test_parcours_retour import (
    ReturnTripJourneyBase, User, V1,
)


def _besoin_client(owner, **champs):
    """Une demande classique : le propriétaire est le client."""
    valeurs = dict(
        owner=owner, status='PUBLISHED', job_type='TRANSPORT',
        pickup_address='Sfax', pickup_governorate='Sfax',
        dropoff_address='Tunis', dropoff_governorate='Tunis',
        scheduled_time=timezone.now() + timedelta(days=2),
    )
    valeurs.update(champs)
    return TransportJob.objects.create(**valeurs)


@override_settings(CLASSIC_CHANNEL_ENABLED=False)
class EntreesFermeesTests(ReturnTripJourneyBase):

    def _assert_ferme(self, reponse):
        self.assertEqual(reponse.status_code, 403, reponse.data)
        self.assertEqual(reponse.data['code'], CLASSIC_CHANNEL_DISABLED_CODE)
        self.assertEqual(reponse.data['error'], CLASSIC_CHANNEL_DISABLED_MESSAGE)
        self.assertEqual(reponse.data['detail'], CLASSIC_CHANNEL_DISABLED_MESSAGE)

    def test_le_client_ne_cree_pas_de_demande(self):
        self._auth(self.client_user)
        reponse = self.client.post(f'{V1}/jobs/', {
            'job_type': 'TRANSPORT',
            'pickup_address': 'Sfax', 'pickup_governorate': 'Sfax',
            'dropoff_address': 'Tunis', 'dropoff_governorate': 'Tunis',
            'scheduled_time': (timezone.now() + timedelta(days=2)).isoformat(),
        }, format='json')
        self._assert_ferme(reponse)
        self.assertFalse(
            TransportJob.objects.filter(owner=self.client_user).exists())

    def test_le_transporteur_ne_depose_pas_d_offre(self):
        verify_transporter(self.transporter)
        besoin = _besoin_client(self.client_user)
        self._auth(self.transporter)
        reponse = self.client.post(f'{V1}/offers/', {
            'job': besoin.id, 'price_net': '100.00', 'message': 'Dispo demain',
            'valid_until': (timezone.now() + timedelta(days=2)).isoformat(),
        }, format='json')
        self._assert_ferme(reponse)
        self.assertFalse(Offer.objects.filter(job=besoin).exists())

    def test_un_brouillon_classique_ne_se_publie_pas(self):
        brouillon = _besoin_client(self.client_user, status='DRAFT')
        self._auth(self.client_user)
        reponse = self.client.post(f'{V1}/jobs/{brouillon.id}/publish/')
        self._assert_ferme(reponse)
        brouillon.refresh_from_db()
        self.assertEqual(brouillon.status, 'DRAFT')

    def test_la_liste_publique_ne_montre_aucune_demande_classique(self):
        _besoin_client(self.client_user)
        reponse = self.client.get(f'{V1}/jobs/public/')
        self.assertEqual(reponse.status_code, 200, reponse.data)
        ids = [j['id'] for j in reponse.data['results']]
        # Le trajet retour reste visible, la demande classique a disparu.
        self.assertEqual(ids, [self.trip.id])

    def test_la_liste_publique_d_un_transporteur_est_vide(self):
        _besoin_client(self.client_user)
        self._auth(self.transporter)
        reponse = self.client.get(f'{V1}/jobs/public/')
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertEqual(reponse.data['count'], 0)
        self.assertEqual(reponse.data['results'], [])


@override_settings(CLASSIC_CHANNEL_ENABLED=False)
class TrajetRetourInchangeTests(ReturnTripJourneyBase):
    """Le parcours trajet retour complet passe canal classique fermé."""

    def test_publication_recherche_demande_acceptation(self):
        verify_transporter(self.transporter)
        # 1. Publication par le transporteur
        self._auth(self.transporter)
        publie = self.client.post(f'{V1}/jobs/return-trip/', {
            'job_type': 'TRANSPORT',
            'pickup_address': 'Centre Sfax', 'pickup_governorate': 'Sfax',
            'dropoff_address': 'Centre Tunis', 'dropoff_governorate': 'Tunis',
            'scheduled_time': (timezone.now() + timedelta(days=3)).isoformat(),
            'available_capacity': '1 tonne',
        }, format='json')
        self.assertEqual(publie.status_code, 201, publie.data)

        # 2. Recherche par le client
        self._auth(self.client_user)
        recherche = self.client.get(
            f'{V1}/return-trips/match/?pickup_governorate=Sfax&dropoff_governorate=Tunis')
        self.assertEqual(recherche.status_code, 200, recherche.data)
        self.assertGreaterEqual(recherche.data['count'], 1)

        # 3. Demande puis 4. acceptation (crée l'offre ACCEPTED en interne)
        demande = self._send_request()
        self._accept(demande)
        self.assertEqual(self.trip.status, 'MATCHED')
        self.assertTrue(
            Offer.objects.filter(job=self.trip, status='ACCEPTED').exists())


@override_settings(CLASSIC_CHANNEL_ENABLED=False)
class MissionClassiqueEngageeTests(ReturnTripJourneyBase):
    """Une mission classique déjà MATCHED se consulte et se termine."""

    def setUp(self):
        super().setUp()
        verify_transporter(self.transporter)
        self.mission = _besoin_client(self.client_user, status='MATCHED')
        self.offre = Offer.objects.create(
            job=self.mission, transporter=self.transporter,
            status=Offer.Status.ACCEPTED, price_net=Decimal('100.00'),
            commission_amount=Decimal('10.00'), total_price=Decimal('110.00'),
            valid_until=timezone.now() + timedelta(days=2),
        )

    def test_la_mission_reste_consultable(self):
        for utilisateur in (self.client_user, self.transporter):
            self._auth(utilisateur)
            reponse = self.client.get(f'{V1}/jobs/{self.mission.id}/')
            self.assertEqual(reponse.status_code, 200, reponse.data)

    def test_la_mission_se_termine(self):
        from payments.models import Booking
        Booking.objects.create(
            job=self.mission, accepted_offer=self.offre,
            final_price=Decimal('110.00'), commission_rate=Decimal('0.1000'),
            payment_method='COD', delivery_pin='4821',
        )
        self._auth(self.transporter)
        debut = self.client.post(f'{V1}/jobs/{self.mission.id}/confirm-start/')
        self.assertEqual(debut.status_code, 200, debut.data)
        fin = self.client.post(f'{V1}/jobs/{self.mission.id}/complete/', {
            'pin': '4821'}, format='json')
        self.assertEqual(fin.status_code, 200, fin.data)
        self.mission.refresh_from_db()
        self.assertEqual(self.mission.status, 'COMPLETED')


class ConfigExposeLeCanalTests(ReturnTripJourneyBase):

    def _champ(self):
        reponse = self.client.get(f'{V1}/payments/config/')
        self.assertEqual(reponse.status_code, 200, reponse.data)
        return reponse.data['classic_channel_enabled']

    @override_settings(CLASSIC_CHANNEL_ENABLED=False)
    def test_champ_faux_quand_ferme(self):
        self.assertIs(self._champ(), False)

    @override_settings(CLASSIC_CHANNEL_ENABLED=True)
    def test_champ_vrai_quand_ouvert(self):
        self.assertIs(self._champ(), True)
