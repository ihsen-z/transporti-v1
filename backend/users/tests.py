"""
Users Module Tests — Sprint D Fondamentaux
Tests registration, login, and profile endpoints via DRF APITestCase.
Strictly additive: fills the empty tests.py stub.
"""
from django.test import TestCase, override_settings
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


class UserModelTests(TestCase):
    """Model-level tests for the User model."""

    def test_create_client_user(self):
        """Creating a CLIENT user sets correct defaults."""
        user = User.objects.create_user(
            username='testclient',
            email='client@test.tn',
            password='SecurePass123!',
            role='CLIENT',
        )
        self.assertEqual(user.role, 'CLIENT')
        self.assertEqual(user.email, 'client@test.tn')
        self.assertFalse(user.is_phone_verified)
        self.assertIsNotNone(user.created_at)

    def test_create_transporter_user(self):
        """Creating a TRANSPORTER user sets role correctly."""
        user = User.objects.create_user(
            username='testtransporter',
            email='transporter@test.tn',
            password='SecurePass123!',
            role='TRANSPORTER',
        )
        self.assertEqual(user.role, 'TRANSPORTER')

    def test_default_role_is_client(self):
        """Default role should be CLIENT."""
        user = User.objects.create_user(
            username='defaultrole',
            email='default@test.tn',
            password='SecurePass123!',
        )
        self.assertEqual(user.role, 'CLIENT')

    def test_email_is_unique(self):
        """Duplicate emails raise IntegrityError."""
        User.objects.create_user(
            username='user1',
            email='dupe@test.tn',
            password='SecurePass123!',
        )
        with self.assertRaises(Exception):
            User.objects.create_user(
                username='user2',
                email='dupe@test.tn',
                password='SecurePass123!',
            )

    def test_is_online_false_by_default(self):
        """New user has no last_seen_at, so is_online is False."""
        user = User.objects.create_user(
            username='offlineuser',
            email='offline@test.tn',
            password='SecurePass123!',
        )
        self.assertFalse(user.is_online)

    def test_str_returns_email(self):
        """User __str__ returns email."""
        user = User.objects.create_user(
            username='struser',
            email='str@test.tn',
            password='SecurePass123!',
        )
        self.assertEqual(str(user), 'str@test.tn')


class AuthAuditModelTests(TestCase):
    """Model-level tests for the AuthAudit model."""

    def test_create_audit_entry(self):
        """Can create an audit log entry."""
        from users.models import AuthAudit
        user = User.objects.create_user(
            username='audituser',
            email='audit@test.tn',
            password='SecurePass123!',
        )
        entry = AuthAudit.objects.create(
            user=user,
            action='LOGIN',
            ip_address='127.0.0.1',
        )
        self.assertEqual(entry.action, 'LOGIN')
        self.assertIsNotNone(entry.timestamp)

    def test_audit_is_append_only(self):
        """Modifying an existing audit entry raises ValueError."""
        from users.models import AuthAudit
        user = User.objects.create_user(
            username='appendonly',
            email='append@test.tn',
            password='SecurePass123!',
        )
        entry = AuthAudit.objects.create(
            user=user,
            action='LOGIN',
        )
        entry.action = 'LOGOUT'
        with self.assertRaises(ValueError):
            entry.save()


