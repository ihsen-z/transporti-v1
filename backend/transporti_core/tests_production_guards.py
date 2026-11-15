"""
Gardes de démarrage en production (transporti_core/production_guards.py) et
seuil de longueur de SECRET_KEY (security_validator.py).
"""
import os
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

from django.test import SimpleTestCase

from transporti_core.production_guards import (
    GUIDE,
    ProductionConfigError,
    check_production_environment,
    normalize_origins,
)
from transporti_core.security_validator import SecurityBootError, validate_production_security

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Environnement de production complet et plausible (valeurs factices).
ENV_COMPLET = {
    'DATABASE_URL': 'postgresql://u:p@ep-x-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    'FRONTEND_URL': 'https://transporti.netlify.app',
    'AWS_STORAGE_BUCKET_NAME': 'transporti-media',
    'AWS_ACCESS_KEY_ID': '003abcdef0000000000000001',
    'AWS_SECRET_ACCESS_KEY': 'K003abcdefghijklmnopqrstuvwxyz0123',
    'AWS_S3_ENDPOINT_URL': 'https://s3.eu-central-003.backblazeb2.com',
    'AWS_S3_REGION_NAME': 'eu-central-003',
    'EMAIL_BACKEND': 'django.core.mail.backends.smtp.EmailBackend',
}


class GardesProductionTests(SimpleTestCase):

    def test_environnement_complet_accepte(self):
        check_production_environment(ENV_COMPLET)

    def test_chaque_variable_manquante_est_nommee(self):
        for variable in ENV_COMPLET:
            with self.subTest(variable=variable):
                env = dict(ENV_COMPLET, **{variable: ''})
                with self.assertRaises(ProductionConfigError) as ctx:
                    check_production_environment(env)
                self.assertIn(variable, str(ctx.exception))
                self.assertIn(GUIDE, str(ctx.exception))

    def test_db_url_override_suffit(self):
        env = dict(ENV_COMPLET, DATABASE_URL='', DB_URL_OVERRIDE='postgresql://x/y')
        check_production_environment(env)

    def test_frontend_en_localhost_refuse(self):
        env = dict(ENV_COMPLET, FRONTEND_URL='http://localhost:3000')
        with self.assertRaisesMessage(ProductionConfigError, 'FRONTEND_URL'):
            check_production_environment(env)

    def test_stockage_ephemere_seulement_sur_demande_explicite(self):
        sans_stockage = {k: v for k, v in ENV_COMPLET.items() if not k.startswith('AWS_')}
        with self.assertRaises(ProductionConfigError):
            check_production_environment(sans_stockage)
        check_production_environment(dict(sans_stockage, ALLOW_EPHEMERAL_MEDIA='1'))

    def test_origines_cors_normalisees(self):
        self.assertEqual(
            normalize_origins(' https://a.netlify.app/ ,https://b.tn,, '),
            ['https://a.netlify.app', 'https://b.tn'],
        )


class SeuilSecretKeyTests(SimpleTestCase):

    def _config(self, key):
        return SimpleNamespace(SECRET_KEY=key, DEBUG=False, ALLOWED_HOSTS=['x.tn'],
                               JWT_SECRET_KEY='autre', SIMPLE_JWT={})

    def test_cle_render_de_44_caracteres_acceptee(self):
        validate_production_security(self._config('aB3' * 14 + 'xy'))  # 44 caractères

    def test_cle_trop_courte_refusee(self):
        with self.assertRaises(SecurityBootError):
            validate_production_security(self._config('aB3' * 10))  # 30 caractères


