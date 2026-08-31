"""
C5.9 — le carnet d'adresses.

Ce que ces tests verrouillent, par ordre de gravité :

1. LE CLOISONNEMENT. Un carnet contient des adresses de domicile. Une fuite
   entre comptes n'est pas un défaut d'affichage, c'est une atteinte à la vie
   privée. On vérifie donc qu'un utilisateur ne peut ni lire, ni modifier, ni
   supprimer l'adresse d'un autre — et que la réponse est 404, jamais 403 : un
   403 confirmerait que l'adresse existe.
2. LA DOUBLE SURFACE. Tout nouvel endpoint doit exister sur `/api/` ET
   `/api/v1/`. Le mobile ne consomme que la seconde ; l'oublier livrerait une
   fonctionnalité invisible pour lui, sans qu'aucun test web ne s'en aperçoive.
3. LES DEUX RÔLES. Le carnet est ouvert au client comme au transporteur : ils
   saisissent les mêmes champs. Le réserver au client serait une asymétrie sans
   justification.
4. LES VALIDATIONS QUI NE SE VOIENT PAS : une latitude sans longitude, un nom
   en double, le plafond du carnet.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from logistics.models import SavedAddress

User = get_user_model()


class CarnetDAdressesTests(TestCase):
    def setUp(self):
        self.client_api = APIClient()

        self.leila = User.objects.create_user(
            username='carnet_leila', email='carnet_leila@test.tn',
            password='SecurePass123!', role='CLIENT',
            first_name='Leila', last_name='Ben Amor',
        )
        self.mehdi = User.objects.create_user(
            username='carnet_mehdi', email='carnet_mehdi@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
            first_name='Mehdi', last_name='Khelifi',
        )

        self.adresse_de_leila = SavedAddress.objects.create(
            user=self.leila, label='Domicile',
            address='12 rue de Marseille, Tunis', governorate='Tunis',
        )

    def _connecte(self, utilisateur):
        self.client_api.force_authenticate(user=utilisateur)
        return self.client_api

    # ------------------------------------------------------------------ base

    def test_un_utilisateur_lit_son_propre_carnet(self):
        reponse = self._connecte(self.leila).get('/api/addresses/')

        self.assertEqual(reponse.status_code, 200)
        resultats = reponse.data.get('results', reponse.data)
        self.assertEqual(len(resultats), 1)
        self.assertEqual(resultats[0]['label'], 'Domicile')

    def test_creation_rattachee_au_jeton_et_non_au_corps(self):
        """
        `user` n'est pas un champ du sérialiseur : le fournir ne doit RIEN
        changer. Sans ce contrôle, on pourrait écrire dans le carnet d'autrui.
        """
        reponse = self._connecte(self.mehdi).post('/api/addresses/', {
            'label': 'Entrepot',
            'address': 'Zone industrielle, Sfax',
            'governorate': 'Sfax',
            # Tentative d'attribution a quelqu'un d'autre.
            'user': self.leila.id,
        }, format='json')

        self.assertEqual(reponse.status_code, 201)
        creee = SavedAddress.objects.get(label='Entrepot')
        self.assertEqual(creee.user, self.mehdi)

    def test_le_transporteur_a_droit_au_carnet(self):
        """Les deux roles saisissent les memes champs."""
        reponse = self._connecte(self.mehdi).get('/api/addresses/')

        self.assertEqual(reponse.status_code, 200)

    # --------------------------------------------------------- cloisonnement

    def test_le_carnet_d_un_autre_est_invisible(self):
        reponse = self._connecte(self.mehdi).get('/api/addresses/')

        resultats = reponse.data.get('results', reponse.data)
        self.assertEqual(
            len(resultats), 0,
            "le carnet d'un autre utilisateur apparait dans la liste",
        )

    def test_lire_l_adresse_d_un_autre_rend_404_et_non_403(self):
        """
        404 et non 403 : un 403 confirmerait que cette adresse existe, ce qui
        est deja une information de trop sur un carnet prive.
        """
        url = f'/api/addresses/{self.adresse_de_leila.id}/'

        reponse = self._connecte(self.mehdi).get(url)

        self.assertEqual(reponse.status_code, 404)

    def test_modifier_l_adresse_d_un_autre_est_impossible(self):
        url = f'/api/addresses/{self.adresse_de_leila.id}/'

        reponse = self._connecte(self.mehdi).patch(
            url, {'label': 'Detourne'}, format='json')

        self.assertEqual(reponse.status_code, 404)
        self.adresse_de_leila.refresh_from_db()
        self.assertEqual(self.adresse_de_leila.label, 'Domicile')

    def test_supprimer_l_adresse_d_un_autre_est_impossible(self):
        url = f'/api/addresses/{self.adresse_de_leila.id}/'

        reponse = self._connecte(self.mehdi).delete(url)

        self.assertEqual(reponse.status_code, 404)
        self.assertTrue(
            SavedAddress.objects.filter(pk=self.adresse_de_leila.pk).exists())

    def test_sans_authentification_rien_n_est_lisible(self):
        reponse = APIClient().get('/api/addresses/')

        self.assertIn(reponse.status_code, (401, 403))

    # ------------------------------------------------------- double surface

    def test_l_endpoint_existe_sur_les_deux_surfaces(self):
        """
        Le mobile ne consomme QUE `/api/v1/`. Un endpoint absent de cette
        surface est livre mort pour lui, et aucun test web ne le verrait.
        """
        for prefixe in ('/api', '/api/v1'):
            with self.subTest(surface=prefixe):
                reponse = self._connecte(self.leila).get(f'{prefixe}/addresses/')
                self.assertEqual(reponse.status_code, 200)

    # ------------------------------------------------------------ validation

    def test_une_latitude_sans_longitude_est_refusee(self):
        """
        Le defaut qui ne se verrait pas : une latitude seule ne situe rien.
        Elle passerait sans bruit, et l'estimation de prix retomberait
        silencieusement sur le centroide du gouvernorat en croyant utiliser un
        point precis.
        """
        reponse = self._connecte(self.leila).post('/api/addresses/', {
            'label': 'Incomplete',
            'address': 'Quelque part',
            'governorate': 'Tunis',
            'lat': '36.8065',
        }, format='json')

        self.assertEqual(reponse.status_code, 400)

    def test_les_deux_coordonnees_ensemble_sont_acceptees(self):
        reponse = self._connecte(self.leila).post('/api/addresses/', {
            'label': 'Bureau',
            'address': 'Avenue Habib Bourguiba, Tunis',
            'governorate': 'Tunis',
            'lat': '36.8065',
            'lng': '10.1815',
        }, format='json')

        self.assertEqual(reponse.status_code, 201)

    def test_aucune_coordonnee_est_accepte(self):
        """
        Un lieu peut n'etre connu que par son gouvernorat : c'est deja le cas
        sur TransportJob. Exiger des coordonnees rendrait inutilisable une
        adresse pourtant valide.
        """
        reponse = self._connecte(self.leila).post('/api/addresses/', {
            'label': 'Sans coordonnees',
            'address': 'Centre ville',
            'governorate': 'Sousse',
        }, format='json')

        self.assertEqual(reponse.status_code, 201)

    def test_deux_adresses_ne_peuvent_pas_porter_le_meme_nom(self):
        """
        Message utilisable, et non l'erreur 500 que la contrainte de base de
        donnees produirait seule.
        """
        reponse = self._connecte(self.leila).post('/api/addresses/', {
            'label': 'Domicile',
            'address': 'Une autre rue',
            'governorate': 'Ariana',
        }, format='json')

        self.assertEqual(reponse.status_code, 400)
        self.assertIn('label', reponse.data)

    def test_le_meme_nom_chez_deux_utilisateurs_est_permis(self):
        """L'unicite est PAR CARNET, pas globale."""
        reponse = self._connecte(self.mehdi).post('/api/addresses/', {
            'label': 'Domicile',
            'address': 'Route de Gremda, Sfax',
            'governorate': 'Sfax',
        }, format='json')

        self.assertEqual(reponse.status_code, 201)

    def test_le_carnet_est_plafonne_avec_un_message_explicite(self):
        for i in range(SavedAddress.MAXIMUM_PAR_UTILISATEUR - 1):
            SavedAddress.objects.create(
                user=self.leila, label=f'Lieu {i}',
                address=f'Adresse {i}', governorate='Tunis',
            )

        reponse = self._connecte(self.leila).post('/api/addresses/', {
            'label': 'Une de trop',
            'address': 'Ailleurs',
            'governorate': 'Tunis',
        }, format='json')

        self.assertEqual(reponse.status_code, 400)
        self.assertIn(
            str(SavedAddress.MAXIMUM_PAR_UTILISATEUR), str(reponse.data),
            "le message doit dire la limite, pas seulement refuser",
        )

    def test_le_plafond_n_empeche_pas_de_renommer(self):
        """
        Refuser une modification parce que le carnet est plein serait
        incomprehensible : renommer ne fait pas grossir le carnet.
        """
        for i in range(SavedAddress.MAXIMUM_PAR_UTILISATEUR - 1):
            SavedAddress.objects.create(
                user=self.leila, label=f'Lieu {i}',
                address=f'Adresse {i}', governorate='Tunis',
            )

        url = f'/api/addresses/{self.adresse_de_leila.id}/'
        reponse = self._connecte(self.leila).patch(
            url, {'label': 'Maison'}, format='json')

        self.assertEqual(reponse.status_code, 200)
        self.adresse_de_leila.refresh_from_db()
        self.assertEqual(self.adresse_de_leila.label, 'Maison')