@override_settings(REST_FRAMEWORK={'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}})
class RegisterAPITests(APITestCase):
    """API tests for POST /api/auth/register/."""

    REGISTER_URL = '/api/auth/register/'

    def setUp(self):
        # L'endpoint d'inscription est protégé par AuthRateThrottle, dont
        # l'historique vit dans le cache. Sans reset, les appels cumulés des
        # tests précédents déclenchent des 429 en cascade (échecs parasites,
        # pas un vrai bug). On repart d'un budget propre à chaque test.
        from django.core.cache import cache
        cache.clear()

    def _valid_payload(self, **overrides):
        """Helper to build a valid registration payload."""
        payload = {
            'email': 'newuser@test.tn',
            'phone': '+21612345678',
            'password': 'TransportiSecure1!',
            'password_confirm': 'TransportiSecure1!',
            'role': 'CLIENT',
            'first_name': 'Ahmed',
            'last_name': 'Ben Ali',
        }
        payload.update(overrides)
        return payload

    def test_register_client_success(self):
        """Valid CLIENT registration returns 201 + tokens."""
        resp = self.client.post(self.REGISTER_URL, self._valid_payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', resp.data)
        self.assertIn('access', resp.data['tokens'])
        self.assertIn('refresh', resp.data['tokens'])
        self.assertEqual(resp.data['user']['role'], 'CLIENT')

    def test_register_username_collision_resolved(self):
        """I1 (L5) — deux emails de même partie locale s'inscrivent tous deux
        (usernames distincts), sans 500."""
        r1 = self.client.post(
            self.REGISTER_URL,
            self._valid_payload(email='ahmed@gmail.com', phone='+21611111111'),
            format='json',
        )
        r2 = self.client.post(
            self.REGISTER_URL,
            self._valid_payload(email='ahmed@yahoo.fr', phone='+21622222222'),
            format='json',
        )
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)
        from django.contrib.auth import get_user_model
        U = get_user_model()
        self.assertNotEqual(
            U.objects.get(email='ahmed@gmail.com').username,
            U.objects.get(email='ahmed@yahoo.fr').username,
        )

    def test_register_transporter_success(self):
        """Valid TRANSPORTER registration returns 201 and creates TrustProfile."""
        resp = self.client.post(
            self.REGISTER_URL,
            self._valid_payload(
                email='transporter@test.tn',
                role='TRANSPORTER',
            ),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['user']['role'], 'TRANSPORTER')
        # TrustProfile should have been auto-created
        user = User.objects.get(email='transporter@test.tn')
        self.assertTrue(hasattr(user, 'trust_profile'))

    def test_register_password_mismatch(self):
        """Mismatched passwords return 400."""
        resp = self.client.post(
            self.REGISTER_URL,
            self._valid_payload(password_confirm='WrongPass1!'),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email(self):
        """Registering with existing email returns 400."""
        self.client.post(self.REGISTER_URL, self._valid_payload(), format='json')
        resp = self.client.post(
            self.REGISTER_URL,
            self._valid_payload(phone='+21699999999'),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_first_name(self):
        """Missing first_name returns 400."""
        payload = self._valid_payload()
        del payload['first_name']
        resp = self.client.post(self.REGISTER_URL, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class LoginAPITests(APITestCase):
    """API tests for POST /api/auth/login/."""

    LOGIN_URL = '/api/auth/login/'

    def setUp(self):
        self.user = User.objects.create_user(
            username='loginuser',
            email='login@test.tn',
            password='SecurePass123!',
            role='CLIENT',
            first_name='Test',
            last_name='User',
        )

    def test_login_success(self):
        """Valid credentials return 200 + JWT tokens."""
        resp = self.client.post(
            self.LOGIN_URL,
            {'email': 'login@test.tn', 'password': 'SecurePass123!'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', resp.data)
        self.assertIn('access', resp.data['tokens'])
        self.assertIn('refresh', resp.data['tokens'])

    def test_login_wrong_password(self):
        """Wrong password returns 400."""
        resp = self.client.post(
            self.LOGIN_URL,
            {'email': 'login@test.tn', 'password': 'WrongPass1!'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_nonexistent_email(self):
        """Non-existent email returns 400."""
        resp = self.client.post(
            self.LOGIN_URL,
            {'email': 'nobody@test.tn', 'password': 'Whatever1!'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_inactive_user(self):
        """Inactive user cannot login."""
        self.user.is_active = False
        self.user.save()
        resp = self.client.post(
            self.LOGIN_URL,
            {'email': 'login@test.tn', 'password': 'SecurePass123!'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class ProfileAPITests(APITestCase):
    """API tests for GET/PUT /api/auth/profile/."""

    PROFILE_URL = '/api/auth/profile/'

    def setUp(self):
        self.user = User.objects.create_user(
            username='profileuser',
            email='profile@test.tn',
            password='SecurePass123!',
            role='CLIENT',
            first_name='Profile',
            last_name='Test',
        )
        # Auto-create profile
        from users.models import Profile
        Profile.objects.get_or_create(user=self.user)

    def _get_token(self):
        """Helper to get JWT access token."""
        resp = self.client.post(
            '/api/auth/login/',
            {'email': 'profile@test.tn', 'password': 'SecurePass123!'},
            format='json',
        )
        return resp.data['tokens']['access']

    def test_profile_get_authenticated(self):
        """Authenticated user can GET their profile."""
        token = self._get_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = self.client.get(self.PROFILE_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # ProfileView wraps response in {'user': {...}}
        user_data = resp.data.get('user', resp.data)
        self.assertEqual(user_data['email'], 'profile@test.tn')

    def test_profile_get_unauthenticated(self):
        """Unauthenticated GET /profile/ returns 401."""
        resp = self.client.get(self.PROFILE_URL)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_update(self):
        """Authenticated user can PUT to update profile."""
        token = self._get_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = self.client.put(
            self.PROFILE_URL,
            {
                'first_name': 'Updated',
                'last_name': 'Name',
                'phone': '+21650000000',
                'profile': {
                    'bio': 'Test bio',
                    'language_pref': 'ar',
                },
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Updated')
