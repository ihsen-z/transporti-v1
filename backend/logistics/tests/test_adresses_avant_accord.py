"""
Adresses masquées avant accord (logistics/address_privacy.py).

Audit de sécurité : la liste publique et le détail d'une demande renvoyaient
l'adresse exacte du client, ses indications d'accès (étage, code de porte),
ses coordonnées GPS et le tracé de l'itinéraire à n'importe quel compte — la
liste, même à un visiteur non connecté.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from logistics.address_privacy import MASKED_ADDRESS_FALLBACK
from logistics.models import Offer, TransportJob
from logistics.tests.aides_kyc import verify_transporter

User = get_user_model()
SANS_LIMITEUR = {'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}}

ADRESSE = '12 rue des Jasmins, Menzah 6'
INDICATION = '3e étage, code porte 4567'


def _user(email, role):
    return User.objects.create_user(username=email, email=email, password='SecurePass123!',
                                    role=role, first_name='A', last_name='B')


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR)
class AdressesAvantAccordTests(APITestCase):

    def setUp(self):
        self.client_user = _user('cli@t.tn', 'CLIENT')
        self.transporteur = _user('tr@t.tn', 'TRANSPORTER')
        verify_transporter(self.transporteur)
        self.job = TransportJob.objects.create(
            owner=self.client_user, status='PUBLISHED', job_type='TRANSPORT',
            pickup_address=ADRESSE, pickup_governorate='Ariana',
            pickup_lat=Decimal('36.862499'), pickup_lng=Decimal('10.195556'),
            pickup_hint=INDICATION,
            dropoff_address='5 avenue Bourguiba', dropoff_governorate='Sousse',
            dropoff_lat=Decimal('35.825603'), dropoff_lng=Decimal('10.636991'),
            dropoff_hint='Sonner chez Ben Salah',
            route_polyline='trace-exact-de-porte-a-porte',
            scheduled_time=timezone.now() + timedelta(days=2))

    def _offre(self, statut='PENDING'):
        return Offer.objects.create(
            job=self.job, transporter=self.transporteur, status=statut,
            total_price=Decimal('100'), price_net=Decimal('90'),
            commission_amount=Decimal('10'),
            valid_until=timezone.now() + timedelta(days=3))

    def _assert_masque(self, data):
        """Rien, dans `data`, ne permet de trouver la porte du client."""
        self.assertTrue(data['addresses_masked'])
        self.assertEqual(data['pickup_address'], 'Ariana')
        self.assertEqual(data['dropoff_address'], 'Sousse')
        contenu = str(data)
        for secret in (ADRESSE, 'Bourguiba', INDICATION, 'Ben Salah',
                       'trace-exact', '36.862499', '10.195556', '35.825603'):
            self.assertNotIn(secret, contenu)

    def _ligne(self, reponse):
        lignes = reponse.data['results'] if isinstance(reponse.data, dict) else reponse.data
        return next(l for l in lignes if l['id'] == self.job.id)

    # --- Liste publique -------------------------------------------------

    def test_un_visiteur_ne_voit_que_le_gouvernorat(self):
        r = self.client.get('/api/jobs/public/')
        self.assertEqual(r.status_code, 200)
        self._assert_masque(self._ligne(r))

    def test_un_transporteur_ne_voit_que_le_gouvernorat_dans_la_liste(self):
        self.client.force_authenticate(self.transporteur)
        self._assert_masque(self._ligne(self.client.get('/api/jobs/public/')))

    # --- Détail ---------------------------------------------------------

    def test_un_transporteur_non_engage_a_des_coordonnees_arrondies(self):
        self.client.force_authenticate(self.transporteur)
        r = self.client.get(f'/api/jobs/{self.job.id}/')
        self.assertEqual(r.status_code, 200)
        self._assert_masque(r.data)
        self.assertEqual(r.data['pickup_hint'], '')
        self.assertEqual(r.data['dropoff_hint'], '')
        # Arrondi à 2 décimales : on situe le quartier, pas la porte.
        self.assertEqual(float(r.data['pickup_lat']), 36.86)
        self.assertEqual(float(r.data['pickup_lng']), 10.2)

    def test_une_offre_en_attente_ne_donne_pas_l_adresse(self):
        self._offre('PENDING')
        self.client.force_authenticate(self.transporteur)
        self._assert_masque(self.client.get(f'/api/jobs/{self.job.id}/').data)
        r = self.client.get('/api/offers/my/')
        lignes = r.data['results'] if isinstance(r.data, dict) else r.data
        self.assertEqual(lignes[0]['job_pickup'], 'Ariana')
        self.assertEqual(lignes[0]['job_dropoff'], 'Sousse')

    def test_le_client_voit_ses_propres_adresses(self):
        self.client.force_authenticate(self.client_user)
        r = self.client.get(f'/api/jobs/{self.job.id}/')
        self.assertFalse(r.data['addresses_masked'])
        self.assertEqual(r.data['pickup_address'], ADRESSE)
        self.assertEqual(r.data['pickup_hint'], INDICATION)

    def test_le_transporteur_retenu_voit_tout(self):
        self._offre('ACCEPTED')
        self.job.status = 'MATCHED'
        self.job.save(update_fields=['status'])
        self.client.force_authenticate(self.transporteur)
        r = self.client.get(f'/api/jobs/{self.job.id}/')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data['addresses_masked'])
        self.assertEqual(r.data['pickup_address'], ADRESSE)
        self.assertEqual(r.data['pickup_hint'], INDICATION)
        mes_offres = self.client.get('/api/offers/my/')
        lignes = mes_offres.data['results'] if isinstance(mes_offres.data, dict) else mes_offres.data
        self.assertEqual(lignes[0]['job_pickup'], ADRESSE)

    # --- Cas limites ----------------------------------------------------

    def test_sans_gouvernorat_un_texte_neutre_remplace_l_adresse(self):
        self.job.pickup_governorate = ''
        self.job.save(update_fields=['pickup_governorate'])
        self.client.force_authenticate(self.transporteur)
        r = self.client.get(f'/api/jobs/{self.job.id}/')
        self.assertEqual(r.data['pickup_address'], MASKED_ADDRESS_FALLBACK)

    def test_un_trajet_retour_reste_public(self):
        """Le départ et l'arrivée d'un trajet retour sont l'annonce du transporteur."""
        trajet = TransportJob.objects.create(
            owner=self.transporteur, status='PUBLISHED', job_type='TRANSPORT',
            is_return_trip=True, pickup_address='Sfax, zone industrielle',
            pickup_governorate='Sfax', dropoff_address='Tunis, Charguia',
            dropoff_governorate='Tunis',
            scheduled_time=timezone.now() + timedelta(days=2))
        self.client.force_authenticate(self.client_user)
        r = self.client.get(f'/api/jobs/{trajet.id}/')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data['addresses_masked'])
        self.assertEqual(r.data['pickup_address'], 'Sfax, zone industrielle')



