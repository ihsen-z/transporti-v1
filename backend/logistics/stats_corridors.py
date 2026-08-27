"""
Ventilation par corridor des revenus d'un transporteur — B-3b (lot 1).

Fichier separe de `stats.py` pour tenir la regle de taille du CLAUDE.md (§4),
mais **soumis au meme contrat** : la seule porte d'entree reste
`get_transporter_stats()`, qui appelle ce module. Un frontend ne recalcule
jamais ces chiffres.

Pourquoi ce module existe : l'ecran « Performance retours » (T5.4) doit dire au
transporteur ou son argent est gagne, et surtout ou publier ensuite. Sans
ventilation par corridor, il voit un total sans savoir quoi en faire.

Point d'attention sur la reconciliation : la formule ci-dessous reprend
**exactement** celle de `released_net` dans `payments.services.get_wallet_summary`
(offres ACCEPTED dont la mission porte un escrow RELEASED). C'est deliberé — la
somme des corridors doit egaler K4 au dinar pres. Toute autre base de calcul
produirait deux chiffres divergents pour la meme realite, ce que le
`DICTIONNAIRE_KPI.md` interdit explicitement.
"""
from decimal import Decimal

from django.db.models import Sum, Count, Q

from .models import Offer, TransportJob


def revenue_by_corridor(transporter, limit: int = 10) -> list[dict]:
    """
    Revenu acquis par paire orientee de gouvernorats.

    Retourne une liste triee par revenu decroissant, limitee a `limit` entrees
    pour ne pas noyer l'ecran. Chaque entree porte :

    - `pickup_governorate` / `dropoff_governorate` : la paire orientee. Sfax vers
      Tunis et Tunis vers Sfax sont deux corridors distincts, parce qu'un retour
      a vide a un sens.
    - `revenue_net` : Σ `price_net`, meme base que K4 (escrow RELEASED).
    - `missions` : nombre de missions payees sur ce corridor.
    - `km` : Σ `distance_km` de ces missions.
    - `return_trip_missions` : combien viennent d'un trajet retour. C'est ce qui
      distingue le revenu du pivot du revenu classique sur un meme corridor.

    Les missions dont un gouvernorat est vide sont ecartees : elles ne sont pas
    attribuables a un corridor, et les faire apparaitre sous une paire vide
    donnerait une ligne « → » incomprehensible a l'ecran.
    """
    lignes = (
        Offer.objects
        .filter(
            transporter=transporter,
            status='ACCEPTED',
            job__escrow_transactions__status='RELEASED',
        )
        .exclude(job__pickup_governorate='')
        .exclude(job__dropoff_governorate='')
        .values('job__pickup_governorate', 'job__dropoff_governorate')
        .annotate(
            revenue_net=Sum('price_net'),
            missions=Count('id', distinct=True),
            km=Sum('job__distance_km'),
            return_trip_missions=Count(
                'id', distinct=True, filter=Q(job__is_return_trip=True)
            ),
        )
        .order_by('-revenue_net')[:limit]
    )

    return [
        {
            'pickup_governorate': ligne['job__pickup_governorate'],
            'dropoff_governorate': ligne['job__dropoff_governorate'],
            'revenue_net': float(ligne['revenue_net'] or Decimal('0')),
            'missions': ligne['missions'],
            'km': float(ligne['km'] or Decimal('0')),
            'return_trip_missions': ligne['return_trip_missions'],
        }
        for ligne in lignes
    ]


def underserved_corridors(transporter, limit: int = 3) -> list[dict]:
    """
    Corridors ou la demande depasse l'offre, parmi les zones du transporteur.

    Alimente la partie prospective de l'ecran T5.4 : « sur Tunis vers Sousse,
    9 demandes attendent un transporteur cette semaine ». C'est ce qui transforme
    un tableau de bord rétrospectif en invitation a publier.

    Definition : demandes classiques PUBLISHED (donc en attente d'un
    transporteur) groupees par paire orientee, restreintes aux gouvernorats
    declares par le transporteur dans `service_areas`, et desquelles on retire
    les paires ou il a deja un retour actif — lui proposer de publier la ou il
    est deja present n'a aucune valeur.
    """
    try:
        zones = transporter.trust_profile.service_areas or []
    except Exception:
        zones = []

    if not zones:
        # Sans zone declaree, on ne sait pas quoi recommander. Mieux vaut ne
        # rien afficher qu'une recommandation hors de portee du transporteur.
        return []

    # Paires ou le transporteur a deja un retour actif : a exclure.
    deja_couvert = set(
        TransportJob.objects
        .filter(
            owner=transporter,
            is_return_trip=True,
            status=TransportJob.Status.PUBLISHED,
        )
        .values_list('pickup_governorate', 'dropoff_governorate')
    )

    lignes = (
        TransportJob.objects
        .filter(
            is_return_trip=False,
            status=TransportJob.Status.PUBLISHED,
            pickup_governorate__in=zones,
        )
        .exclude(owner=transporter)
        .exclude(dropoff_governorate='')
        .values('pickup_governorate', 'dropoff_governorate')
        .annotate(demandes=Count('id'))
        .order_by('-demandes')
    )

    recommandations = []
    for ligne in lignes:
        paire = (ligne['pickup_governorate'], ligne['dropoff_governorate'])
        if paire in deja_couvert:
            continue
        recommandations.append({
            'pickup_governorate': paire[0],
            'dropoff_governorate': paire[1],
            'pending_demands': ligne['demandes'],
        })
        if len(recommandations) >= limit:
            break

    return recommandations
