"""
Déconnexion — Transporti V1.

POST /api/auth/logout/ (et /api/v1/auth/logout/)
Corps : { "refresh": "<refresh token>" }

Met le refresh token sur liste noire : il ne peut plus servir à obtenir un
nouvel access token. Toujours 205, même si le jeton est déjà invalide ou
absent : la déconnexion est idempotente et ne renvoie jamais de 500.
"""
import logging

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .services_sessions import blacklist_refresh_token

logger = logging.getLogger('transporti')


class LogoutView(APIView):
    # AllowAny : l'app doit pouvoir se déconnecter même avec un access token
    # expiré. La preuve de possession, c'est le refresh token lui-même.
    permission_classes = [AllowAny]
    # Pas d'authentification JWT ici : un access token expiré renverrait 401.
    authentication_classes: list = []

    def post(self, request):
        raw_token = request.data.get('refresh', '')
        if isinstance(raw_token, str) and raw_token:
            if blacklist_refresh_token(raw_token):
                logger.info("USER_LOGOUT: refresh token blacklisted")
        return Response(status=status.HTTP_205_RESET_CONTENT)
