"""
Bombe de décompression : une image minuscule qui annonce des dizaines de
mégapixels est refusée AVANT le décodage complet, pour les avatars comme
pour les photos d'annonce (module partagé transporti_core/images.py).
"""
import struct
import zlib
from io import BytesIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from PIL import Image
from rest_framework.test import APITestCase

from transporti_core.images import MAX_PIXELS, InvalidImage, reencode, reencode_as_jpeg

User = get_user_model()


def _png(largeur: int, hauteur: int) -> bytes:
    """PNG noir compressé : quelques centaines de Ko pour des dizaines de Mpx."""
    def bloc(type_, data):
        return (struct.pack('>I', len(data)) + type_ + data
                + struct.pack('>I', zlib.crc32(type_ + data) & 0xffffffff))
    comp = zlib.compressobj(9)
    ligne = b'\x00' + b'\x00' * (largeur * 3)
    idat = b''.join(comp.compress(ligne) for _ in range(hauteur)) + comp.flush()
    return (b'\x89PNG\r\n\x1a\n' + bloc(b'IHDR', struct.pack('>IIBBBBB', largeur, hauteur, 8, 2, 0, 0, 0))
            + bloc(b'IDAT', idat) + bloc(b'IEND', b''))


def _jpeg(largeur=40, hauteur=30) -> bytes:
    buffer = BytesIO()
    Image.new('RGB', (largeur, hauteur), 'red').save(buffer, format='JPEG')
    return buffer.getvalue()


class BombeDeDecompressionTests(SimpleTestCase):

    def test_au_dela_de_40_megapixels_refus_sans_decodage(self):
        # 7 000 × 6 000 = 42 Mpx : sous le seuil d'alerte de Pillow (89 Mpx),
        # c'est notre propre plafond qui doit refuser.
        donnees = _png(7000, 6000)
        self.assertGreater(7000 * 6000, MAX_PIXELS)
        with mock.patch.object(Image.Image, 'load', side_effect=AssertionError('décodé !')):
            with self.assertRaises(InvalidImage):
                reencode_as_jpeg(BytesIO(donnees), max_dimension=512)

    def test_alerte_de_pillow_traitee_comme_erreur(self):
        with mock.patch('transporti_core.images.MAX_PIXELS', 10 ** 12):
            with mock.patch.object(Image, 'MAX_IMAGE_PIXELS', 1000):
                # 40 × 30 = 1 200 px > 1 000 : DecompressionBombWarning.
                with self.assertRaises(InvalidImage):
                    reencode(BytesIO(_jpeg()), max_dimension=512)

    def test_image_normale_acceptee(self):
        resultat = reencode(BytesIO(_jpeg(400, 300)), max_dimension=200)
        self.assertEqual((resultat.width, resultat.height), (200, 150))
        self.assertTrue(resultat.content.name.endswith('.jpg'))


@override_settings(REST_FRAMEWORK={'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}})
class PhotoUploadPartageTests(APITestCase):
    """La route des photos passe par le module partagé, contrat inchangé."""

    def setUp(self):
        self.user = User.objects.create_user(username='p@t.tn', email='p@t.tn', password='SecurePass123!')
        self.client.force_authenticate(self.user)

    def _envoyer(self, contenu, nom='photo.png', type_='image/png'):
        return self.client.post('/api/upload/photo/', {'photo': SimpleUploadedFile(nom, contenu, type_)},
                                format='multipart')

    def test_bombe_refusee_par_la_route_photo(self):
        r = self._envoyer(_png(7000, 6000))
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data['error'], "Le fichier n'est pas une image valide.")

    def test_format_refuse_nomme(self):
        buffer = BytesIO()
        Image.new('RGB', (10, 10)).save(buffer, format='GIF')
        r = self._envoyer(buffer.getvalue(), 'a.gif', 'image/gif')
        self.assertEqual(r.status_code, 400)
        self.assertIn('Format non supporté: GIF', r.data['error'])

    def test_contrat_de_reponse_inchange(self):
        with mock.patch('logistics.upload_views.default_storage') as stockage:
            stockage.save.return_value = 'uploads/photos/x.jpg'
            r = self._envoyer(_jpeg(3000, 1500), 'a.jpg', 'image/jpeg')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(set(r.data), {'url', 'filename', 'size', 'dimensions'})
        self.assertEqual(r.data['dimensions'], [2000, 1000])
        self.assertTrue(r.data['filename'].endswith('.jpg'))
