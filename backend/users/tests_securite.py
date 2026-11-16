"""
Correctifs d'audit sécurité (users) : message de connexion neutre,
verrouillage, déconnexion, révocation des sessions, réinitialisation du
mot de passe, avatar ré-encodé.
"""
from io import BytesIO

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from PIL import Image
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
AUTH = '/api/v1/auth'
PASSWORD = 'SecurePass123!'


def _make_user(email: str = 'secu@test.tn', **extra) -> User:
    return User.objects.create_user(
        username=email.split('@')[0], email=email, password=PASSWORD,
        role='CLIENT', first_name='Test', last_name='User', **extra,
    )


class LoginEnumerationTests(APITestCase):

    def setUp(self):
        cache.clear()
        _make_user()

    def test_unknown_email_and_wrong_password_get_the_same_answer(self):
        unknown = self.client.post(f'{AUTH}/login/', {'email': 'nobody@test.tn', 'password': 'x'}, format='json')
        wrong = self.client.post(f'{AUTH}/login/', {'email': 'secu@test.tn', 'password': 'x'}, format='json')
        self.assertEqual(unknown.status_code, 400)
        self.assertEqual(wrong.status_code, 400)
        self.assertEqual(unknown.json(), wrong.json())
        # Contrat lu par l'app mobile (loginError.ts) : clé `email` ou `password`.
        self.assertIn('email', wrong.json())


class LoginLockoutTests(APITestCase):

    def setUp(self):
        cache.clear()
        _make_user()

    def _login(self, password: str):
        return self.client.post(f'{AUTH}/login/', {'email': 'SECU@test.tn', 'password': password}, format='json')

    def test_account_locked_after_five_failures_even_with_good_password(self):
        for _ in range(5):
            self.assertEqual(self._login('mauvais').status_code, 400)
        resp = self._login(PASSWORD)
        self.assertEqual(resp.status_code, 429)
        self.assertEqual(resp.json()['code'], 'account_locked')
        self.assertNotIn('tokens', resp.json())

    def test_unknown_email_is_locked_the_same_way(self):
        for _ in range(5):
            self.client.post(f'{AUTH}/login/', {'email': 'ghost@test.tn', 'password': 'x'}, format='json')
        resp = self.client.post(f'{AUTH}/login/', {'email': 'ghost@test.tn', 'password': 'x'}, format='json')
        self.assertEqual(resp.status_code, 429)

    def test_success_resets_the_counter(self):
        for _ in range(4):
            self._login('mauvais')
        self.assertEqual(self._login(PASSWORD).status_code, 200)
        for _ in range(4):
            self._login('mauvais')
        self.assertEqual(self._login(PASSWORD).status_code, 200)


