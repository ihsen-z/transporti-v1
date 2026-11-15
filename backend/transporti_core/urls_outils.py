"""
Routes d'outillage : admin Django et documentation d'API — Transporti V1.

En production, elles ne doivent pas être offertes à tout Internet :
- /admin/ n'est monté que si DJANGO_ADMIN_ENABLED est vrai (défaut : faux en
  production). Route absente = 404, aucune page de connexion à attaquer.
- /api/schema/ et /api/docs/ sont réservés aux comptes ADMIN (JWT) sauf si
  API_DOCS_PUBLIC est vrai (défaut : faux en production).

Les deux drapeaux sont lus dans settings.py.
"""
from django.conf import settings
from django.contrib import admin
from django.urls import URLPattern, URLResolver, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny, IsAuthenticated

from users.permissions import RequireRole


def _permissions_docs() -> list:
    if settings.API_DOCS_PUBLIC:
        return [AllowAny]
    return [IsAuthenticated, RequireRole.for_roles('ADMIN')]


def outils_patterns() -> list[URLPattern | URLResolver]:
    patterns: list[URLPattern | URLResolver] = []

    if settings.DJANGO_ADMIN_ENABLED:
        patterns.append(path('admin/', admin.site.urls))

    permissions = _permissions_docs()
    patterns += [
        path('api/schema/', SpectacularAPIView.as_view(permission_classes=permissions),
             name='schema'),
        path('api/docs/',
             SpectacularSwaggerView.as_view(url_name='schema', permission_classes=permissions),
             name='swagger-ui'),
    ]
    return patterns
