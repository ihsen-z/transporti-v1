"""
EMAIL_FAILED ne recopie plus l'exception : pour SMTPRecipientsRefused, son
texte contient l'adresse du destinataire (donnée personnelle dans les logs).
"""
import smtplib
from unittest import mock

from django.test import SimpleTestCase

from notifications.emails import send_transactional_email


class JournalEchecEmailTests(SimpleTestCase):

    def test_echec_journalise_le_type_seulement(self):
        refus = smtplib.SMTPRecipientsRefused({'victime@exemple.tn': (550, b'refus')})
        with mock.patch('notifications.emails.send_mail', side_effect=refus):
            with self.assertLogs('transporti', level='ERROR') as journal:
                envoye = send_transactional_email('welcome', recipient_email='victime@exemple.tn',
                                                  context={'user_name': 'X'})
        self.assertFalse(envoye)
        texte = '\n'.join(journal.output)
        self.assertIn('EMAIL_FAILED', texte)
        self.assertIn('SMTPRecipientsRefused', texte)
        self.assertNotIn('victime@exemple.tn', texte)
