"""
Les grilles tarifaires servies au client, et leur repli.

Deux choses sont verrouillees ici, toutes deux parce qu'elles ont deja lache
en silence :

1. `DEFAULT_GRIDS` (le repli code en dur, utilise quand aucune PricingGrid
   active n'existe) doit rester aligne sur les grilles reellement en base.
   Entre les migrations 0016 et 0017, la grille TRANSPORT etait recalibree en
   base mais pas dans le repli : un client servi par le repli recevait un
   budget suggere issu de l'ancien tarif MUTUALISE, environ quatre fois trop
   bas, sans le moindre signal — ni exception, ni trace visible.

2. Le recalibrage lui-meme (0016 TRANSPORT, 0017 MOVING). Un retour aux
   valeurs de semis de 0008 republierait ce defaut.
"""
from decimal import Decimal

from django.test import TestCase

from logistics.models import PricingGrid
from logistics.pricing import DEFAULT_GRIDS, get_pricing_grid


class GrillesRecalibreesTests(TestCase):
    """Les grilles en base portent bien les valeurs recalibrees."""

    def test_transport_porte_le_tarif_dedie(self):
        grille = PricingGrid.objects.get(job_type='TRANSPORT')
        self.assertEqual(grille.base_rate, Decimal('10.00'))
        # 0016 : ancrage transport dedie Sousse -> Tunis a 170 DT.
        self.assertEqual(grille.per_km_rate, Decimal('1.384'))

    def test_moving_porte_le_tarif_recalibre(self):
        grille = PricingGrid.objects.get(job_type='MOVING')
        # 0017 : forfait de prise en charge + kilometrage.
        self.assertEqual(grille.base_rate, Decimal('100.00'))
        self.assertEqual(grille.per_km_rate, Decimal('1.500'))


class RepliAligneTests(TestCase):
    """
    Le repli doit donner le MEME prix que la base, pour chaque type de job.

    On compare les quatre parametres un a un plutot que le prix final : une
    egalite de prix pourrait masquer deux ecarts qui se compensent.
    """

    CHAMPS = ('base_rate', 'per_km_rate', 'min_price', 'max_multiplier')

    def test_repli_identique_a_la_base_pour_chaque_type(self):
        for job_type in ('TRANSPORT', 'MOVING'):
            with self.subTest(job_type=job_type):
                grille = PricingGrid.objects.get(job_type=job_type)
                repli = DEFAULT_GRIDS[job_type]
                for champ in self.CHAMPS:
                    self.assertEqual(
                        Decimal(str(repli[champ])),
                        getattr(grille, champ),
                        f"{job_type}.{champ} : le repli code en dur a diverge "
                        f"de la grille en base. Realigner DEFAULT_GRIDS dans "
                        f"logistics/pricing.py sur la derniere migration de "
                        f"recalibrage.",
                    )

    def test_la_grille_desactivee_bascule_sur_le_repli_sans_changer_le_prix(self):
        """
        `get_pricing_grid` bascule sur le repli si la ligne n'est plus active.
        Ce basculement est muet par conception ; il doit donc etre neutre sur
        le prix. Seul `source` change.
        """
        PricingGrid.objects.filter(job_type='MOVING').update(is_active=False)

        replie = get_pricing_grid('MOVING')

        self.assertEqual(replie['source'], 'default')
        self.assertEqual(replie['base_rate'], 100.0)
        self.assertEqual(replie['per_km_rate'], 1.50)
