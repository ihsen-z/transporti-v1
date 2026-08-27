"""
Lot 1 — B-1, B-2 et B-3b : capacite structuree et ventilation par corridor.

Trois choses sont verrouillees ici, chacune pour une raison precise :

1. **La migration de capacite ne casse rien.** `available_capacity` reste du
   texte libre et les trajets crees avant la migration continuent de vivre avec
   leur seule description. Les champs structures sont facultatifs.

2. **Le volume n'est jamais deduit du poids.** La densite d'un chargement n'est
   pas connue de la plateforme. Un ecran qui afficherait des m3 calcules depuis
   des kg mentirait a l'utilisateur.

3. **La ventilation par corridor se reconcilie avec K4.** La somme des revenus
   par corridor doit egaler le `released_net` du portefeuille au dinar pres.
   Deux chiffres divergents pour la meme realite sont un anti-pattern
   explicitement interdit par docs/DICTIONNAIRE_KPI.md.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.test import TestCase

from logistics.models import TransportJob, Offer
from logistics.stats import get_transporter_stats
from logistics.stats_corridors import revenue_by_corridor, underserved_corridors
from payments.models import EscrowTransaction
from payments.services import get_wallet_summary
from trust.models import TrustProfile, VerificationStatus

User = get_user_model()


class CapaciteStructureeTest(TestCase):
    """B-1 et B-2 — la capacite peut etre structuree sans casser l'existant."""

    def setUp(self):
        self.transporteur = User.objects.create_user(
            username='cap_transporteur', email='cap_t@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
        )

    def _retour(self, **extra):
        return TransportJob.objects.create(
            owner=self.transporteur,
            job_type='TRANSPORT',
            status=TransportJob.Status.PUBLISHED,
            is_return_trip=True,
            pickup_address='Sfax', pickup_governorate='Sfax',
            dropoff_address='Tunis', dropoff_governorate='Tunis',
            scheduled_time=timezone.now() + timedelta(days=2),
            price_tnd_min=Decimal('80'), price_tnd_max=Decimal('120'),
            **extra,
        )

    def test_un_trajet_sans_capacite_structuree_reste_valide(self):
        """Le cas des trajets anterieurs a la migration : texte libre seul."""
        trajet = self._retour(available_capacity='2 tonnes, camion bâché')

        self.assertEqual(trajet.available_capacity, '2 tonnes, camion bâché')
        self.assertIsNone(trajet.available_capacity_kg)
        self.assertIsNone(trajet.available_capacity_m3)

    def test_le_poids_et_le_volume_coexistent(self):
        trajet = self._retour(
            available_capacity='1,4 m³ libres',
            available_capacity_kg=Decimal('800.0'),
            available_capacity_m3=Decimal('1.40'),
        )
        trajet.refresh_from_db()

        self.assertEqual(trajet.available_capacity_kg, Decimal('800.0'))
        self.assertEqual(trajet.available_capacity_m3, Decimal('1.40'))

    def test_le_volume_seul_est_permis(self):
        """Decision du 26/08 : le volume est optionnel, pas conditionne au poids."""
        trajet = self._retour(available_capacity_m3=Decimal('3.00'))
        trajet.refresh_from_db()

        self.assertIsNone(trajet.available_capacity_kg)
        self.assertEqual(trajet.available_capacity_m3, Decimal('3.00'))

    def test_le_volume_du_vehicule_est_optionnel_et_independant(self):
        """B-1 — un profil peut porter un poids sans volume, et l'inverse."""
        profil = TrustProfile.objects.create(
            user=self.transporteur,
            verification_status=VerificationStatus.VERIFIED,
            vehicle_type='Camionnette',
            vehicle_capacity_kg=Decimal('2000.0'),
        )

        # Le volume n'est pas deduit du poids : il reste vide tant que le
        # transporteur ne l'a pas renseigne.
        self.assertIsNone(profil.vehicle_capacity_m3)

        profil.vehicle_capacity_m3 = Decimal('8.00')
        profil.save()
        profil.refresh_from_db()
        self.assertEqual(profil.vehicle_capacity_m3, Decimal('8.00'))


