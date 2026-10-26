"""
Pièces KYC (CIN, selfie, permis…) : écriture, lien de lecture signé, effacement.

Avant, les pièces étaient écrites par open() dans MEDIA_ROOT, sur le disque
du serveur : perdues à chaque déploiement Render, et servies SANS connexion
par la route publique /media/ à quiconque avait l'URL.

Désormais :
- tout passe par le stockage configuré (default_storage) : disque local en
  développement, bucket privé Cloudflare R2 en production ;
- aucune URL publique : le propriétaire ou l'administrateur reçoit un lien
  signé valable LIEN_VALIDITE secondes (views_fichiers.FichierKycView le
  vérifie, puis renvoie le fichier lu dans le stockage) ;
- la route /media/ refuse ce dossier (transporti_core/media.py).

Le lien signé fonctionne comme une URL signée S3 : il ne demande pas de
connexion (une balise <img> n'envoie pas de jeton), mais il n'est remis
qu'à un utilisateur autorisé et expire vite.
"""
import posixpath
import secrets

from django.core import signing
from django.core.files.storage import default_storage
from django.urls import reverse

# Toutes les pièces vivent sous ce préfixe du stockage.
DOSSIER_KYC = 'verification_docs'

# Durée de vie d'un lien de lecture, en secondes.
LIEN_VALIDITE = 15 * 60

# Sel propre aux liens KYC : un jeton signé ailleurs dans l'application
# (réinitialisation de mot de passe…) ne peut pas servir ici.
_SEL = 'trust.fichier-kyc'


def cle_valide(cle: str) -> bool:
    """
    Vrai si `cle` désigne un fichier DU dossier KYC, sans remontée de dossier.

    Garde-fou commun à la lecture et à l'effacement : même une clé corrompue
    en base ne doit pas permettre de lire ou d'effacer un autre fichier.
    """
    if not isinstance(cle, str) or not cle or '\\' in cle or cle.startswith('/'):
        return False
    morceaux = cle.split('/')
    return (
        len(morceaux) > 1
        and morceaux[0] == DOSSIER_KYC
        and '..' not in morceaux
        and '' not in morceaux
    )


def enregistrer_piece(user_id: int, document_type: str, fichier) -> str:
    """Écrit la pièce dans le stockage et renvoie sa clé (à garder en base)."""
    extension = posixpath.splitext(fichier.name)[1].lower()
    # Le jeton aléatoire évite qu'une clé se devine à partir de l'identifiant.
    nom = f'{user_id}_{document_type}_{secrets.token_hex(8)}{extension}'
    # save() peut changer le nom (fichier déjà présent) : on garde son retour.
    return default_storage.save(f'{DOSSIER_KYC}/{user_id}/{nom}', fichier)


def lien_signe(cle: str) -> str:
    """Lien de lecture temporaire d'une pièce, ou '' si la clé est invalide."""
    if not cle_valide(cle):
        return ''
    jeton = signing.dumps(cle, salt=_SEL)
    # Le nom du fichier termine le lien : l'écran d'administration reconnaît
    # une image à son extension (.jpg, .png…).
    return reverse('trust-fichier-kyc', kwargs={'jeton': jeton, 'nom': posixpath.basename(cle)})


def cle_du_jeton(jeton: str, nom: str) -> str | None:
    """Clé désignée par un lien signé encore valide, sinon None."""
    try:
        cle = signing.loads(jeton, salt=_SEL, max_age=LIEN_VALIDITE)
    except signing.BadSignature:  # SignatureExpired en hérite
        return None
    if not cle_valide(cle) or posixpath.basename(cle) != nom:
        return None
    return cle


def effacer_piece(cle: str) -> None:
    """Efface une pièce du stockage. Lève ValueError si la clé est invalide."""
    if not cle_valide(cle):
        raise ValueError(f'clé hors du dossier KYC : {cle!r}')
    if default_storage.exists(cle):
        default_storage.delete(cle)
