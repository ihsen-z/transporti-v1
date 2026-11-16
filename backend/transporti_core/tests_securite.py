"""
Correctifs d'audit sécurité (transporti_core) : /media/ restreint aux images,
NUM_PROXIES, admin Django et documentation d'API fermés en production.
"""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIRequestFactory, APITestCase, force_authenticate
from rest_framework.throttling import AnonRateThrottle

from transporti_core.urls_outils import outils_patterns

User = get_user_model()


class MediaServingTests(APITestCase):

    def setUp(self):
        self.created: list[str] = []

    def tearDown(self):
        for name in self.created:
            default_storage.delete(name)

    def _store(self, name: str, content: bytes) -> str:
        saved = default_storage.save(name, ContentFile(content))
        self.created.append(saved)
        return saved

    def test_image_is_served_with_protective_headers(self):
        saved = self._store('uploads/photos/test-secu.jpg', b'\xff\xd8\xff fake jpeg')
        resp = self.client.get(f'/media/{saved}')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'image/jpeg')
        self.assertEqual(resp['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(resp['Content-Security-Policy'], 'sandbox')

    def test_html_and_svg_are_not_served(self):
        for name in ('avatars/piege-secu.html', 'avatars/piege-secu.svg', 'avatars/piege-secu'):
            saved = self._store(name, b'<script>alert(1)</script>')
            resp = self.client.get(f'/media/{saved}')
            self.assertEqual(resp.status_code, 404, name)


    def test_kyc_folder_is_never_served_whatever_the_spelling(self):
        saved = self._store('verification_docs/7/7_CIN_secu.jpg', b'fake jpeg piece')
        reste = saved.split('/', 1)[1]
        variantes = (
            saved,
            './' + saved,
            '%2e/' + saved,
            '%2E/' + saved,
            'avatars/../' + saved,
            'avatars/./../' + saved,
            'Verification_Docs/' + reste,
            'avatars//' + saved,
            'uploads/verification_docs/' + reste,
            saved.replace('/', '/./', 1),
        )
        for chemin in variantes:
            resp = self.client.get('/media/' + chemin)
            self.assertEqual(resp.status_code, 404, chemin)

    def test_chemin_public_rejects_non_canonical_paths(self):
        from transporti_core.media import chemin_public
        self.assertTrue(chemin_public('uploads/photos/a.jpg'))
        for chemin in ('./a.jpg', 'a/./b.jpg', 'a/../b.jpg', 'a//b.jpg', 'a/', '.', '..',
                       'x/Verification_docs/a.jpg'):
            self.assertFalse(chemin_public(chemin), chemin)


class NumProxiesTests(SimpleTestCase):

    def test_num_proxies_is_configured(self):
        # Sans valeur, DRF fait confiance au X-Forwarded-For fourni par le client.
        self.assertIsInstance(settings.REST_FRAMEWORK.get('NUM_PROXIES'), int)

    def test_spoofed_forwarded_for_does_not_change_identity(self):
        factory = APIRequestFactory()
        throttle = AnonRateThrottle()
        with self.settings(REST_FRAMEWORK={**settings.REST_FRAMEWORK, 'NUM_PROXIES': 1}):
            # Le proxy (Render) ajoute la vraie adresse en dernier.
            a = factory.get('/', HTTP_X_FORWARDED_FOR='1.1.1.1, 9.9.9.9', REMOTE_ADDR='10.0.0.1')
            b = factory.get('/', HTTP_X_FORWARDED_FOR='2.2.2.2, 9.9.9.9', REMOTE_ADDR='10.0.0.1')
            from rest_framework.settings import api_settings
            api_settings.reload()
            try:
                self.assertEqual(throttle.get_ident(a), '9.9.9.9')
                self.assertEqual(throttle.get_ident(a), throttle.get_ident(b))
            finally:
                api_settings.reload()


def _routes() -> list[str]:
    return [str(p.pattern) for p in outils_patterns()]


class ToolingRoutesTests(APITestCase):

    def setUp(self):
        cache.clear()

    @override_settings(DJANGO_ADMIN_ENABLED=False, API_DOCS_PUBLIC=False)
    def test_admin_not_mounted_when_disabled(self):
        self.assertNotIn('admin/', _routes())

    @override_settings(DJANGO_ADMIN_ENABLED=True)
    def test_admin_mounted_when_enabled(self):
        self.assertIn('admin/', _routes())

    @override_settings(API_DOCS_PUBLIC=False)
    def test_schema_requires_admin_when_not_public(self):
        schema_view = next(p for p in outils_patterns() if str(p.pattern) == 'api/schema/').callback
        factory = APIRequestFactory()

        self.assertEqual(schema_view(factory.get('/api/schema/')).status_code, 401)

        client_user = User.objects.create_user(username='docs_c', email='docs_c@test.tn',
                                               password='SecurePass123!', role='CLIENT')
        request = factory.get('/api/schema/')
        force_authenticate(request, user=client_user)
        self.assertEqual(schema_view(request).status_code, 403)

        admin_user = User.objects.create_user(username='docs_a', email='docs_a@test.tn',
                                              password='SecurePass123!', role='ADMIN')
        request = factory.get('/api/schema/')
        force_authenticate(request, user=admin_user)
        self.assertEqual(schema_view(request).status_code, 200)

    @override_settings(API_DOCS_PUBLIC=True)
    def test_docs_open_when_public(self):
        docs_view = next(p for p in outils_patterns() if str(p.pattern) == 'api/docs/').callback
        self.assertEqual(docs_view(APIRequestFactory().get('/api/docs/')).status_code, 200)