class RevenuParCorridorTest(TestCase):
    """B-3b — la ventilation par corridor et sa reconciliation avec K4."""

    def setUp(self):
        self.transporteur = User.objects.create_user(
            username='cor_transporteur', email='cor_t@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
        )
        self.client_user = User.objects.create_user(
            username='cor_client', email='cor_c@test.tn',
            password='SecurePass123!', role='CLIENT',
        )

    def _mission_payee(self, depart, arrivee, net, km, is_return=False):
        """Une mission livree, escrow libere : la base de calcul de K4."""
        job = TransportJob.objects.create(
            owner=self.client_user if not is_return else self.transporteur,
            job_type='TRANSPORT',
            status=TransportJob.Status.COMPLETED,
            is_return_trip=is_return,
            pickup_address=depart, pickup_governorate=depart,
            dropoff_address=arrivee, dropoff_governorate=arrivee,
            scheduled_time=timezone.now() - timedelta(days=1),
            price_tnd_min=Decimal('50'), price_tnd_max=Decimal('500'),
            distance_km=Decimal(str(km)),
        )
        Offer.objects.create(
            job=job, transporter=self.transporteur, status='ACCEPTED',
            price_net=Decimal(str(net)),
            commission_amount=Decimal('0'),
            total_price=Decimal(str(net)),
            valid_until=timezone.now() + timedelta(days=1),
        )
        EscrowTransaction.objects.create(
            booking_reference=job,
            status=EscrowTransaction.Status.RELEASED,
            amount=Decimal(str(net)),
        )
        return job

    def test_le_revenu_est_groupe_par_paire_orientee(self):
        self._mission_payee('Sfax', 'Tunis', 100, 270, is_return=True)
        self._mission_payee('Sfax', 'Tunis', 80, 270, is_return=True)
        self._mission_payee('Tunis', 'Sousse', 60, 140)

        lignes = revenue_by_corridor(self.transporteur)

        self.assertEqual(len(lignes), 2)
        # Tri par revenu decroissant.
        self.assertEqual(lignes[0]['pickup_governorate'], 'Sfax')
        self.assertEqual(lignes[0]['dropoff_governorate'], 'Tunis')
        self.assertEqual(lignes[0]['revenue_net'], 180.0)
        self.assertEqual(lignes[0]['missions'], 2)
        self.assertEqual(lignes[0]['return_trip_missions'], 2)
        self.assertEqual(lignes[0]['km'], 540.0)

        self.assertEqual(lignes[1]['revenue_net'], 60.0)
        self.assertEqual(lignes[1]['return_trip_missions'], 0)

    def test_un_corridor_est_oriente(self):
        """Sfax vers Tunis et Tunis vers Sfax ne se confondent pas : un retour
        a vide a un sens, et les agreger effacerait l'information utile."""
        self._mission_payee('Sfax', 'Tunis', 100, 270, is_return=True)
        self._mission_payee('Tunis', 'Sfax', 90, 270, is_return=True)

        lignes = revenue_by_corridor(self.transporteur)
        self.assertEqual(len(lignes), 2)

    def test_la_somme_des_corridors_egale_K4(self):
        """Le test qui compte : la reconciliation avec le portefeuille."""
        self._mission_payee('Sfax', 'Tunis', 100, 270, is_return=True)
        self._mission_payee('Tunis', 'Sousse', 60, 140)
        self._mission_payee('Gabes', 'Sfax', 45, 130, is_return=True)

        total_corridors = sum(
            ligne['revenue_net'] for ligne in revenue_by_corridor(self.transporteur)
        )
        released_net = float(get_wallet_summary(self.transporteur)['released_net'])

        self.assertEqual(
            total_corridors, released_net,
            "la ventilation par corridor doit se reconcilier avec K4 au dinar pres",
        )

    def test_les_missions_sans_gouvernorat_sont_ecartees(self):
        """Une paire vide produirait une ligne « → » incomprehensible."""
        job = self._mission_payee('Sfax', 'Tunis', 100, 270, is_return=True)
        TransportJob.objects.filter(id=job.id).update(
            pickup_governorate='', dropoff_governorate='',
        )

        self.assertEqual(revenue_by_corridor(self.transporteur), [])

    def test_une_mission_non_payee_n_apparait_pas(self):
        """Sans escrow libere, l'argent n'est pas acquis : meme regle que K4."""
        job = self._mission_payee('Sfax', 'Tunis', 100, 270, is_return=True)
        EscrowTransaction.objects.filter(booking_reference=job).update(
            status=EscrowTransaction.Status.HELD,
        )

        self.assertEqual(revenue_by_corridor(self.transporteur), [])

    def test_la_ventilation_est_exposee_par_get_transporter_stats(self):
        """Le contrat de stats.py : une seule porte d'entree."""
        self._mission_payee('Sfax', 'Tunis', 100, 270, is_return=True)

        stats = get_transporter_stats(self.transporteur)

        self.assertIn('revenue_by_corridor', stats)
        self.assertIn('underserved_corridors', stats)
        self.assertEqual(stats['revenue_by_corridor'][0]['revenue_net'], 100.0)


