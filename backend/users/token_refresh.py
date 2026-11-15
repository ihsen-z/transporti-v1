"""
POST /api/auth/token/refresh/ — rafraîchissement qui respecte la durée admin.

Le TokenRefreshSerializer de simplejwt, avec ROTATE_REFRESH_TOKENS, renouvelle
le refresh token par `set_exp()` : durée par défaut REFRESH_TOKEN_LIFETIME
(7 jours). Un refresh token du back-office (1 h, claim `is_admin`) repartait
donc pour 7 jours en gardant `is_admin`.

Ici, même logique que simplejwt 5.5 (liste noire de l'ancien jeton, nouveau
jti/iat, enregistrement `outstand`), mais un jeton portant `is_admin` reçoit
les durées admin : 1 h pour le refresh, 15 min pour l'access.
"""
from typing import Any

from django.conf import settings
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.views import TokenRefreshView


class AdminAwareTokenRefreshSerializer(TokenRefreshSerializer):

    def validate(self, attrs: dict[str, Any]) -> dict[str, str]:
        refresh = self.token_class(attrs['refresh'])
        if not refresh.get('is_admin'):
            # Jeton utilisateur : comportement simplejwt inchangé.
            return super().validate(attrs)

        # Contrôle « compte actif » de simplejwt (même règle que le parent).
        user_id = refresh.payload.get(api_settings.USER_ID_CLAIM, None)
        if user_id:
            from django.contrib.auth import get_user_model
            from rest_framework.exceptions import AuthenticationFailed
            user = get_user_model().objects.filter(**{api_settings.USER_ID_FIELD: user_id}).first()
            if user is None or not api_settings.USER_AUTHENTICATION_RULE(user):
                raise AuthenticationFailed(
                    self.error_messages['no_active_account'], 'no_active_account')

        access = refresh.access_token
        access.set_exp(lifetime=settings.ADMIN_ACCESS_TOKEN_LIFETIME)
        data = {'access': str(access)}

        if api_settings.ROTATE_REFRESH_TOKENS:
            if api_settings.BLACKLIST_AFTER_ROTATION:
                refresh.blacklist()
            refresh.set_jti()
            # La clé du correctif : durée admin, pas les 7 jours par défaut.
            refresh.set_exp(lifetime=settings.ADMIN_REFRESH_TOKEN_LIFETIME)
            refresh.set_iat()
            refresh.outstand()
            data['refresh'] = str(refresh)

        return data


class AdminAwareTokenRefreshView(TokenRefreshView):
    serializer_class = AdminAwareTokenRefreshSerializer
