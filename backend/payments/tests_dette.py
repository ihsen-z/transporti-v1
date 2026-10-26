"""
Dette de commission sur les courses en espèces (payments/debt.py).

Ce que ces tests protègent :
- le plafond : au-delà de COMMISSION_DEBT_LIMIT, un transporteur ne peut plus
  engager de nouvelle course, et se débloque seul dès que sa dette repasse
  sous le plafond ;
- la discrétion : un client qui tombe sur un transporteur bloqué reçoit un
  refus neutre, sans un mot sur la dette ;
- la dette perdue : une course livrée en espèces inscrit TOUJOURS sa
  commission, même si le transporteur n'aurait pas dû encaisser en espèces ;
- le plafond espèces : un seul réglage, lu partout.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from logistics.models import Offer, TransportJob
from payments.debt import is_blocked_for_debt, outstanding_commission_debt
from payments.models import Booking, CommissionLedger
from support.models import AuditLog
from trust.models import TrustProfile, VerificationStatus

User = get_user_model()
V1 = '/api/v1'
SANS_LIMITEUR = {'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}}


def un_transporteur(nom='dette', verifie=True):
    user = User.objects.create_user(
        username=f'{nom}@test.tn', email=f'{nom}@test.tn', password='SecurePass123!',
        role='TRANSPORTER', first_name='Slim', last_name='Trabelsi',
    )
    if verifie:
        TrustProfile.objects.create(
            user=user, verification_status=VerificationStatus.VERIFIED,
            verified_at=timezone.now(), trust_score=80,
        )
    return user


def un_trajet(transporteur, **extra):
    champs = {
        'owner': transporteur, 'status': 'PUBLISHED', 'job_type': 'TRANSPORT',
        'is_return_trip': True,
        'pickup_address': 'Sfax Centre', 'pickup_governorate': 'Sfax',
        'dropoff_address': 'Tunis Centre', 'dropoff_governorate': 'Tunis',
        'scheduled_time': timezone.now() + timedelta(days=2),
        'price_tnd_min': Decimal('150.00'),
    }
    champs.update(extra)
    return TransportJob.objects.create(**champs)


def une_dette(transporteur, montant, reglee=False):
    """Une commission due, rattachée à une course livrée (OneToOne sur le job)."""
    job = un_trajet(transporteur, status='COMPLETED')
    return CommissionLedger.objects.create(
        transporter=transporteur, job_reference=job,
        amount=Decimal(montant), is_settled=reglee,
    )


class PlafondDeDetteTests(TestCase):

    def setUp(self):
        self.transporteur = un_transporteur()

    def test_seules_les_commissions_non_reglees_comptent(self):
        une_dette(self.transporteur, '20.00')
        une_dette(self.transporteur, '30.00', reglee=True)
        self.assertEqual(outstanding_commission_debt(self.transporteur), Decimal('20.00'))

    def test_au_plafond_exact_le_transporteur_n_est_pas_bloque(self):
        une_dette(self.transporteur, '60.00')
        self.assertFalse(is_blocked_for_debt(self.transporteur))

    def test_au_dela_du_plafond_il_est_bloque(self):
        une_dette(self.transporteur, '40.00')
        une_dette(self.transporteur, '20.01')
        self.assertTrue(is_blocked_for_debt(self.transporteur))

    @override_settings(COMMISSION_DEBT_LIMIT=Decimal('100'))
    def test_le_plafond_se_regle_sans_toucher_au_code(self):
        une_dette(self.transporteur, '80.00')
        self.assertFalse(is_blocked_for_debt(self.transporteur))


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR, PAYMENT_GATEWAY='SANDBOX')
class BlocageDesEngagementsTests(APITestCase):

    def setUp(self):
        self.transporteur = un_transporteur()
        self.client_user = User.objects.create_user(
            username='client-dette@test.tn', email='client-dette@test.tn',
            password='SecurePass123!', role='CLIENT', first_name='Amine', last_name='Benali',
        )

    def _bloquer(self):
        return une_dette(self.transporteur, '75.00')

    def test_un_transporteur_bloque_ne_peut_pas_publier_de_retour(self):
        self._bloquer()
        self.client.force_authenticate(self.transporteur)

        reponse = self.client.post(f'{V1}/jobs/return-trip/', {}, format='json')

        self.assertEqual(reponse.status_code, 403)
        self.assertEqual(reponse.data['code'], 'COMMISSION_DEBT_LIMIT')
        self.assertIn('75.00', reponse.data['error'])

    def test_il_se_debloque_seul_des_que_la_dette_est_reglee(self):
        dette = self._bloquer()
        self.client.force_authenticate(self.transporteur)
        self.assertEqual(self.client.post(f'{V1}/jobs/return-trip/', {}, format='json').status_code, 403)

        dette.is_settled = True
        dette.save()

        reponse = self.client.post(f'{V1}/jobs/return-trip/', {}, format='json')
        # Le corps vide est refusé pour ses champs (400), plus pour la dette.
        self.assertNotEqual(reponse.status_code, 403)

    def test_il_peut_encore_refuser_une_demande_mais_pas_l_accepter(self):
        trajet = un_trajet(self.transporteur)
        self.client.force_authenticate(self.client_user)
        cree = self.client.post(f'{V1}/jobs/{trajet.id}/requests/', {
            'description': 'Deux palettes', 'proposed_price': '200.00', 'payment_method': 'COD',
        }, format='json')
        self.assertEqual(cree.status_code, 201, cree.data)
        demande_id = cree.data['request']['id']

        self._bloquer()
        self.client.force_authenticate(self.transporteur)
        accepte = self.client.post(
            f'{V1}/trip-requests/{demande_id}/respond/', {'action': 'accept'}, format='json',
        )
        self.assertEqual(accepte.status_code, 403)
        self.assertEqual(accepte.data['code'], 'COMMISSION_DEBT_LIMIT')

        refuse = self.client.post(
            f'{V1}/trip-requests/{demande_id}/respond/', {'action': 'reject'}, format='json',
        )
        self.assertEqual(refuse.status_code, 200, refuse.data)

    def test_le_client_recoit_un_refus_neutre_sans_mention_de_dette(self):
        trajet = un_trajet(self.transporteur, instant_booking=True)
        self._bloquer()
        self.client.force_authenticate(self.client_user)

        reponse = self.client.post(f'{V1}/jobs/{trajet.id}/book-return/', {
            'proposed_price': '200.00', 'payment_method': 'COD',
        }, format='json')

        self.assertEqual(reponse.status_code, 409)
        self.assertEqual(reponse.data['code'], 'TRANSPORTER_UNAVAILABLE')
        self.assertNotIn('commission', reponse.data['error'].lower())
        self.assertNotIn('dette', reponse.data['error'].lower())
        trajet.refresh_from_db()
        self.assertEqual(trajet.status, 'PUBLISHED')

    def test_le_portefeuille_annonce_le_plafond_et_le_blocage(self):
        self._bloquer()
        self.client.force_authenticate(self.transporteur)

        reponse = self.client.get(f'{V1}/wallet/')

        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertEqual(reponse.data['commission_debt_limit'], 60.0)
        self.assertTrue(reponse.data['blocked_for_debt'])


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR, PAYMENT_GATEWAY='SANDBOX')
class PlafondEspecesCentraliseTests(APITestCase):

    def setUp(self):
        self.transporteur = un_transporteur('especes')
        self.client_user = User.objects.create_user(
            username='client-especes@test.tn', email='client-especes@test.tn',
            password='SecurePass123!', role='CLIENT', first_name='Amine', last_name='Benali',
        )
        self.trajet = un_trajet(self.transporteur, instant_booking=True)
        self.client.force_authenticate(self.client_user)

    def _reserver(self, prix):
        return self.client.post(f'{V1}/jobs/{self.trajet.id}/book-return/', {
            'proposed_price': prix, 'payment_method': 'COD',
        }, format='json')

    def test_par_defaut_les_especes_s_arretent_a_300(self):
        reponse = self._reserver('400.00')
        self.assertEqual(reponse.status_code, 400)
        self.assertIn('300', reponse.data['error'])

    @override_settings(COD_MAX_AMOUNT=Decimal('500'))
    def test_le_reglage_releve_le_plafond_partout(self):
        reponse = self._reserver('400.00')
        self.assertEqual(reponse.status_code, 201, reponse.data)
        self.assertTrue(Booking.objects.get(job=self.trajet).cod_allowed)


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR, PAYMENT_GATEWAY='SANDBOX')
class DetteJamaisPerdueTests(APITestCase):
    """Avant : un transporteur non vérifié livrait en espèces sans dette inscrite."""

    def _course_en_cours(self, transporteur):
        client_user = User.objects.create_user(
            username=f'c-{transporteur.username}', email=f'c-{transporteur.email}',
            password='SecurePass123!', role='CLIENT',
        )
        job = un_trajet(transporteur, status='IN_PROGRESS')
        offre = Offer.objects.create(
            job=job, transporter=transporteur, status=Offer.Status.ACCEPTED,
            total_price=Decimal('216.00'), price_net=Decimal('200.00'),
            commission_amount=Decimal('16.00'),
            valid_until=timezone.now() + timedelta(days=7),
        )
        booking = Booking.objects.create(
            job=job, accepted_offer=offre, final_price=offre.total_price,
            commission_rate=Decimal('0.08'), payment_method=Booking.PaymentMethod.COD,
        )
        return job, booking, client_user

    def _livrer(self, transporteur, job, booking):
        self.client.force_authenticate(transporteur)
        return self.client.post(
            f'{V1}/jobs/{job.id}/complete/', {'pin': booking.delivery_pin}, format='json',
        )

    def test_un_transporteur_non_verifie_doit_quand_meme_sa_commission(self):
        transporteur = un_transporteur('non-verifie', verifie=False)
        job, booking, _ = self._course_en_cours(transporteur)

        reponse = self._livrer(transporteur, job, booking)

        self.assertEqual(reponse.status_code, 200, reponse.data)
        dette = CommissionLedger.objects.get(job_reference=job)
        self.assertEqual(dette.amount, Decimal('16.00'))
        self.assertFalse(dette.is_settled)
        self.assertTrue(
            AuditLog.objects.filter(
                action='COD_DEBT_TRUST_ANOMALY', target_entity=f'CommissionLedger:{dette.id}',
            ).exists()
        )

    def test_un_transporteur_verifie_ne_declenche_aucune_anomalie(self):
        transporteur = un_transporteur('verifie')
        job, booking, _ = self._course_en_cours(transporteur)

        self._livrer(transporteur, job, booking)

        self.assertTrue(CommissionLedger.objects.filter(job_reference=job).exists())
        self.assertFalse(AuditLog.objects.filter(action='COD_DEBT_TRUST_ANOMALY').exists())


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR)
class ConfigurationServieAuxEcransTests(APITestCase):
    """Les écrans lisent les plafonds ici au lieu de les écrire en dur."""

    def setUp(self):
        self.client.force_authenticate(un_transporteur('config'))

    def test_renvoie_les_deux_plafonds(self):
        reponse = self.client.get(f'{V1}/payments/config/')

        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data, {
            'cod_max_amount': 300.0, 'commission_debt_limit': 60.0,
            'online_payment_enabled': True,
        })

    @override_settings(COD_MAX_AMOUNT=Decimal('450'))
    def test_suit_le_reglage_du_serveur(self):
        self.assertEqual(self.client.get(f'{V1}/payments/config/').data['cod_max_amount'], 450.0)

    def test_lisible_sans_connexion(self):
        # La page publique /aide annonce le plafond espèces avant toute connexion.
        self.client.force_authenticate(None)
        reponse = self.client.get(f'{V1}/payments/config/')
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data['cod_max_amount'], 300.0)
