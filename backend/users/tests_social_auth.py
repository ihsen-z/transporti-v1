"""Correctif d'audit : connexion Google/Facebook fermée par défaut."""
from unittest import mock

import requests
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

User = get_user_model()
GOOGLE = '/api/v1/auth/social/google/'
FACEBOOK = '/api/v1/auth/social/facebook/'
TOKEN = {'access_token': 'ya29.token-de-test'}
PATCH = 'users.social_verification.http_requests.get'


def _resp(status_code: int, payload: dict) -> mock.Mock:
    r = mock.Mock()
    r.status_code = status_code
    r.json.return_value = payload
    return r


def _google(tokeninfo: mock.Mock, userinfo: mock.Mock):
    """Simule les deux appels Google selon l'URL demandée."""
    def fake_get(url, **kwargs):
        return tokeninfo if 'tokeninfo' in url else userinfo
    return fake_get


GOOD_TOKENINFO = _resp(200, {'aud': 'mon-client-id', 'azp': 'mon-client-id'})
GOOD_USERINFO = _resp(200, {'email': 'nouveau@test.tn', 'email_verified': True,
                            'given_name': 'Nour', 'family_name': 'Ben'})


class SocialAuthNotConfiguredTests(APITestCase):

    def setUp(self):
        cache.clear()

    @override_settings(GOOGLE_CLIENT_ID='')
    def test_google_route_is_404_when_not_configured(self):
        with mock.patch(PATCH) as get:
            resp = self.client.post(GOOGLE, TOKEN, format='json')
        self.assertEqual(resp.status_code, 404)
        get.assert_not_called()

    @override_settings(FACEBOOK_APP_ID='123', FACEBOOK_APP_SECRET='')
    def test_facebook_route_is_404_when_not_fully_configured(self):
        with mock.patch(PATCH) as get:
            resp = self.client.post(FACEBOOK, TOKEN, format='json')
        self.assertEqual(resp.status_code, 404)
        get.assert_not_called()


@override_settings(GOOGLE_CLIENT_ID='mon-client-id')
class GoogleVerificationTests(APITestCase):

    def setUp(self):
        cache.clear()

    def test_valid_token_creates_client(self):
        with mock.patch(PATCH, side_effect=_google(GOOD_TOKENINFO, GOOD_USERINFO)):
            resp = self.client.post(GOOGLE, TOKEN, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(User.objects.get(email='nouveau@test.tn').role, 'CLIENT')

    def test_tokeninfo_network_error_refuses(self):
        def fake_get(url, **kwargs):
            if 'tokeninfo' in url:
                raise requests.ConnectionError('boom')
            return GOOD_USERINFO
        with mock.patch(PATCH, side_effect=fake_get):
            resp = self.client.post(GOOGLE, TOKEN, format='json')
        self.assertEqual(resp.status_code, 502)
        self.assertFalse(User.objects.filter(email='nouveau@test.tn').exists())

    def test_tokeninfo_non_200_refuses(self):
        with mock.patch(PATCH, side_effect=_google(_resp(400, {}), GOOD_USERINFO)):
            resp = self.client.post(GOOGLE, TOKEN, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_wrong_audience_refuses(self):
        other = _resp(200, {'aud': 'autre-app', 'azp': 'autre-app'})
        with mock.patch(PATCH, side_effect=_google(other, GOOD_USERINFO)):
            resp = self.client.post(GOOGLE, TOKEN, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_missing_audience_refuses(self):
        with mock.patch(PATCH, side_effect=_google(_resp(200, {}), GOOD_USERINFO)):
            resp = self.client.post(GOOGLE, TOKEN, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_unverified_email_refuses(self):
        unverified = _resp(200, {'email': 'nouveau@test.tn', 'email_verified': False})
        with mock.patch(PATCH, side_effect=_google(GOOD_TOKENINFO, unverified)):
            resp = self.client.post(GOOGLE, TOKEN, format='json')
        self.assertEqual(resp.status_code, 401)
        self.assertFalse(User.objects.filter(email='nouveau@test.tn').exists())

    def test_admin_and_moderator_accounts_are_refused(self):
        for role in ('ADMIN', 'MODERATOR'):
            email = f'{role.lower()}@test.tn'
            User.objects.create_user(username=role, email=email, password='SecurePass123!', role=role)
            userinfo = _resp(200, {'email': email, 'email_verified': True})
            with mock.patch(PATCH, side_effect=_google(GOOD_TOKENINFO, userinfo)):
                resp = self.client.post(GOOGLE, TOKEN, format='json')
            self.assertEqual(resp.status_code, 403, role)
            self.assertNotIn('tokens', resp.data)

    def test_staff_account_is_refused(self):
        User.objects.create_user(username='staff', email='staff@test.tn', password='SecurePass123!',
                                 role='CLIENT', is_staff=True)
        userinfo = _resp(200, {'email': 'staff@test.tn', 'email_verified': True})
        with mock.patch(PATCH, side_effect=_google(GOOD_TOKENINFO, userinfo)):
            resp = self.client.post(GOOGLE, TOKEN, format='json')
        self.assertEqual(resp.status_code, 403)


@override_settings(FACEBOOK_APP_ID='123', FACEBOOK_APP_SECRET='secret')
class FacebookVerificationTests(APITestCase):

    def setUp(self):
        cache.clear()

    def _fb(self, debug: mock.Mock, me: mock.Mock):
        def fake_get(url, **kwargs):
            return debug if 'debug_token' in url else me
        return fake_get

    def test_valid_token_logs_in(self):
        debug = _resp(200, {'data': {'is_valid': True, 'app_id': '123'}})
        me = _resp(200, {'email': 'fb@test.tn', 'first_name': 'F'})
        with mock.patch(PATCH, side_effect=self._fb(debug, me)):
            resp = self.client.post(FACEBOOK, TOKEN, format='json')
        self.assertEqual(resp.status_code, 201)

    def test_debug_token_network_error_refuses(self):
        def fake_get(url, **kwargs):
            if 'debug_token' in url:
                raise requests.Timeout('lent')
            return _resp(200, {'email': 'fb@test.tn'})
        with mock.patch(PATCH, side_effect=fake_get):
            resp = self.client.post(FACEBOOK, TOKEN, format='json')
        self.assertEqual(resp.status_code, 502)
        self.assertFalse(User.objects.filter(email='fb@test.tn').exists())

    def test_debug_token_non_200_refuses(self):
        me = _resp(200, {'email': 'fb@test.tn'})
        with mock.patch(PATCH, side_effect=self._fb(_resp(500, {}), me)):
            resp = self.client.post(FACEBOOK, TOKEN, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_other_app_refuses(self):
        debug = _resp(200, {'data': {'is_valid': True, 'app_id': '999'}})
        me = _resp(200, {'email': 'fb@test.tn'})
        with mock.patch(PATCH, side_effect=self._fb(debug, me)):
            resp = self.client.post(FACEBOOK, TOKEN, format='json')
        self.assertEqual(resp.status_code, 401)
