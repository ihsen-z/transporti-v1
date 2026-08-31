"""
Les taux de commission ANNONCES au public correspondent a ceux PRELEVES.

La page publique « Devenir transporteur » affiche « 8 % sur un trajet retour ».
Elle ne peut pas les lire depuis l'API : aucun endpoint ne les expose, et la
page doit s'afficher sans authentification. Les valeurs sont donc recopiees
dans `frontend/lib/commissions.ts`, et cette recopie peut diverger.

Ce test lit ce fichier et echoue si une valeur ne correspond plus a
`settings.COMMISSION_RATES`.

Pourquoi cote backend et non cote front : c'est ici que vit la source de
verite, et un test front devrait la recopier a son tour — on aurait deplace le
probleme d'un cran. Le meme defaut nous a deja coute la grille tarifaire : le
repli `DEFAULT_GRIDS` de `logistics/pricing.py` etait reste sur l'ancien tarif
mutualise, et une simple desactivation en admin rendait au client un budget
quatre fois trop bas, en silence.

Une page publique qui annonce 8 % pendant que la plateforme preleve 12 % est
une promesse rompue, et rien dans l'interface ne le dirait.
"""
import re
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

# backend/payments/ -> backend/ -> racine du depot -> frontend/lib/
FICHIER_FRONT = (
    Path(__file__).resolve().parent.parent.parent / 'frontend' / 'lib' / 'commissions.ts'
)

# `RETURN_TRIP: 0.08,` — on capture le nom et la valeur.
MOTIF = re.compile(r'^\s*(?:/\*\*.*)?(\w+):\s*([0-9]*\.?[0-9]+),', re.MULTILINE)


class TauxAffichesTests(SimpleTestCase):
    def _taux_du_front(self):
        contenu = FICHIER_FRONT.read_text(encoding='utf-8')

        # On ne lit QUE le bloc de l'objet, pas tout le fichier : sinon un
        # nombre apparaissant dans un commentaire serait pris pour un taux.
        debut = contenu.index('TAUX_COMMISSION_AFFICHES = {')
        fin = contenu.index('} as const;', debut)
        bloc = contenu[debut:fin]

        return {nom: Decimal(valeur) for nom, valeur in MOTIF.findall(bloc)}

    def test_le_fichier_front_existe_et_est_lisible(self):
        """
        Si le fichier disparaissait ou changeait de forme, les tests suivants
        passeraient a vide sur un dictionnaire vide. On l'exclut d'abord.
        """
        self.assertTrue(
            FICHIER_FRONT.is_file(),
            f"{FICHIER_FRONT} est introuvable. Si le fichier a ete deplace, "
            f"mettre a jour ce test — ne pas le supprimer : c'est le seul "
            f"garde-fou entre les taux annonces et les taux preleves.",
        )
        self.assertGreaterEqual(len(self._taux_du_front()), 3)

    def test_chaque_taux_affiche_correspond_au_taux_preleve(self):
        affiches = self._taux_du_front()
        preleves = settings.COMMISSION_RATES

        for nom, valeur_affichee in affiches.items():
            with self.subTest(taux=nom):
                self.assertIn(
                    nom, preleves,
                    f"`{nom}` est annonce au public mais n'existe pas dans "
                    f"settings.COMMISSION_RATES.",
                )
                self.assertEqual(
                    valeur_affichee,
                    Decimal(str(preleves[nom])),
                    f"La page publique annonce {valeur_affichee} pour `{nom}`, "
                    f"la plateforme preleve {preleves[nom]}. Realigner "
                    f"frontend/lib/commissions.ts.",
                )

    def test_le_taux_retour_reste_le_plus_avantageux(self):
        """
        L'argument de la page est « la commission est plus basse sur un
        retour ». Si un jour RETURN_TRIP cessait d'etre le taux le plus bas,
        la page mentirait tout en affichant des chiffres exacts — un test de
        pure egalite ne le verrait pas.
        """
        preleves = settings.COMMISSION_RATES
        retour = Decimal(str(preleves['RETURN_TRIP']))

        for nom in ('TRANSPORT', 'MOVING'):
            self.assertLess(
                retour, Decimal(str(preleves[nom])),
                f"RETURN_TRIP ({retour}) n'est plus inferieur a {nom} "
                f"({preleves[nom]}) : la page « Devenir transporteur » promet "
                f"une commission reduite qui n'existe plus.",
            )
