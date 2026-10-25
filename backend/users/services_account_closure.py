"""Clôture de compte à la demande de l'utilisateur.

Exigence de recevabilité : Google Play et l'App Store imposent tous deux un
chemin de suppression de compte *dans l'application* pour toute app permettant
d'en créer un. S'y ajoute l'obligation d'effacement de la loi tunisienne
2004-63.

Le compte est **anonymisé**, pas détruit, et ce n'est pas un choix de confort :
`TransportJob.owner` et `Offer.transporter` sont tous deux déclarés
`on_delete=models.PROTECT` (`logistics/models.py:22` et `:150`). Un
`user.delete()` sur un compte ayant la moindre mission ou offre lèverait donc
`ProtectedError` — la base elle-même l'interdit, pour que les faits comptables
(commissions dues, retraits en traitement, litiges) survivent à l'utilisateur.

Aucune migration n'est nécessaire : `User` hérite d'`AbstractUser`, qui porte
déjà `is_active`.
"""

from __future__ import annotations

import logging
import uuid

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger('transporti')

# Statuts pour lesquels une clôture est refusée : de l'argent ou une
# marchandise est engagé, et l'autre partie a besoin d'un interlocuteur.
STATUTS_BLOQUANTS = ('MATCHED', 'IN_PROGRESS', 'DISPUTED')


class ClotureImpossible(Exception):
    """Refus métier, porteur d'un message destiné à l'utilisateur."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def _missions_en_cours(user) -> int:
    """Missions engagées, que l'utilisateur soit client ou transporteur."""
    from django.db.models import Q

    from logistics.models import TransportJob

    return (
        TransportJob.objects.filter(status__in=STATUTS_BLOQUANTS)
        .filter(Q(owner=user) | Q(offers__transporter=user, offers__status='ACCEPTED'))
        .distinct()
        .count()
    )


def verifier_cloture_possible(user) -> None:
    """Lève `ClotureImpossible` si le compte ne peut pas être clôturé.

    Deux garde-fous seulement, et chacun renvoie une cause actionnable —
    l'utilisateur doit savoir quoi faire pour débloquer sa demande.
    """
    en_cours = _missions_en_cours(user)
    if en_cours:
        raise ClotureImpossible(
            f"Vous avez {en_cours} mission(s) en cours. "
            "Terminez-les ou annulez-les avant de supprimer votre compte."
        )

    if getattr(user, 'role', None) == 'TRANSPORTER':
        from payments.services import get_wallet_summary

        resume = get_wallet_summary(user)
        if resume['cod_debt'] > 0:
            raise ClotureImpossible(
                f"Vous devez encore {resume['cod_debt']} TND de commission sur "
                "vos encaissements en espèces. Régularisez avant de supprimer "
                "votre compte."
            )
        if resume['available'] > 0:
            raise ClotureImpossible(
                f"Votre solde retirable est de {resume['available']} TND. "
                "Demandez le retrait avant de supprimer votre compte."
            )


@transaction.atomic
def cloturer_compte(user) -> None:
    """Anonymise l'identité et désactive l'accès. Idempotent par construction.

    Ce qui disparaît : e-mail, téléphone, nom, identifiant de connexion, mot de
    passe, avatar, jetons d'appareil. Ce qui reste : les jobs, les offres, les
    écritures de commission et les avis — rattachés à un utilisateur devenu
    anonyme.
    """
    verifier_cloture_possible(user)

    ancien_id = user.id
    jeton = uuid.uuid4().hex[:12]

    user.email = f'supprime+{jeton}@transporti.invalid'
    user.username = f'supprime_{jeton}'
    user.phone = None  # `unique=True, null=True` : libère le numéro
    user.first_name = 'Compte'
    user.last_name = 'supprimé'
    user.is_phone_verified = False
    user.is_active = False
    # Point de départ de la conservation des pièces sans date (trust/retention.py).
    user.closed_at = timezone.now()
    user.set_unusable_password()
    user.save(update_fields=[
        'email', 'username', 'phone', 'first_name', 'last_name',
        'is_phone_verified', 'is_active', 'password', 'updated_at', 'closed_at',
    ])

    _effacer_donnees_liees(user)

    logger.info('ACCOUNT_CLOSED: user_id=%s at=%s', ancien_id, timezone.now().isoformat())


def _effacer_donnees_liees(user) -> None:
    """Efface ce qui identifie l'utilisateur sans porter de fait comptable.

    Chaque bloc est indépendant : un modèle absent d'une installation ne doit
    pas faire échouer la clôture.
    """
    # Photo de profil. Deux champs la portent : le fichier téléversé et l'URL
    # externe (héritée de la connexion sociale). Les deux identifient.
    profil = getattr(user, 'profile', None)
    if profil is not None:
        profil.avatar = None
        profil.avatar_url = ''
        profil.save(update_fields=['avatar', 'avatar_url'])

    # Jetons de push : sans eux, plus aucune notification ne part vers
    # l'appareil d'un compte clôturé.
    try:
        from notifications.models import DeviceToken

        DeviceToken.objects.filter(user=user).delete()
    except (ImportError, LookupError):  # pragma: no cover - dépend de l'installation
        pass

    # Carnet d'adresses : donnée personnelle, aucun rattachement comptable.
    try:
        from logistics.models import SavedAddress

        SavedAddress.objects.filter(user=user).delete()
    except (ImportError, LookupError):  # pragma: no cover
        pass