class LogoutTests(APITestCase):

    def setUp(self):
        cache.clear()
        self.user = _make_user()

    def _tokens(self) -> dict:
        resp = self.client.post(f'{AUTH}/login/', {'email': 'secu@test.tn', 'password': PASSWORD}, format='json')
        return resp.json()['tokens']

    def test_logout_blacklists_refresh_token(self):
        tokens = self._tokens()
        resp = self.client.post(f'{AUTH}/logout/', {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(resp.status_code, 205)
        refresh = self.client.post(f'{AUTH}/token/refresh/', {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(refresh.status_code, 401)

    def test_logout_is_idempotent_and_never_500(self):
        tokens = self._tokens()
        for body in ({'refresh': tokens['refresh']}, {'refresh': tokens['refresh']},
                     {'refresh': 'pas-un-jeton'}, {}):
            resp = self.client.post(f'{AUTH}/logout/', body, format='json')
            self.assertEqual(resp.status_code, 205, body)

    def test_logout_works_with_expired_access_header(self):
        tokens = self._tokens()
        self.client.credentials(HTTP_AUTHORIZATION='Bearer jeton.expire.invalide')
        resp = self.client.post(f'{AUTH}/logout/', {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(resp.status_code, 205)

    def test_legacy_route_exists(self):
        tokens = self._tokens()
        resp = self.client.post('/api/auth/logout/', {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(resp.status_code, 205)


class PasswordChangeRevokesSessionsTests(APITestCase):

    def setUp(self):
        cache.clear()
        self.user = _make_user()

    def test_change_password_blacklists_all_refresh_tokens(self):
        other_device = RefreshToken.for_user(self.user)
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(f'{AUTH}/change-password/', {
            'current_password': PASSWORD, 'new_password': 'Nouveau-Mot-2026!',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.client.force_authenticate(user=None)
        refresh = self.client.post(f'{AUTH}/token/refresh/', {'refresh': str(other_device)}, format='json')
        self.assertEqual(refresh.status_code, 401)
        # Toutes les sessions d'AVANT tombent ; seule la nouvelle paire
        # renvoyée à l'appareil demandeur (point 13) reste valable.
        self.assertEqual(
            BlacklistedToken.objects.filter(token__user=self.user).count(),
            OutstandingToken.objects.filter(user=self.user).count() - 1,
        )
        self.assertFalse(BlacklistedToken.objects.filter(
            token__token=resp.data['tokens']['refresh']).exists())


class PasswordResetTests(APITestCase):

    def setUp(self):
        cache.clear()
        self.user = _make_user()
        self.uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.token = default_token_generator.make_token(self.user)

    def _confirm(self, new_password: str):
        return self.client.post(f'{AUTH}/password-reset/confirm/', {
            'uid': self.uid, 'token': self.token, 'new_password': new_password,
        }, format='json')

    def test_weak_password_rejected_with_django_validators(self):
        resp = self._confirm('12345678')  # 8 caractères mais numérique et courant
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(resp.json()['new_password'])
        # L'app mobile classe l'erreur « mot de passe faible » sur ce mot.
        self.assertIn('caractères', resp.json()['error'])
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))

    def test_reset_revokes_sessions_and_lifts_lockout(self):
        old_session = RefreshToken.for_user(self.user)
        for _ in range(5):
            self.client.post(f'{AUTH}/login/', {'email': 'secu@test.tn', 'password': 'x'}, format='json')
        resp = self._confirm('Nouveau-Mot-2026!')
        self.assertEqual(resp.status_code, 200)
        refresh = self.client.post(f'{AUTH}/token/refresh/', {'refresh': str(old_session)}, format='json')
        self.assertEqual(refresh.status_code, 401)
        login = self.client.post(f'{AUTH}/login/', {'email': 'secu@test.tn', 'password': 'Nouveau-Mot-2026!'},
                                 format='json')
        self.assertEqual(login.status_code, 200)

    def test_reset_request_does_not_log_the_link(self):
        with self.assertLogs('transporti', level='INFO') as logs:
            self.client.post(f'{AUTH}/password-reset/', {'email': 'secu@test.tn'}, format='json')
        joined = '\n'.join(logs.output)
        self.assertIn(f'user_id={self.user.id}', joined)
        self.assertNotIn('token=', joined)
        self.assertNotIn('reset-password', joined)
        self.assertNotIn('secu@test.tn', joined)

    def test_reset_request_is_throttled(self):
        codes = [
            self.client.post(f'{AUTH}/password-reset/', {'email': 'nobody@test.tn'}, format='json').status_code
            for _ in range(11)
        ]
        self.assertEqual(codes[:10], [200] * 10)
        self.assertEqual(codes[10], 429)


def _png_bytes() -> bytes:
    buffer = BytesIO()
    Image.new('RGBA', (900, 600), (255, 0, 0, 128)).save(buffer, format='PNG')
    return buffer.getvalue()


class AvatarReencodingTests(APITestCase):

    def setUp(self):
        cache.clear()
        self.user = _make_user()
        self.client.force_authenticate(user=self.user)

    def test_html_disguised_as_jpeg_is_rejected(self):
        evil = SimpleUploadedFile('x.html', b'<html><script>alert(1)</script></html>', content_type='image/jpeg')
        resp = self.client.post(f'{AUTH}/avatar/', {'avatar': evil}, format='multipart')
        self.assertEqual(resp.status_code, 400)

    def test_avatar_is_reencoded_as_jpeg_with_random_name(self):
        upload = SimpleUploadedFile('mon visage.png', _png_bytes(), content_type='image/png')
        resp = self.client.post(f'{AUTH}/avatar/', {'avatar': upload}, format='multipart')
        self.assertEqual(resp.status_code, 200)
        self.user.profile.refresh_from_db()
        name = self.user.profile.avatar.name
        self.assertTrue(name.endswith('.jpg'), name)
        self.assertNotIn('visage', name)
        with self.user.profile.avatar.open('rb') as stored:
            img = Image.open(stored)
            self.assertEqual(img.format, 'JPEG')
            self.assertLessEqual(max(img.size), 512)
        self.user.profile.avatar.delete(save=False)
