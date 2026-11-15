"""
entrypoint.sh : une configuration refusée (garde de production) arrête le
conteneur tout de suite, avec son propre message, sans 5 relances de migrate
ni le faux diagnostic « Vérifier DATABASE_URL ».

On remplace `python` par un faux exécutable qui journalise ses appels.
"""
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from django.test import SimpleTestCase

ENTRYPOINT = Path(__file__).resolve().parent.parent / 'entrypoint.sh'
SH = shutil.which('sh')

FAUX_PYTHON = '''#!/bin/sh
echo "$*" >> "$APPELS"
case "$2" in
  check) [ "$CHECK_OK" = "1" ] || { echo "CRITICAL: démarrage refusé en production — FRONTEND_URL est vide" >&2; exit 1; } ;;
  migrate) [ "$MIGRATE_OK" = "1" ] || exit 1 ;;
esac
exit 0
'''


@unittest.skipIf(SH is None, "sh introuvable")
class EntrypointTests(SimpleTestCase):

    def _lancer(self, check_ok: bool, migrate_ok: bool = True):
        dossier = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, dossier, True)
        faux = Path(dossier) / 'python'
        faux.write_text(FAUX_PYTHON, encoding='utf-8', newline='\n')
        faux.chmod(0o755)
        appels = Path(dossier) / 'appels.txt'
        appels.write_text('', encoding='utf-8')
        env = dict(os.environ, PATH=dossier + os.pathsep + os.environ.get('PATH', ''),
                   APPELS=str(appels), CHECK_OK='1' if check_ok else '0',
                   MIGRATE_OK='1' if migrate_ok else '0')
        resultat = subprocess.run([SH, str(ENTRYPOINT), 'true'], env=env, capture_output=True,
                                  text=True, encoding='utf-8', timeout=60)
        return resultat, appels.read_text(encoding='utf-8')

    def test_configuration_refusee_arret_immediat_sans_migrate(self):
        resultat, appels = self._lancer(check_ok=False)
        self.assertNotEqual(resultat.returncode, 0)
        self.assertIn('FRONTEND_URL', resultat.stderr)
        self.assertNotIn('DATABASE_URL', resultat.stderr)
        self.assertEqual(appels.count('manage.py check'), 1)
        self.assertNotIn('migrate', appels)

    def test_configuration_valide_enchaine_les_etapes(self):
        resultat, appels = self._lancer(check_ok=True)
        self.assertEqual(resultat.returncode, 0, resultat.stderr)
        for etape in ('manage.py check', 'manage.py migrate', 'manage.py collectstatic', 'manage.py creer_admin'):
            self.assertIn(etape, appels)
