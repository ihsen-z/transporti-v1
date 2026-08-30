"""
T5.5 — les clients fidèles d'un transporteur (B-4, « favoris inversés »).

Pendant de C5.3 : le client met un transporteur en favori, le transporteur veut
savoir QUI l'a fait, et avec qui il a déjà travaillé. C'est la matière d'une
relation commerciale directe — l'inverse exact de la place de marché anonyme.

Deux signaux, volontairement SÉPARÉS et jamais fusionnés en un score :

- `favori` : le client l'a explicitement mis en favori. C'est une intention
  déclarée, qui peut ne jamais s'être traduite par une mission.
- `missions` : le nombre de missions terminées ensemble. C'est un fait.

Les mélanger produirait un classement que ni l'un ni l'autre ne justifie. Un
client qui a fait six missions sans jamais cliquer sur le cœur est plus fidèle
qu'un favori qui n'a jamais réservé ; l'écran doit pouvoir montrer les deux.
"""
from django.db.models import Count, Q

from .models import Offer, TransportJob, FavoriteTransporter


def loyal_clients(transporter, limit: int = 20) -> list[dict]:
    """
    Clients ayant déjà travaillé avec ce transporteur, ou l'ayant mis en favori.

    Chaque entrée porte :

    - `client_id` / `client_name` : de quoi ouvrir le profil et le contacter.
    - `missions` : missions TERMINÉES ensemble. Une mission en cours ne compte
      pas — la fidélité se constate après coup, pas pendant.
    - `is_favorite` : le client l'a mis en favori.
    - `last_mission_at` : date de la dernière mission terminée, `None` si le
      client est un favori qui n'a jamais réservé. Ce `None` est porteur : il
      distingue « client perdu de vue » de « intéressé jamais converti ».

    Tri : d'abord le nombre de missions, puis la récence. Un favori sans
    mission arrive donc après, sans disparaître.
    """
    missions_par_client = (
        Offer.objects
        .filter(
            transporter=transporter,
            status='ACCEPTED',
            job__status=TransportJob.Status.COMPLETED,
        )
        .values('job__owner')
        .annotate(missions=Count('id', distinct=True))
    )
    compte = {
        ligne['job__owner']: ligne['missions']
        for ligne in missions_par_client
    }

    # Dernière mission terminée avec chacun. Requête séparée plutôt qu'un
    # `Max` dans l'agrégat ci-dessus : mélanger un Count et un Max sur des
    # jointures multiples gonfle le compte (produit cartésien).
    derniere = {}
    for job in TransportJob.objects.filter(
        offers__transporter=transporter,
        offers__status='ACCEPTED',
        status=TransportJob.Status.COMPLETED,
    ).order_by('owner_id', '-updated_at').values('owner_id', 'updated_at'):
        derniere.setdefault(job['owner_id'], job['updated_at'])

    favoris = set(
        FavoriteTransporter.objects
        .filter(transporter=transporter)
        .values_list('client_id', flat=True)
    )

    from django.contrib.auth import get_user_model
    User = get_user_model()
    concernes = set(compte) | favoris
    if not concernes:
        return []

    lignes = []
    for utilisateur in User.objects.filter(id__in=concernes):
        nom = f"{utilisateur.first_name} {utilisateur.last_name}".strip()
        lignes.append({
            'client_id': utilisateur.id,
            'client_name': nom or utilisateur.email.split('@')[0],
            'missions': compte.get(utilisateur.id, 0),
            'is_favorite': utilisateur.id in favoris,
            'last_mission_at': derniere.get(utilisateur.id),
        })

    # `last_mission_at` peut être None : on le range en dernier plutôt que de
    # laisser Python lever sur une comparaison entre None et une date.
    lignes.sort(
        key=lambda l: (
            l['missions'],
            l['last_mission_at'].timestamp() if l['last_mission_at'] else 0,
        ),
        reverse=True,
    )
    return lignes[:limit]


def loyalty_summary(transporter) -> dict:
    """
    Deux compteurs, pour l'en-tête de l'écran.

    `repeat_clients` compte les clients avec AU MOINS DEUX missions terminées :
    c'est le seuil où « il est revenu » cesse d'être une coïncidence. Un client
    à une seule mission n'est pas encore fidèle, et l'annoncer comme tel
    donnerait au transporteur une image flatteuse et fausse de son portefeuille.
    """
    par_client = (
        Offer.objects
        .filter(
            transporter=transporter,
            status='ACCEPTED',
            job__status=TransportJob.Status.COMPLETED,
        )
        .values('job__owner')
        .annotate(missions=Count('id', distinct=True))
    )
    return {
        'favorited_by': FavoriteTransporter.objects.filter(
            transporter=transporter
        ).count(),
        'repeat_clients': sum(1 for l in par_client if l['missions'] >= 2),
    }
