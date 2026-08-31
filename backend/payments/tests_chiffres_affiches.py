"""
Les chiffres ANNONCES au public correspondent a ceux APPLIQUES.

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
_LIB_FRONT = Path(__file__).resolve().parent.parent.parent / 'frontend' / 'lib'
FICHIER_FRONT = _LIB_FRONT / 'commissions.ts'
FICHIER_GARANTIES = _LIB_FRONT / 'garanties.ts'

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


class GarantiesAffichesTests(SimpleTestCase):
    """
    Meme garde-fou pour la page « Confiance et securite ».

    Elle promet « 48 heures » avant le versement automatique et « score d'au
    moins 50 » pour l'encaissement en especes. Les deux viennent de reglages
    modifiables par variable d'environnement : la recopie cote front peut donc
    diverger sans qu'aucune erreur ne le signale.
    """

    def _garanties_du_front(self):
        contenu = FICHIER_GARANTIES.read_text(encoding='utf-8')
        debut = contenu.index('GARANTIES_AFFICHEES = {')
        fin = contenu.index('} as const;', debut)
        bloc = contenu[debut:fin]
        return {nom: Decimal(valeur) for nom, valeur in MOTIF.findall(bloc)}

    def test_le_fichier_front_existe_et_est_lisible(self):
        self.assertTrue(
            FICHIER_GARANTIES.is_file(),
            f"{FICHIER_GARANTIES} est introuvable. Si le fichier a ete deplace, "
            f"mettre a jour ce test — ne pas le supprimer.",
        )
        self.assertEqual(len(self._garanties_du_front()), 2)

    def test_le_delai_de_liberation_annonce_est_celui_applique(self):
        affiche = self._garanties_du_front()['ESCROW_AUTO_RELEASE_HOURS']
        applique = Decimal(str(settings.ESCROW_AUTO_RELEASE_HOURS))

        self.assertEqual(
            affiche, applique,
            f"La page « Confiance » annonce {affiche} h avant le versement "
            f"automatique, la plateforme en applique {applique}. Realigner "
            f"frontend/lib/garanties.ts.",
        )

    def test_le_score_minimum_especes_annonce_est_celui_applique(self):
        """
        A NOTER : `COD_MIN_TRUST_SCORE` n'est PAS declare dans settings.py. La
        regle ne vit que comme valeur de repli d'un `getattr` dans
        `payments/services.py`. Ce test compare donc la valeur EFFECTIVE — la
        seule qui s'applique aux clients — et non une valeur configuree.

        Il n'est pas vide pour autant : le jour ou quelqu'un declare
        `COD_MIN_TRUST_SCORE = 60` dans les reglages, la page continuerait
        d'annoncer 50 et ce test le dirait.
        """
        affiche = self._garanties_du_front()['COD_MIN_TRUST_SCORE']
        applique = Decimal(str(getattr(settings, 'COD_MIN_TRUST_SCORE', 50)))

        self.assertEqual(
            affiche, applique,
            f"La page « Confiance » annonce un score minimum de {affiche} pour "
            f"l'encaissement en especes, la plateforme exige {applique}.",
        )
