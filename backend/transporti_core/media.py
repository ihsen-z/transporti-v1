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
import posixpath

from django.core.files.storage import default_storage
from django.http import Http404, HttpResponse

from trust.fichiers import DOSSIER_KYC

# Seuls types servis, choisis par extension (table fixe plutôt que le module
# mimetypes, que le registre Windows peut modifier). Volontairement sans SVG
# (un SVG peut porter du script) ni HTML : ce domaine est aussi celui de l'API
# et de l'admin, un tel fichier s'exécuterait avec leur origine.
TYPES_SERVIS = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
}


def chemin_public(chemin: str) -> bool:
    """Vrai si `chemin` peut être servi publiquement."""
    if not chemin or '\\' in chemin or chemin.startswith('/') or '\x00' in chemin:
        return False
    # 1) Forme canonique d'abord : le stockage normalise le chemin avant de
    #    lire, donc « ./verification_docs/… » (ou « %2e/… », décodé par Django)
    #    désignerait le dossier KYC. Toute forme non canonique est refusée.
    if posixpath.normpath(chemin) != chemin:
        return False
    morceaux = chemin.split('/')
    if any(m in ('', '.', '..') for m in morceaux):
        return False
    # 2) Ensuite seulement, le dossier KYC, à n'importe quelle profondeur et
    #    sans casse (sur un disque Windows, « Verification_Docs » est le même).
    return all(m.lower() != DOSSIER_KYC for m in morceaux)


def servir_media(request, chemin: str):
    if not chemin_public(chemin):
        raise Http404
    type_mime = TYPES_SERVIS.get(posixpath.splitext(chemin)[1].lower())
    if type_mime is None or not default_storage.exists(chemin):
        raise Http404

    # Lecture complète : photos compressées à l'envoi, et le serveur tourne en
    # ASGI, où un fichier synchrone ne se diffuse pas proprement.
    with default_storage.open(chemin, 'rb') as fichier:
        contenu = fichier.read()

    reponse = HttpResponse(contenu, content_type=type_mime)
    # Le navigateur ne doit ni deviner un autre type (nosniff), ni exécuter
    # quoi que ce soit si le fichier était malgré tout ouvert comme document
    # (sandbox : pas de script, origine opaque).
    reponse['X-Content-Type-Options'] = 'nosniff'
    reponse['Content-Security-Policy'] = 'sandbox'
    # Un fichier public ne change pas une fois écrit (nom aléatoire, jamais
    # écrasé) : le navigateur peut le garder un jour.
    reponse['Cache-Control'] = 'public, max-age=86400'
    return reponse
