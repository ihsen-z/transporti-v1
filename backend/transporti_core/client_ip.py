"""
Adresse du client, telle que DRF la retient pour la limitation de débit.

Les anciens helpers prenaient la PREMIÈRE entrée de X-Forwarded-For : c'est
celle que le client écrit lui-même, donc falsifiable (journal d'audit, clés
de verrouillage). DRF, avec NUM_PROXIES, prend l'entrée ajoutée par le
dernier proxy de confiance (Render) ; on réutilise exactement sa règle pour
que throttling, audit et verrouillage voient la même adresse.
"""
from rest_framework.throttling import BaseThrottle


def get_client_ip(request) -> str:
    """Adresse du client (règle DRF + NUM_PROXIES), 'unknown' si absente."""
    # get_ident ne lit que request.META : marche avec une requête Django ou DRF.
    ident = BaseThrottle().get_ident(request)
    return ident or 'unknown'
