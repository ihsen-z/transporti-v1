"""
Réinitialisation de mot de passe et avertissement par l'admin : les e-mails
partent vraiment (les deux fonctions n'existaient pas), et le mot de passe
temporaire ne sort jamais dans la réponse hors DEBUG.
"""
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from rest_framework.test import APITestCase

from notifications.models import Notification

User = get_user_model()


@override_settings(
    REST_FRAMEWORK={'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}},
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
)
class EmailsAdminTests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username='ae_admin', email='aeadmin@test.tn', password='SecurePass123!', role='ADMIN')
        self.user = User.objects.create_user(
            username='ae_user', email='aeuser@test.tn', password='SecurePass123!',
            role='CLIENT', first_name='Amine')
        self.client.force_authenticate(self.admin)

    @override_settings(DEBUG=False)
    def test_reset_envoie_le_mot_de_passe_par_mail_et_pas_dans_la_reponse(self):
        r = self.client.post(f'/api/admin/users/{self.user.id}/reset-password/', {}, format='json')

        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(r.data['emailSent'])
        self.assertNotIn('temporaryPassword', r.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['aeuser@test.tn'])

        # Le mot de passe du mail est bien celui qui ouvre le compte.
        ligne = [l for l in mail.outbox[0].body.splitlines() if 'Mot de passe temporaire' in l][0]
        temporaire = ligne.split(':', 1)[1].strip()
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(temporaire))

    def test_avertissement_mail_et_notification(self):
        r = self.client.post(f'/api/admin/users/{self.user.id}/warn/',
                             {'reason': 'Propos insultants'}, format='json')

        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(r.data['emailSent'])
        self.assertTrue(r.data['notificationSent'])
        self.assertIn('Propos insultants', mail.outbox[0].body)
        self.assertTrue(Notification.objects.filter(user=self.user, metadata__event='ADMIN_WARNING').exists())
