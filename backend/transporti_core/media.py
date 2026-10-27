"""
GET /media/<chemin> — fichiers publics (photos de chargement, etc.).

Avant, cette route servait le dossier MEDIA_ROOT du disque, en entier et sans
connexion : pièces d'identité comprises. Elle a changé sur deux points :
- elle lit par le stockage configuré (default_storage) : disque local en
  développement, bucket Backblaze B2 en production. Les URL déjà enregistrées en base
  (`/media/uploads/photos/…`, TransportJob.photos) restent donc valides une
  fois le bucket branché ;
- elle refuse le dossier des pièces KYC, qui ne se lisent que par lien signé
  (trust/fichiers.py).
"""
import mimetypes

from django.core.files.storage import default_storage
from django.http import Http404, HttpResponse

from trust.fichiers import DOSSIER_KYC


def chemin_public(chemin: str) -> bool:
    """Vrai si `chemin` peut être servi publiquement."""
    if not chemin or '\\' in chemin or chemin.startswith('/'):
        return False
    morceaux = chemin.split('/')
    if '..' in morceaux or '' in morceaux:
        return False
    # Comparaison sans casse : sur un disque Windows (développement),
    # « Verification_Docs » désigne le même dossier.
    return morceaux[0].lower() != DOSSIER_KYC


def servir_media(request, chemin: str):
    if not chemin_public(chemin) or not default_storage.exists(chemin):
        raise Http404

    # Lecture complète : photos compressées à l'envoi, et le serveur tourne en
    # ASGI, où un fichier synchrone ne se diffuse pas proprement.
    with default_storage.open(chemin, 'rb') as fichier:
        contenu = fichier.read()

    type_mime = mimetypes.guess_type(chemin)[0] or 'application/octet-stream'
    reponse = HttpResponse(contenu, content_type=type_mime)
    # Un fichier public ne change pas une fois écrit (nom aléatoire, jamais
    # écrasé) : le navigateur peut le garder un jour.
    reponse['Cache-Control'] = 'public, max-age=86400'
    return reponse
