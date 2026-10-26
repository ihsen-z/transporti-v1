"""
Stockage privé des pièces KYC (trust/fichiers.py) et route publique /media/.

Ce que ces tests protègent :
- une pièce d'identité passe par le stockage configuré (bucket R2 en
  production), au lieu du disque éphémère du serveur ;
- elle ne se lit que par un lien signé, valable 15 minutes, remis à son
  propriétaire ou à un administrateur — jamais par /media/ ;
- /media/ sert toujours les fichiers publics (photos de chargement), en
  lisant le même stockage : les URL déjà en base restent valides.
"""
import shutil
import tempfile
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from trust.fichiers import lien_signe
from trust.models import TrustProfile, VerificationDocument

User = get_user_model()
V1 = '/api/v1'
SANS_LIMITEUR = {'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}}
PNG = b'\x89PNG\r\n\x1a\n-piece-de-test'


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR)
class StockagePriveDesPiecesTests(APITestCase):

    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        reglage = override_settings(MEDIA_ROOT=self.media)
        reglage.enable()
        self.addCleanup(reglage.disable)

        self.transporteur = User.objects.create_user(
            username='kyc-fichier@test.tn', email='kyc-fichier@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
        )
        self.profil = TrustProfile.objects.create(user=self.transporteur)
        self.admin = User.objects.create_user(
            username='admin-kyc@test.tn', email='admin-kyc@test.tn',
            password='SecurePass123!', role='ADMIN',
        )

    def _envoyer_cin(self):
        self.client.force_authenticate(self.transporteur)
        reponse = self.client.post(f'{V1}/trust/documents/', {
            'document_type': 'CIN_FRONT',
            'document_file': SimpleUploadedFile('cin.png', PNG, content_type='image/png'),
        }, format='multipart')
        self.assertEqual(reponse.status_code, 201, reponse.data)
        return VerificationDocument.objects.get(profile=self.profil), reponse.data['document']

    # --- Écriture ----------------------------------------------------------

    def test_la_piece_est_ecrite_dans_le_stockage_sous_le_dossier_kyc(self):
        document, _ = self._envoyer_cin()

        self.assertTrue(document.s3_key.startswith(f'verification_docs/{self.transporteur.id}/'))
        self.assertTrue(default_storage.exists(document.s3_key))
        with default_storage.open(document.s3_key, 'rb') as fichier:
            self.assertEqual(fichier.read(), PNG)

    # --- Lecture par lien signé --------------------------------------------

    def test_le_proprietaire_recoit_un_lien_signe_qui_rend_la_piece(self):
        _, donnees = self._envoyer_cin()
        lien = donnees['file_url']

        self.assertIn('/trust/fichiers/', lien)
        self.assertNotIn('/media/', lien)
        self.assertTrue(lien.endswith('.png'))  # l'écran admin reconnaît l'image

        self.client.force_authenticate(None)  # une balise <img> n'envoie pas de jeton
        reponse = self.client.get(lien)
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.content, PNG)
        self.assertEqual(reponse['Content-Type'], 'image/png')
        self.assertEqual(reponse['Cache-Control'], 'private, no-store')

    def test_l_administrateur_recoit_aussi_un_lien_signe(self):
        self._envoyer_cin()
        self.client.force_authenticate(self.admin)

        reponse = self.client.get(f'{V1}/trust/admin/verifications/{self.profil.id}/documents/')

        self.assertEqual(reponse.status_code, 200)
        lien = reponse.data['documents'][0]['fileUrl']
        self.assertIn('/trust/fichiers/', lien)
        self.assertEqual(self.client.get(lien).status_code, 200)

    def test_un_lien_expire_ne_rend_plus_rien(self):
        document, _ = self._envoyer_cin()
        lien = lien_signe(document.s3_key)

        with mock.patch('trust.fichiers.LIEN_VALIDITE', -1):
            self.assertEqual(self.client.get(lien).status_code, 404)

    def test_un_lien_trafique_ne_rend_rien(self):
        document, _ = self._envoyer_cin()
        lien = lien_signe(document.s3_key)
        prefixe, nom = lien.rsplit('/', 1)

        self.assertEqual(self.client.get(f'{prefixe[:-3]}abc/{nom}').status_code, 404)
        # Un lien valide ne sert pas à lire un AUTRE fichier en changeant le nom.
        self.assertEqual(self.client.get(f'{prefixe}/autre.png').status_code, 404)

    def test_une_cle_hors_du_dossier_kyc_ne_donne_aucun_lien(self):
        self.assertEqual(lien_signe('uploads/photos/x.png'), '')
        self.assertEqual(lien_signe('verification_docs/../settings.py'), '')

    # --- /media/ ne sert plus les pièces -----------------------------------

    def test_media_refuse_le_dossier_kyc(self):
        document, _ = self._envoyer_cin()
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get(f'/media/{document.s3_key}').status_code, 404)
        # Ni par une remontée de dossier, ni en jouant sur la casse (disque Windows).
        self.assertEqual(self.client.get(f'/media/uploads/../{document.s3_key}').status_code, 404)
        majuscules = document.s3_key.replace('verification_docs', 'Verification_Docs')
        self.assertEqual(self.client.get(f'/media/{majuscules}').status_code, 404)

    def test_media_sert_toujours_les_fichiers_publics_depuis_le_stockage(self):
        cle = default_storage.save('uploads/photos/palette.jpg', ContentFile(b'photo'))

        reponse = self.client.get(f'/media/{cle}')

        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.content, b'photo')
        self.assertEqual(self.client.get('/media/uploads/photos/absente.jpg').status_code, 404)

    def test_l_url_d_une_photo_de_chargement_rend_bien_la_photo(self):
        # Elle est enregistrée en base (TransportJob.photos) : elle doit passer
        # par /media/, qui lit le stockage, et non par une URL signée qui
        # expirerait.
        from io import BytesIO

        from PIL import Image

        image = BytesIO()
        Image.new('RGB', (40, 30), 'blue').save(image, format='JPEG')
        self.client.force_authenticate(self.transporteur)

        reponse = self.client.post(f'{V1}/upload/photo/', {
            'photo': SimpleUploadedFile('palette.jpg', image.getvalue(), content_type='image/jpeg'),
        }, format='multipart')

        self.assertEqual(reponse.status_code, 201, reponse.data)
        url = reponse.data['url']
        self.assertIn('/media/uploads/photos/', url)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(url).status_code, 200)
