"""
Contre-audit (users) : verrouillage de connexion, sessions, changement de
rôle social, changement de mot de passe, adresse du client.
"""
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import RequestFactory, SimpleTestCase, override_settings
from django.utils import timezone
from rest_framework.settings import api_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
AUTH = '/api/auth'
PASSWORD = 'SecurePass123!'
SANS_LIMITEUR = {
    **settings.REST_FRAMEWORK,
    'DEFAULT_THROTTLE_CLASSES': [],
    'DEFAULT_THROTTLE_RATES': {k: '1000/minute' for k in (
        'auth', 'admin_auth', 'messaging', 'booking', 'payment', 'admin_action', 'anon', 'user')},
    'NUM_PROXIES': 1,
}


def _user(email, role='CLIENT', **kw):
    return User.objects.create_user(username=email, email=email, password=PASSWORD, role=role, **kw)


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR)
class VerrouParAdresseTests(APITestCase):
    """5 échecs anonymes ne bloquent plus le compte d'un autre, admin compris."""

    def setUp(self):
        cache.clear()
        api_settings.reload()
        self.addCleanup(api_settings.reload)
        _user('boss@t.tn', 'ADMIN', is_staff=True)

    def _post(self, url, email, password, ip):
        return self.client.post(url, {'email': email, 'password': password}, format='json',
                                HTTP_X_FORWARDED_FOR=ip)

    def test_attaquant_ne_bloque_que_sa_propre_adresse(self):
        for _ in range(5):
            self._post(f'{AUTH}/login/', 'BOSS@t.tn ', 'faux', '6.6.6.6')
        # L'attaquant est bloqué...
        self.assertEqual(self._post(f'{AUTH}/login/', 'boss@t.tn', PASSWORD, '6.6.6.6').status_code, 429)
        # ... le vrai titulaire, depuis son adresse, se connecte.
        self.assertEqual(self._post(f'{AUTH}/login/', 'boss@t.tn', PASSWORD, '203.0.113.9').status_code, 200)
        # Et le back-office a son propre compteur : pas bloqué par /auth/login.
        r = self._post(f'{AUTH}/admin/login/', 'boss@t.tn', PASSWORD, '6.6.6.6')
        self.assertEqual(r.status_code, 200, r.data)

    def test_le_verrou_admin_reste_actif_pour_l_adresse_fautive(self):
        for _ in range(5):
            self._post(f'{AUTH}/admin/login/', 'boss@t.tn', 'faux', '6.6.6.6')
        self.assertEqual(self._post(f'{AUTH}/admin/login/', 'boss@t.tn', PASSWORD, '6.6.6.6').status_code, 400)
        self.assertEqual(self._post(f'{AUTH}/admin/login/', 'boss@t.tn', PASSWORD, '198.51.100.4').status_code, 200)

    def test_falsifier_x_forwarded_for_ne_change_pas_d_adresse(self):
        # NUM_PROXIES=1 : seule la DERNIÈRE entrée (ajoutée par Render) compte.
        for i in range(5):
            self._post(f'{AUTH}/login/', 'boss@t.tn', 'faux', f'10.0.0.{i}, 6.6.6.6')
        r = self._post(f'{AUTH}/login/', 'boss@t.tn', PASSWORD, '1.2.3.4, 6.6.6.6')
        self.assertEqual(r.status_code, 429)

    def test_increment_atomique(self):
        from users import login_lockout
        for attendu in range(1, 4):
            self.assertEqual(login_lockout.record_failure('user', 'x@t.tn', '1.1.1.1'), attendu)


