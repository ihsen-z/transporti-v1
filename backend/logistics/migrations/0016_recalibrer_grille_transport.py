"""
Recalibrage de la grille TRANSPORT sur le prix d'un transport DÉDIÉ.

Pourquoi. La grille servait deux usages contradictoires. Elle alimente
`PriceEstimateView`, qui suggère au client son budget pour une annonce
classique — un transport dédié. Elle sert aussi de référence à
`_prix_trajet_dedie()` pour calculer l'économie d'un trajet retour. Or ses
valeurs (10 DT + 0,350 DT/km) décrivaient le prix MUTUALISÉ : celui d'un
transporteur qui groupe des colis ou qui rentre à vide.

Deux conséquences, toutes deux silencieuses :

1. Le budget suggéré au client était environ quatre fois trop bas. Une annonce
   publiée à ce prix ne trouve pas preneur, et rien dans l'interface ne le dit.
2. L'économie d'un trajet retour comparait un prix mutualisé à un prix
   mutualisé : elle était nulle ou négative PAR CONSTRUCTION, quels que soient
   les chiffres. Le badge n'a jamais pu s'afficher.

Ancrage. Une seule valeur de référence, donnée par le porteur du produit le
29/08/2026 : un transport dédié Sousse → Tunis (115,6 km, un client, départ à
sa convenance) vaut **170 DT**. Avec `base_rate` inchangé à 10 DT :

    per_km_rate = (170 - 10) / 115,6 = 1,384 DT/km

Contrôle sur un second corridor : Tunis → Sfax (235,6 km) donne 336 DT, soit
1,43 DT/km tout compris — cohérent.

Limites, explicitement. C'est UN point d'ancrage, pas une étude de marché. La
grille reste éditable depuis l'admin Django sans déploiement, et la vraie
référence devra venir de la médiane des transactions observées par corridor
dès qu'il y aura du volume.

MOVING n'est PAS touché : aucune valeur de référence pour le déménagement, et
inventer un facteur par analogie avec le transport n'aurait aucun fondement.
"""
from decimal import Decimal

from django.db import migrations

# Valeurs posées par 0008. On ne remplace que celles-ci : un tarif déjà ajusté
# depuis l'admin est une décision humaine, et l'écraser serait la perdre.
ANCIEN_PER_KM = Decimal('0.350')
NOUVEAU_PER_KM = Decimal('1.384')


def recalibrer(apps, schema_editor):
    PricingGrid = apps.get_model('logistics', 'PricingGrid')
    PricingGrid.objects.filter(
        job_type='TRANSPORT', per_km_rate=ANCIEN_PER_KM
    ).update(per_km_rate=NOUVEAU_PER_KM)


def revenir(apps, schema_editor):
    PricingGrid = apps.get_model('logistics', 'PricingGrid')
    PricingGrid.objects.filter(
        job_type='TRANSPORT', per_km_rate=NOUVEAU_PER_KM
    ).update(per_km_rate=ANCIEN_PER_KM)


class Migration(migrations.Migration):

    dependencies = [
        ('logistics', '0015_transportjob_available_capacity_kg_and_more'),
    ]

    operations = [
        migrations.RunPython(recalibrer, revenir),
    ]
