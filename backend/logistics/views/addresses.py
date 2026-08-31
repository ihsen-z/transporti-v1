"""
C5.9 — le carnet d'adresses.

Deux vues seulement : la liste (avec création) et le détail (modification,
suppression). Le découpage suit celui des autres vues de `logistics/views/`.
"""
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from ..models import SavedAddress
from ..serializers_addresses import SavedAddressSerializer


class _CarnetDeLUtilisateurMixin:
    """
    Le carnet est TOUJOURS filtré sur l'utilisateur du jeton.

    C'est le point unique qui empêche de lire ou de modifier le carnet d'un
    autre : un `get_object_or_404(pk=...)` sans ce filtre suffirait à exposer
    l'adresse du domicile d'un inconnu. Le filtre vit donc ici, dans le
    `get_queryset` partagé, et non recopié dans chaque vue.

    Conséquence voulue : une adresse qui appartient à quelqu'un d'autre rend
    404 et non 403. Un 403 confirmerait qu'elle existe.
    """

    serializer_class = SavedAddressSerializer
    # Les DEUX rôles y ont accès : un transporteur saisit les mêmes champs en
    # publiant un trajet retour. Rien n'est partagé entre utilisateurs, donc
    # rien à cloisonner par rôle.
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavedAddress.objects.filter(user=self.request.user)


class SavedAddressListCreateView(_CarnetDeLUtilisateurMixin, generics.ListCreateAPIView):
    """
    GET  /api/addresses/  — le carnet de l'utilisateur, par ordre de nom.
    POST /api/addresses/  — ajoute une adresse.

    Exposée sur les deux surfaces (`/api/` et `/api/v1/`) du seul fait d'être
    déclarée dans `logistics/urls.py`, que la configuration racine inclut deux
    fois. Vérifié par test.
    """

    def perform_create(self, serializer):
        # `user` ne vient jamais de la requête : le sérialiseur ne l'expose
        # même pas. C'est le jeton qui décide à qui appartient l'adresse.
        serializer.save(user=self.request.user)


class SavedAddressDetailView(_CarnetDeLUtilisateurMixin, generics.RetrieveUpdateDestroyAPIView):
    """
    GET / PATCH / DELETE /api/addresses/<id>/

    La suppression est définitive et sans effet de bord : une adresse n'est
    qu'un modèle de saisie. Les annonces déjà publiées ont copié ses valeurs au
    moment de leur création et ne la référencent pas — supprimer une adresse ne
    peut donc pas altérer une mission passée.
    """
