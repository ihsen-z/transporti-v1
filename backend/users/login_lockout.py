"""
Verrouillage après échecs de connexion — utilisateur et back-office.

Avant : la clé était l'e-mail seul, partagée entre les deux connexions, et
contrôlée avant le mot de passe. Cinq requêtes anonymes toutes les 30 min
suffisaient à bloquer n'importe quel compte, administrateur compris.

Maintenant la clé est e-mail + adresse du client (règle DRF / NUM_PROXIES,
transporti_core/client_ip.py), avec un préfixe par connexion : un attaquant
ne bloque que lui-même, depuis son adresse.

Plafond global par e-mail (toutes adresses) : NON mis en place. Le seul moyen
de « ralentir » sans jamais refuser le bon mot de passe serait d'attendre
(sleep) dans la requête, ce qui immobilise un worker et rouvre un déni de
service ; refuser les mauvais essais sans ralentir n'apporte rien. La
limitation de débit DRF (AuthRateThrottle / AdminLoginThrottle) reste la
protection contre les essais répartis.

Le « reset » (mot de passe réinitialisé) ne peut pas énumérer toutes les
adresses : chaque e-mail a un numéro de génération, inclus dans la clé ;
l'incrémenter rend caduques toutes les clés de cet e-mail d'un coup.
"""
from datetime import timedelta

from django.core.cache import cache

USER_SCOPE = 'user'
ADMIN_SCOPE = 'admin'

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION = timedelta(minutes=30)

_FAILED_PREFIX = 'login_failed'
_GENERATION_PREFIX = 'login_failed_gen'
# La génération doit vivre plus longtemps que n'importe quel compteur.
_GENERATION_TIMEOUT = int(timedelta(days=1).total_seconds())


def _normalize(email: str) -> str:
    return (email or '').strip().lower()


def _generation(email: str) -> int:
    return cache.get(f'{_GENERATION_PREFIX}:{email}', 0)


def _key(scope: str, email: str, ip: str) -> str:
    email = _normalize(email)
    return f'{_FAILED_PREFIX}:{scope}:{_generation(email)}:{email}:{ip}'


def failed_count(scope: str, email: str, ip: str) -> int:
    return cache.get(_key(scope, email, ip), 0)


def is_locked(scope: str, email: str, ip: str) -> bool:
    """Vrai si cette adresse a épuisé ses essais pour cet e-mail."""
    return failed_count(scope, email, ip) >= MAX_FAILED_ATTEMPTS


def record_failure(scope: str, email: str, ip: str) -> int:
    """
    Compte un échec et renvoie le nouveau total.

    Atomique : `add` ne crée la clé que si elle manque (avec la durée du
    verrou), puis `incr` est atomique sur Redis/Memcached et protégé par un
    verrou sur LocMemCache. La durée court depuis le premier échec.
    """
    key = _key(scope, email, ip)
    cache.add(key, 0, timeout=int(LOCKOUT_DURATION.total_seconds()))
    try:
        return cache.incr(key)
    except ValueError:
        # Clé expirée entre add et incr : on repart de 1.
        cache.set(key, 1, timeout=int(LOCKOUT_DURATION.total_seconds()))
        return 1


def clear(scope: str, email: str, ip: str) -> None:
    """Connexion réussie : efface le compteur de cette adresse."""
    cache.delete(_key(scope, email, ip))


def clear_all_for_email(email: str) -> None:
    """Mot de passe réinitialisé : lève tous les verrous de cet e-mail."""
    email = _normalize(email)
    key = f'{_GENERATION_PREFIX}:{email}'
    cache.add(key, 0, timeout=_GENERATION_TIMEOUT)
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=_GENERATION_TIMEOUT)
