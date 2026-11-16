"""
`manage.py creer_admin` : premier compte administrateur sans terminal.
"""
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

User = get_user_model()
MOT_DE_PASSE = 'Kamyoun-Sahel-4821!'


def lancer(**env):
    sortie = StringIO()
    with mock.patch.dict('os.environ', env, clear=False):
        call_command('creer_admin', stdout=sortie)
    return sortie.getvalue()


class CreerAdminTests(TestCase):

    def setUp(self):
        # Les variables du poste ne doivent pas fuiter dans le test.
        patcher = mock.patch.dict('os.environ', {'ADMIN_EMAIL': '', 'ADMIN_PASSWORD': ''})
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_sans_variables_rien_n_est_fait(self):
        sortie = lancer()
        self.assertIn('rien à faire', sortie)
        self.assertEqual(User.objects.count(), 0)

    def test_cree_un_vrai_admin_en_minuscules(self):
        sortie = lancer(ADMIN_EMAIL=' Fondateur@Transporti.TN ', ADMIN_PASSWORD=MOT_DE_PASSE)

        admin = User.objects.get()
        self.assertEqual(admin.email, 'fondateur@transporti.tn')
        self.assertEqual(admin.role, 'ADMIN')
        self.assertTrue(admin.is_staff and admin.is_superuser)
        self.assertTrue(admin.check_password(MOT_DE_PASSE))
        self.assertNotIn(MOT_DE_PASSE, sortie)

    def test_le_back_office_accepte_le_compte(self):
        lancer(ADMIN_EMAIL='fondateur@transporti.tn', ADMIN_PASSWORD=MOT_DE_PASSE)
        r = self.client.post('/api/auth/admin/login/',
                             {'email': 'fondateur@transporti.tn', 'password': MOT_DE_PASSE},
                             content_type='application/json')
        self.assertEqual(r.status_code, 200, r.content[:300])

    def test_mot_de_passe_faible_avertit_sans_bloquer_le_demarrage(self):
        erreurs = StringIO()
        with mock.patch.dict('os.environ', {'ADMIN_EMAIL': 'fondateur@transporti.tn',
                                            'ADMIN_PASSWORD': '12345678'}):
            # Aucune exception : entrypoint.sh (set -e) continue.
            call_command('creer_admin', stdout=StringIO(), stderr=erreurs)
        self.assertIn('ADMIN_PASSWORD refusé', erreurs.getvalue())
        self.assertNotIn('12345678', erreurs.getvalue())
        self.assertEqual(User.objects.count(), 0)

    def test_adresse_prise_par_un_non_admin_rien_n_est_modifie(self):
        # Un tiers s'est inscrit avec l'adresse avant le premier déploiement.
        tiers = User.objects.create_user(
            username='fondateur', email='fondateur@transporti.tn',
            password='MotDePasseDuTiers-2026', role='CLIENT')

        erreurs = StringIO()
        with mock.patch.dict('os.environ', {'ADMIN_EMAIL': 'Fondateur@Transporti.tn',
                                            'ADMIN_PASSWORD': MOT_DE_PASSE}):
            # Pas d'exception : le démarrage ne doit pas échouer.
            call_command('creer_admin', stdout=StringIO(), stderr=erreurs)

        tiers.refresh_from_db()
        self.assertEqual(tiers.role, 'CLIENT')
        self.assertFalse(tiers.is_staff or tiers.is_superuser)
        self.assertTrue(tiers.check_password('MotDePasseDuTiers-2026'))
        self.assertFalse(tiers.check_password(MOT_DE_PASSE))
        self.assertIn('NON administrateur', erreurs.getvalue())
        self.assertNotIn(MOT_DE_PASSE, erreurs.getvalue())
        self.assertEqual(User.objects.count(), 1)

        # Le tiers n'entre pas au back-office.
        r = self.client.post('/api/auth/admin/login/',
                             {'email': 'fondateur@transporti.tn', 'password': 'MotDePasseDuTiers-2026'},
                             content_type='application/json')
        self.assertNotEqual(r.status_code, 200)

    def test_admin_existant_rien_n_est_change(self):
        # Admin rétrogradé (is_superuser retiré) : pas de re-promotion.
        admin = User.objects.create_user(
            username='fondateur', email='fondateur@transporti.tn',
            password='MotDePasseChoisi-2026', role='ADMIN', is_staff=True, is_superuser=False)

        sortie = lancer(ADMIN_EMAIL='fondateur@transporti.tn', ADMIN_PASSWORD=MOT_DE_PASSE)

        admin.refresh_from_db()
        self.assertFalse(admin.is_superuser)
        self.assertTrue(admin.check_password('MotDePasseChoisi-2026'))
        self.assertIn('déjà administrateur', sortie)
