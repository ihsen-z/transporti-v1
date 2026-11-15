"""
Gardes de démarrage en production : variables d'environnement indispensables.

Appelé par settings.py quand ENV=production. Chaque défaut de développement
qui se taisait en production devient un refus de démarrer, avec le nom de la
variable en cause et un renvoi au guide :
- DATABASE_URL vide → repli silencieux sur un fichier SQLite effacé à chaque
  déploiement ;
- FRONTEND_URL vide ou en localhost → liens des e-mails (mot de passe oublié…)
  qui pointent vers la machine du développeur ;
- stockage S3 incomplet → fichiers (KYC, photos) écrits sur le disque
  éphémère du conteneur, perdus au redéploiement. Opt-out EXPLICITE :
  ALLOW_EPHEMERAL_MEDIA=1 ;
- EMAIL_BACKEND absent ou de développement (console, fichier, mémoire) →
  le lien de réinitialisation (jeton compris) et le mot de passe temporaire
  d'une réinitialisation par l'admin partiraient dans les journaux.

Fonctions pures (elles reçoivent l'environnement) : testables sans recharger
les réglages.
"""
from typing import Mapping

GUIDE = 'docs/GUIDE_MISE_EN_PRODUCTION_RENDER.md'

# Variables du stockage S3 (Backblaze B2) exigées ensemble. La région n'a pas
# de défaut sûr : « auto » ne vaut que pour Cloudflare R2, B2 attend sa région
# réelle (ex. eu-central-003), qui entre dans la signature des liens.
STORAGE_VARIABLES = (
    'AWS_STORAGE_BUCKET_NAME',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_ENDPOINT_URL',
    'AWS_S3_REGION_NAME',
)


class ProductionConfigError(RuntimeError):
    """Variable d'environnement manquante ou invalide en production."""


def _refuser(variable: str, raison: str, section: str) -> None:
    raise ProductionConfigError(
        f"CRITICAL: démarrage refusé en production — {variable} {raison}. "
        f"Définir {variable} dans les variables d'environnement du service "
        f"(voir {GUIDE}, {section})."
    )


def _truthy(value: str) -> bool:
    return str(value or '').strip().lower() in ('1', 'true', 'yes')


def check_database(env: Mapping[str, str]) -> None:
    """La base de production doit être désignée explicitement."""
    if not (env.get('DB_URL_OVERRIDE') or env.get('DATABASE_URL', '')).strip():
        _refuser(
            'DATABASE_URL',
            "est vide : le serveur retomberait sur un fichier SQLite effacé à chaque déploiement",
            '§3.2 et §5.2',
        )


def check_frontend_url(env: Mapping[str, str]) -> None:
    """L'adresse du site sert aux liens des e-mails : jamais localhost."""
    url = env.get('FRONTEND_URL', '').strip()
    if not url:
        _refuser('FRONTEND_URL', "est vide", '§4.3 et §5.2')
    if 'localhost' in url or '127.0.0.1' in url:
        _refuser('FRONTEND_URL', f"pointe vers une machine locale ({url})", '§4.3 et §5.2')


def check_media_storage(env: Mapping[str, str]) -> None:
    """Le stockage des fichiers doit être complet, sauf opt-out explicite."""
    if _truthy(env.get('ALLOW_EPHEMERAL_MEDIA', '')):
        return
    for variable in STORAGE_VARIABLES:
        if not env.get(variable, '').strip():
            _refuser(
                variable,
                "est vide : sans stockage S3 complet, les fichiers envoyés seraient "
                "perdus au prochain déploiement (ALLOW_EPHEMERAL_MEDIA=1 pour l'accepter "
                "en connaissance de cause)",
                '§1 et §5.2',
            )


# Backends Django qui n'envoient rien : sortie standard, fichier, mémoire,
# néant. En production, ils feraient fuir les jetons dans les journaux.
DEV_EMAIL_BACKENDS = (
    'django.core.mail.backends.console.EmailBackend',
    'django.core.mail.backends.filebased.EmailBackend',
    'django.core.mail.backends.locmem.EmailBackend',
    'django.core.mail.backends.dummy.EmailBackend',
)


def check_email_backend(env: Mapping[str, str]) -> None:
    """Un vrai serveur d'envoi (SMTP) est obligatoire en production."""
    backend = env.get('EMAIL_BACKEND', '').strip()
    if not backend:
        _refuser(
            'EMAIL_BACKEND',
            "est vide : le serveur afficherait les e-mails (liens de réinitialisation "
            "et mots de passe temporaires compris) dans les journaux",
            '§2.4 et §5.2',
        )
    if backend in DEV_EMAIL_BACKENDS:
        _refuser(
            'EMAIL_BACKEND',
            f"désigne un backend de développement ({backend}) qui n'envoie rien et "
            "écrirait les jetons dans les journaux ; utiliser "
            "django.core.mail.backends.smtp.EmailBackend",
            '§2.4 et §5.2',
        )


def check_production_environment(env: Mapping[str, str]) -> None:
    """Toutes les gardes, dans l'ordre du guide."""
    check_database(env)
    check_frontend_url(env)
    check_media_storage(env)
    check_email_backend(env)


def normalize_origins(raw: str) -> list:
    """
    Liste CORS propre : espaces et « / » final retirés de chaque origine.

    « https://site.netlify.app/ » (faute de saisie courante) faisait échouer
    tout `manage.py` — migrate compris — par corsheaders.E014.
    """
    origins = []
    for origin in raw.split(','):
        cleaned = origin.strip().rstrip('/')
        if cleaned:
            origins.append(cleaned)
    return origins