class CorridorsSousServisTest(TestCase):
    """B-3b, partie prospective — ou publier ensuite."""

    def setUp(self):
        self.transporteur = User.objects.create_user(
            username='sous_transporteur', email='sous_t@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
        )
        self.client_user = User.objects.create_user(
            username='sous_client', email='sous_c@test.tn',
            password='SecurePass123!', role='CLIENT',
        )

    def _demande_publiee(self, depart, arrivee):
        return TransportJob.objects.create(
            owner=self.client_user,
            job_type='TRANSPORT',
            status=TransportJob.Status.PUBLISHED,
            is_return_trip=False,
            pickup_address=depart, pickup_governorate=depart,
            dropoff_address=arrivee, dropoff_governorate=arrivee,
            scheduled_time=timezone.now() + timedelta(days=3),
            price_tnd_min=Decimal('50'), price_tnd_max=Decimal('200'),
        )

    def test_sans_zone_declaree_aucune_recommandation(self):
        """Mieux vaut ne rien proposer qu'une recommandation hors de portee."""
        self._demande_publiee('Tunis', 'Sousse')
        self.assertEqual(underserved_corridors(self.transporteur), [])

    def test_les_recommandations_sont_limitees_aux_zones_du_transporteur(self):
        TrustProfile.objects.create(
            user=self.transporteur,
            verification_status=VerificationStatus.VERIFIED,
            service_areas=['Tunis'],
        )
        self._demande_publiee('Tunis', 'Sousse')
        self._demande_publiee('Tunis', 'Sousse')
        self._demande_publiee('Gabes', 'Medenine')   # hors zone

        recommandations = underserved_corridors(self.transporteur)

        self.assertEqual(len(recommandations), 1)
        self.assertEqual(recommandations[0]['pickup_governorate'], 'Tunis')
        self.assertEqual(recommandations[0]['dropoff_governorate'], 'Sousse')
        self.assertEqual(recommandations[0]['pending_demands'], 2)

    def test_un_corridor_deja_couvert_n_est_pas_recommande(self):
        """Proposer de publier la ou il est deja present n'a aucune valeur."""
        TrustProfile.objects.create(
            user=self.transporteur,
            verification_status=VerificationStatus.VERIFIED,
            service_areas=['Tunis'],
        )
        self._demande_publiee('Tunis', 'Sousse')
        TransportJob.objects.create(
            owner=self.transporteur,
            job_type='TRANSPORT',
            status=TransportJob.Status.PUBLISHED,
            is_return_trip=True,
            pickup_address='Tunis', pickup_governorate='Tunis',
            dropoff_address='Sousse', dropoff_governorate='Sousse',
            scheduled_time=timezone.now() + timedelta(days=2),
            price_tnd_min=Decimal('50'), price_tnd_max=Decimal('200'),
        )

        self.assertEqual(underserved_corridors(self.transporteur), [])
