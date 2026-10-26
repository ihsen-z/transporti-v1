"""
Durée de conservation des pièces d'identité (KYC).

Décision du fondateur (25/10/2026) : une pièce n'est acceptée que si elle est
valable à l'envoi (déjà vérifié par VerificationDocumentUploadSerializer), et
Transporti la conserve CINQ ANS après la fin de sa validité. Passé ce délai,
le fichier et sa ligne en base sont supprimés.

Pourquoi un délai et pas « pour toujours ». La loi 2004-63 sur les données
personnelles exige une durée de conservation déterminée. Avant ce module,
aucune pièce n'était jamais supprimée, pas même à la fermeture du compte, et
la politique de confidentialité ne pouvait pas être publiée (défaut M-03 de
l'audit du 06/09).

Les pièces sans date de validité (CIN et selfie, `expires_at` vide) ont leur
propre point de départ, décidé le même jour : elles sont conservées CINQ ANS
APRÈS LA FERMETURE DU COMPTE (`User.closed_at`). Tant que le compte est
ouvert, elles restent.
"""
import logging
from datetime import date
from typing import Optional

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .fichiers import cle_valide, effacer_piece
from .models import VerificationDocument

logger = logging.getLogger('transporti')

# Années de conservation après la fin de validité d'une pièce.
KYC_RETENTION_YEARS = 5

# Les pièces vivent dans le stockage configuré, sous le dossier KYC (voir
# trust/fichiers.py). effacer_piece refuse toute clé hors de ce dossier, même
# si `s3_key` venait à être corrompu.


def retention_ends_on(expires_at: date) -> date:
    """Dernier jour de conservation d'une pièce qui expire le `expires_at`."""
    try:
        return expires_at.replace(year=expires_at.year + KYC_RETENTION_YEARS)
    except ValueError:
        # Une pièce qui expire un 29 février : l'année d'arrivée n'en a pas.
        return expires_at.replace(year=expires_at.year + KYC_RETENTION_YEARS, day=28)


def purge_cutoff(today: Optional[date] = None) -> date:
    """
    Une pièce expirée AVANT cette date a dépassé ses 5 ans de conservation.

    `retention_ends_on(expires_at) < today` équivaut à
    `expires_at < today - 5 ans`, ce qui permet un seul filtre SQL.
    """
    today = today or timezone.localdate()
    try:
        return today.replace(year=today.year - KYC_RETENTION_YEARS)
    except ValueError:
        return today.replace(year=today.year - KYC_RETENTION_YEARS, day=28)


def documents_a_purger(today: Optional[date] = None):
    """
    Pièces dont la conservation est terminée :
    - pièce datée : expirée depuis plus de 5 ans, compte ouvert ou non ;
    - pièce sans date (CIN, selfie) : compte fermé depuis plus de 5 ans.
    """
    coupure = purge_cutoff(today)
    datee_echue = Q(expires_at__isnull=False, expires_at__lt=coupure)
    sans_date_compte_ferme = Q(
        expires_at__isnull=True,
        profile__user__closed_at__isnull=False,
        profile__user__closed_at__date__lt=coupure,
    )
    return VerificationDocument.objects.filter(datee_echue | sans_date_compte_ferme)


def purge_expired_kyc_documents(today: Optional[date] = None, dry_run: bool = False) -> int:
    """
    Supprime les pièces dont les 5 ans de conservation sont écoulés (après la
    fin de validité, ou après la fermeture du compte pour une pièce sans date).

    Retourne le nombre de pièces supprimées (ou qui le seraient, en `dry_run`).
    Le fichier est effacé avant la ligne : si l'effacement échoue, la ligne
    reste et la prochaine exécution réessaiera, au lieu de laisser un fichier
    orphelin que plus rien ne référence.
    """
    supprimees = 0
    for document in documents_a_purger(today).iterator():
        if dry_run:
            supprimees += 1
            continue

        if document.s3_key and not cle_valide(document.s3_key):
            # Clé corrompue : aucun fichier n'est touché (elle pourrait désigner
            # n'importe quoi), mais la ligne part, sa conservation étant finie.
            logger.error(
                'KYC_PURGE_PATH_REFUSED: document_id=%s s3_key=%r hors du dossier KYC',
                document.id, document.s3_key,
            )
        elif document.s3_key:
            try:
                effacer_piece(document.s3_key)
            except Exception as exc:  # disque local (OSError) ou bucket (erreur botocore)
                logger.error('KYC_PURGE_FILE_FAILED: document_id=%s (%s)', document.id, exc)
                continue

        # `delete()` remet la clé primaire à None : on la garde avant.
        document_id = document.id
        with transaction.atomic():
            document.delete()
        supprimees += 1
        # Ni nom ni numéro de pièce dans les journaux : l'identifiant suffit.
        logger.info('KYC_DOCUMENT_PURGED: document_id=%s', document_id)

    return supprimees
