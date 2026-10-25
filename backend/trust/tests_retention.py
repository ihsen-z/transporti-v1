"""
Conservation des pièces KYC : 5 ans après la fin de validité (trust/retention.py).

Ce que ces tests protègent : une pièce d'identité est la donnée la plus
sensible de la plateforme. La supprimer trop tôt casse un litige ou un
contrôle ; la garder sans fin viole la loi 2004-63. Le fichier et la ligne
doivent partir ensemble, et seulement passé le délai.
"""
import shutil
import tempfile
from datetime import date
from io import StringIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings

from trust.models import TrustProfile, VerificationDocument
from trust.retention import purge_cutoff, purge_expired_kyc_documents, retention_ends_on

User = get_user_model()

AUJOURDHUI = date(2031, 6, 15)


class DatesDeConservationTests(TestCase):

    def test_la_conservation_court_cinq_ans_apres_l_expiration(self):
        self.assertEqual(retention_ends_on(date(2026, 3, 1)), date(2031, 3, 1))

    def test_un_29_fevrier_tombe_au_28(self):
        self.assertEqual(retention_ends_on(date(2028, 2, 29)), date(2033, 2, 28))

    def test_la_date_de_coupure_est_cinq_ans_en_arriere(self):
        self.assertEqual(purge_cutoff(AUJOURDHUI), date(2026, 6, 15))


class PurgeDesPiecesTests(TestCase):

    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        reglage = override_settings(MEDIA_ROOT=self.media)
        reglage.enable()
        self.addCleanup(reglage.disable)

        user = User.objects.create_user(
            username='kyc@test.tn', email='kyc@test.tn', password='x', role='TRANSPORTER',
        )
        self.profil = TrustProfile.objects.create(user=user)

    def _piece(self, document_type, expires_at, nom):
        """Une pièce en base ET son fichier sur disque, comme à l'envoi."""
        s3_key = f'verification_docs/{self.profil.user_id}/{nom}'
        chemin = Path(self.media) / s3_key
        chemin.parent.mkdir(parents=True, exist_ok=True)
        chemin.write_bytes(b'piece')
        document = VerificationDocument.objects.create(
            profile=self.profil, document_type=document_type, s3_key=s3_key,
            encryption_iv='0' * 32, file_hash='0' * 64, expires_at=expires_at,
        )
        return document, chemin

    def test_supprime_fichier_et_ligne_passe_le_delai(self):
        # Expiré le 14/06/2026 : 5 ans plus tard, au 15/06/2031, c'est fini.
        document, chemin = self._piece('LICENSE_FRONT', date(2026, 6, 14), 'permis.png')

        self.assertEqual(purge_expired_kyc_documents(today=AUJOURDHUI), 1)

        self.assertFalse(VerificationDocument.objects.filter(id=document.id).exists())
        self.assertFalse(chemin.exists())

    def test_garde_une_piece_encore_dans_son_delai(self):
        # Expiré le jour même de la coupure : il reste dans ses 5 ans.
        document, chemin = self._piece('INSURANCE_FRONT', date(2026, 6, 15), 'assurance.png')

        self.assertEqual(purge_expired_kyc_documents(today=AUJOURDHUI), 0)

        self.assertTrue(VerificationDocument.objects.filter(id=document.id).exists())
        self.assertTrue(chemin.exists())

    def test_garde_les_pieces_sans_date(self):
        # CIN et selfie n'ont pas de date de validité : la règle ne leur
        # donne pas de point de départ, elles ne sont pas touchées.
        document, chemin = self._piece('CIN_FRONT', None, 'cin.png')

        self.assertEqual(purge_expired_kyc_documents(today=AUJOURDHUI), 0)

        self.assertTrue(VerificationDocument.objects.filter(id=document.id).exists())
        self.assertTrue(chemin.exists())

    def test_le_mode_essai_ne_supprime_rien(self):
        document, chemin = self._piece('CARTE_GRISE_FRONT', date(2020, 1, 1), 'cg.png')

        self.assertEqual(purge_expired_kyc_documents(today=AUJOURDHUI, dry_run=True), 1)

        self.assertTrue(VerificationDocument.objects.filter(id=document.id).exists())
        self.assertTrue(chemin.exists())

    def test_ne_touche_jamais_un_fichier_hors_du_dossier_kyc(self):
        # Une clé corrompue qui pointerait ailleurs : le fichier visé n'est
        # pas effacé, mais la ligne périmée part quand même.
        hors_dossier = Path(self.media) / 'autre.txt'
        hors_dossier.write_bytes(b'ne pas effacer')
        VerificationDocument.objects.create(
            profile=self.profil, document_type='LICENSE_FRONT', s3_key='autre.txt',
            encryption_iv='0' * 32, file_hash='0' * 64, expires_at=date(2020, 1, 1),
        )

        purge_expired_kyc_documents(today=AUJOURDHUI)

        self.assertTrue(hors_dossier.exists())
        self.assertFalse(VerificationDocument.objects.exists())

    def test_tolere_un_fichier_deja_absent(self):
        document, chemin = self._piece('LICENSE_BACK', date(2020, 1, 1), 'deja.png')
        chemin.unlink()

        self.assertEqual(purge_expired_kyc_documents(today=AUJOURDHUI), 1)
        self.assertFalse(VerificationDocument.objects.filter(id=document.id).exists())

    def test_la_commande_planifiee_existe_et_supprime(self):
        self._piece('LICENSE_FRONT', date(2015, 1, 1), 'vieux.png')
        sortie = StringIO()

        call_command('purge_kyc_documents', stdout=sortie)

        self.assertIn('1 pièce(s) KYC supprimées', sortie.getvalue())
        self.assertFalse(VerificationDocument.objects.exists())