class DemarrageProductionSimuleTests(SimpleTestCase):
    """
    `manage.py check` lancé dans un processus neuf avec ENV=production :
    il passe avec toutes les variables et échoue proprement sans l'une d'elles.
    """

    def _lancer(self, env_extra):
        env = {k: v for k, v in os.environ.items()
               if k not in ENV_COMPLET and k not in ('DB_URL_OVERRIDE', 'ALLOW_EPHEMERAL_MEDIA')}
        env.update({
            'ENV': 'production', 'DEBUG': 'False',
            'DJANGO_SETTINGS_MODULE': 'transporti_core.settings',
            'SECRET_KEY': 'Zx9' * 14 + 'Qw',      # 44 caractères, comme Render
            'JWT_SECRET_KEY': 'Jk7' * 14 + 'Er',
            'ALLOWED_HOSTS': 'transporti-v1.onrender.com',
            'PAYMENT_GATEWAY': 'DISABLED',
            'PYTHONUTF8': '1',
        })
        env.update(env_extra)
        return subprocess.run(
            [sys.executable, 'manage.py', 'check'], cwd=BACKEND_DIR, env=env,
            capture_output=True, text=True, encoding='utf-8', timeout=120,
        )

    def test_demarre_avec_toutes_les_variables(self):
        resultat = self._lancer(ENV_COMPLET)
        self.assertEqual(resultat.returncode, 0, resultat.stderr[-2000:])

    def test_refuse_sans_database_url_en_nommant_la_variable(self):
        resultat = self._lancer(dict(ENV_COMPLET, DATABASE_URL=''))
        self.assertNotEqual(resultat.returncode, 0)
        self.assertIn('DATABASE_URL', resultat.stderr)
        self.assertIn(GUIDE, resultat.stderr)

    def test_render_sans_env_est_la_production(self):
        # Render pose RENDER=true ; ENV absent ne doit plus ouvrir le mode dev.
        env = dict(ENV_COMPLET, DATABASE_URL='', RENDER='true')
        resultat = self._lancer_sans_env(env)
        self.assertNotEqual(resultat.returncode, 0)
        self.assertIn('DATABASE_URL', resultat.stderr)

    def test_render_sans_env_demarre_avec_toutes_les_variables(self):
        resultat = self._lancer_sans_env(dict(ENV_COMPLET, RENDER='true'))
        self.assertEqual(resultat.returncode, 0, resultat.stderr[-2000:])

    def test_refuse_le_backend_console_en_nommant_la_variable(self):
        resultat = self._lancer(dict(
            ENV_COMPLET, EMAIL_BACKEND='django.core.mail.backends.console.EmailBackend'))
        self.assertNotEqual(resultat.returncode, 0)
        self.assertIn('EMAIL_BACKEND', resultat.stderr)
        self.assertIn(GUIDE, resultat.stderr)

    def _lancer_sans_env(self, env_extra):
        """Comme _lancer, mais sans ENV ni DJANGO_ENV (cas Render mal réglé)."""
        saved = {k: os.environ.pop(k) for k in ('ENV', 'DJANGO_ENV') if k in os.environ}
        try:
            env = {k: v for k, v in os.environ.items()
                   if k not in ENV_COMPLET and k not in ('DB_URL_OVERRIDE', 'ALLOW_EPHEMERAL_MEDIA')}
            env.update({
                'DEBUG': 'False',
                'DJANGO_SETTINGS_MODULE': 'transporti_core.settings',
                'SECRET_KEY': 'Zx9' * 14 + 'Qw',
                'JWT_SECRET_KEY': 'Jk7' * 14 + 'Er',
                'ALLOWED_HOSTS': 'transporti-v1.onrender.com',
                'PAYMENT_GATEWAY': 'DISABLED',
                'PYTHONUTF8': '1',
            })
            env.update(env_extra)
            return subprocess.run(
                [sys.executable, 'manage.py', 'check'], cwd=BACKEND_DIR, env=env,
                capture_output=True, text=True, encoding='utf-8', timeout=120,
            )
        finally:
            os.environ.update(saved)


class GardeEmailTests(SimpleTestCase):

    def test_backends_de_developpement_refuses(self):
        for backend in ('', 'django.core.mail.backends.console.EmailBackend',
                        'django.core.mail.backends.filebased.EmailBackend',
                        'django.core.mail.backends.locmem.EmailBackend'):
            with self.subTest(backend=backend):
                with self.assertRaises(ProductionConfigError) as ctx:
                    check_production_environment(dict(ENV_COMPLET, EMAIL_BACKEND=backend))
                self.assertIn('EMAIL_BACKEND', str(ctx.exception))


class EnvParDefautTests(SimpleTestCase):

    def test_sans_render_ni_env_le_poste_local_reste_en_developpement(self):
        env = {k: v for k, v in os.environ.items() if k not in ('ENV', 'DJANGO_ENV', 'RENDER')}
        env.update({'PYTHONUTF8': '1', 'DJANGO_SETTINGS_MODULE': 'transporti_core.settings'})
        code = "from django.conf import settings; print(settings.IS_PRODUCTION, settings.ENV)"
        resultat = subprocess.run(
            [sys.executable, '-c', 'import django; django.setup(); ' + code],
            cwd=BACKEND_DIR, env=env, capture_output=True, text=True, encoding='utf-8', timeout=120)
        self.assertEqual(resultat.stdout.strip(), 'False development', resultat.stderr[-1500:])

    def test_env_test_de_la_ci_reste_hors_production(self):
        env = {k: v for k, v in os.environ.items() if k not in ('DJANGO_ENV', 'RENDER')}
        env.update({'ENV': 'test', 'PYTHONUTF8': '1', 'DJANGO_SETTINGS_MODULE': 'transporti_core.settings'})
        code = "from django.conf import settings; print(settings.IS_PRODUCTION, settings.ENV)"
        resultat = subprocess.run(
            [sys.executable, '-c', 'import django; django.setup(); ' + code],
            cwd=BACKEND_DIR, env=env, capture_output=True, text=True, encoding='utf-8', timeout=120)
        self.assertEqual(resultat.stdout.strip(), 'False test', resultat.stderr[-1500:])