class AdresseClientTests(SimpleTestCase):
    """Un seul helper : même règle que DRF avec NUM_PROXIES."""

    def test_meme_adresse_que_drf(self):
        from rest_framework.throttling import AnonRateThrottle

        from admin_audit.services import get_client_ip as ip_audit
        from transporti_core.client_ip import get_client_ip
        from trust.views_admin import get_client_ip as ip_trust
        from users.views_admin_auth import get_client_ip as ip_admin

        rf = RequestFactory()
        with self.settings(REST_FRAMEWORK={**settings.REST_FRAMEWORK, 'NUM_PROXIES': 1}):
            api_settings.reload()
            try:
                for xff in ('6.6.6.6, 203.0.113.9', '6.6.6.6', '6.6.6.6, 198.51.100.7, 10.0.0.2'):
                    req = rf.get('/', HTTP_X_FORWARDED_FOR=xff, REMOTE_ADDR='10.0.0.1')
                    attendu = AnonRateThrottle().get_ident(req)
                    for helper in (get_client_ip, ip_audit, ip_trust, ip_admin):
                        self.assertEqual(helper(req), attendu, xff)
                # La première entrée, écrite par le client, n'est jamais retenue.
                req = rf.get('/', HTTP_X_FORWARDED_FOR='6.6.6.6, 203.0.113.9', REMOTE_ADDR='10.0.0.1')
                self.assertEqual(get_client_ip(req), '203.0.113.9')
            finally:
                api_settings.reload()


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR)
class SessionsTests(APITestCase):

    def setUp(self):
        cache.clear()

    def test_reinitialisation_par_l_admin_revoque_les_sessions(self):
        admin = _user('adm@t.tn', 'ADMIN', is_staff=True)
        cible = _user('cible@t.tn')
        session = RefreshToken.for_user(cible)
        self.client.force_authenticate(admin)
        r = self.client.post(f'/api/admin/users/{cible.id}/reset-password/')
        self.assertEqual(r.status_code, 200, r.data)
        self.client.force_authenticate(None)
        r = self.client.post(f'{AUTH}/token/refresh/', {'refresh': str(session)}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_rotation_d_un_jeton_admin_garde_la_duree_admin(self):
        from users.services_admin_auth import create_admin_tokens
        admin = _user('adm2@t.tn', 'ADMIN', is_staff=True)
        jetons = create_admin_tokens(admin, 'session-test')
        r = self.client.post(f'{AUTH}/token/refresh/', {'refresh': jetons['refresh_token']}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        nouveau = RefreshToken(r.data['refresh'])
        self.assertTrue(nouveau['is_admin'])
        reste = nouveau['exp'] - timezone.now().timestamp()
        self.assertLessEqual(reste, settings.ADMIN_REFRESH_TOKEN_LIFETIME.total_seconds() + 5)
        from rest_framework_simplejwt.tokens import AccessToken
        acces = AccessToken(r.data['access'])
        self.assertLessEqual(acces['exp'] - timezone.now().timestamp(),
                             settings.ADMIN_ACCESS_TOKEN_LIFETIME.total_seconds() + 5)
        # L'ancien jeton est sur liste noire.
        r = self.client.post(f'{AUTH}/token/refresh/', {'refresh': jetons['refresh_token']}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_rotation_d_un_jeton_utilisateur_inchangee(self):
        user = _user('u@t.tn')
        r = self.client.post(f'{AUTH}/token/refresh/', {'refresh': str(RefreshToken.for_user(user))}, format='json')
        self.assertEqual(r.status_code, 200)
        reste = RefreshToken(r.data['refresh'])['exp'] - timezone.now().timestamp()
        self.assertGreater(reste, timedelta(days=6).total_seconds())


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR)
class ChangementMotDePasseTests(APITestCase):

    def test_l_appareil_demandeur_recoit_une_nouvelle_paire(self):
        user = _user('cp@t.tn')
        ancienne = RefreshToken.for_user(user)
        self.client.force_authenticate(user)
        r = self.client.post(f'{AUTH}/change-password/', {
            'current_password': PASSWORD, 'new_password': 'Nouveau-Mot-2026!'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        # Même forme que la connexion : {"message", "tokens": {"access", "refresh"}}.
        self.assertEqual(set(r.data), {'message', 'tokens'})
        self.assertEqual(set(r.data['tokens']), {'access', 'refresh'})
        self.client.force_authenticate(None)
        # L'ancienne session tombe, la nouvelle paire fonctionne.
        r_old = self.client.post(f'{AUTH}/token/refresh/', {'refresh': str(ancienne)}, format='json')
        self.assertEqual(r_old.status_code, 401)
        r_new = self.client.post(f'{AUTH}/token/refresh/', {'refresh': r.data['tokens']['refresh']}, format='json')
        self.assertEqual(r_new.status_code, 200)


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR, GOOGLE_CLIENT_ID='', FACEBOOK_APP_ID='', FACEBOOK_APP_SECRET='')
class ChoixDuRoleSansFournisseurTests(APITestCase):

    def test_route_absente_sans_connexion_sociale(self):
        user = _user('pw@t.tn')
        self.client.force_authenticate(user)
        r = self.client.post(f'{AUTH}/social/set-role/', {'role': 'TRANSPORTER'}, format='json')
        self.assertEqual(r.status_code, 404)
        user.refresh_from_db()
        self.assertEqual(user.role, 'CLIENT')
