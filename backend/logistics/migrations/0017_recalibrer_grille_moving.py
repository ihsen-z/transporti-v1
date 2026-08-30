"""
Recalibrage de la grille MOVING sur le prix d'un demenagement reel.

Pourquoi. 0016 a recalibre TRANSPORT et a explicitement laisse MOVING de cote,
faute de valeur de reference : inventer un facteur par analogie avec le
transport n'aurait eu aucun fondement. MOVING gardait donc les valeurs de
semis de 0008 (30 DT + 0,500 DT/km), qui decrivent le meme prix mutualise que
TRANSPORT avant recalibrage. Consequence identique et tout aussi silencieuse :
le budget suggere au client par `PriceEstimateView` etait environ quatre fois
trop bas, et une annonce publiee a ce prix ne trouve pas preneur sans que rien
dans l'interface ne le signale.

Ancrage. Valeurs posees par le porteur du produit le 30/08/2026 :

    base_rate   = 100 DT   (forfait de prise en charge : equipe, manutention,
                            chargement / dechargement, independant du trajet)
    per_km_rate = 1,500 DT/km

Un demenagement Sousse -> Tunis (115,6 km) donne donc 100 + 173 = 273 DT de
prix pivot, contre 88 DT avec l'ancienne grille.

Effet sur la fourchette rendue au client, via `estimate_price` :
    min = max(min_price, pivot * 0,8)   max = pivot * max_multiplier (2,0)
soit 218 - 546 DT sur ce corridor. `min_price` (80 DT) devient de fait
inatteignable : des 0 km le pivot vaut deja 100 DT et `pivot * 0,8` = 80. Le
plancher n'est pas supprime pour autant — il reste le garde-fou si la grille
est reeditee a la baisse depuis l'admin.

Limites, explicitement. Comme pour 0016 : ce sont des valeurs posees, pas une
etude de marche. La grille reste editable depuis l'admin Django sans
deploiement, et la vraie reference devra venir de la mediane des transactions
observees des qu'il y aura du volume. Le volume du demenagement (m3, etage,
ascenseur) n'entre PAS dans le calcul : la grille est purement kilometrique.
C'est une limite connue du modele, pas un oubli de cette migration.
"""
from decimal import Decimal

from django.db import migrations

# Valeurs posees par 0008. On ne remplace que celles-ci : un tarif deja ajuste
# depuis l'admin est une decision humaine, et l'ecraser serait la perdre.
ANCIEN_BASE = Decimal('30.00')
ANCIEN_PER_KM = Decimal('0.500')
NOUVEAU_BASE = Decimal('100.00')
NOUVEAU_PER_KM = Decimal('1.500')


def recalibrer(apps, schema_editor):
    PricingGrid = apps.get_model('logistics', 'PricingGrid')
    PricingGrid.objects.filter(
        job_type='MOVING', base_rate=ANCIEN_BASE, per_km_rate=ANCIEN_PER_KM
    ).update(base_rate=NOUVEAU_BASE, per_km_rate=NOUVEAU_PER_KM)


def revenir(apps, schema_editor):
    PricingGrid = apps.get_model('logistics', 'PricingGrid')
    PricingGrid.objects.filter(
        job_type='MOVING', base_rate=NOUVEAU_BASE, per_km_rate=NOUVEAU_PER_KM
    ).update(base_rate=ANCIEN_BASE, per_km_rate=ANCIEN_PER_KM)


class Migration(migrations.Migration):

    dependencies = [
        ('logistics', '0016_recalibrer_grille_transport'),
    ]

    operations = [
        migrations.RunPython(recalibrer, revenir),
    ]