@override_settings(REST_FRAMEWORK=SANS_LIMITEUR)
class LibelleDuTrajetSurUneDemandeTests(APITestCase):
    """Un trajet publie sans adresse (le gouvernorat suffit) garde un libelle."""

    def test_le_gouvernorat_remplace_une_adresse_vide(self):
        from logistics.models import ReturnTripRequest
        transporteur = _user('lib-tr@t.tn', 'TRANSPORTER')
        verify_transporter(transporteur)
        cliente = _user('lib-cli@t.tn', 'CLIENT')
        trajet = TransportJob.objects.create(
            owner=transporteur, status='PUBLISHED', job_type='TRANSPORT',
            is_return_trip=True, pickup_address='', pickup_governorate='Sfax',
            dropoff_address='', dropoff_governorate='Tunis',
            scheduled_time=timezone.now() + timedelta(days=2))
        ReturnTripRequest.objects.create(
            job=trajet, client=cliente, status='PENDING',
            description='Deux palettes', proposed_price=Decimal('120'),
            payment_method='COD')

        self.client.force_authenticate(transporteur)
        r = self.client.get('/api/trip-requests/received/')

        self.assertEqual(r.status_code, 200, r.data)
        lignes = r.data['results'] if isinstance(r.data, dict) else r.data
        self.assertEqual(lignes[0]['job_pickup'], 'Sfax')
        self.assertEqual(lignes[0]['job_dropoff'], 'Tunis')
