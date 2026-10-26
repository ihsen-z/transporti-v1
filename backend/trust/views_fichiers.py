"""
GET /api/v1/trust/fichiers/<jeton>/<nom> — lecture d'une pièce KYC par lien signé.

Le lien vient de trust.fichiers.lien_signe, remis seulement au propriétaire
de la pièce ou à un administrateur. Lien faux, expiré ou fichier absent :
404, sans dire lequel des trois.
"""
import mimetypes

from django.core.files.storage import default_storage
from django.http import Http404, HttpResponse
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from .fichiers import cle_du_jeton


class FichierKycView(APIView):
    # Le lien signé EST l'autorisation, comme une URL signée S3 : une balise
    # <img> n'envoie pas de jeton de connexion.
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, jeton, nom):
        cle = cle_du_jeton(jeton, nom)
        if cle is None or not default_storage.exists(cle):
            raise Http404

        # Lecture complète plutôt qu'en flux : le serveur tourne en ASGI, où un
        # fichier synchrone ne se diffuse pas proprement, et une pièce pèse au
        # plus 5 Mo (VerificationDocumentUploadSerializer).
        with default_storage.open(cle, 'rb') as fichier:
            contenu = fichier.read()

        type_mime = mimetypes.guess_type(nom)[0] or 'application/octet-stream'
        reponse = HttpResponse(contenu, content_type=type_mime)
        reponse['Content-Disposition'] = f'inline; filename="{nom}"'
        # Pièce d'identité : aucun cache partagé, aucune indexation.
        reponse['Cache-Control'] = 'private, no-store'
        reponse['X-Robots-Tag'] = 'noindex'
        return reponse
