"""
Routage : géométrie et distance réelles d'un trajet.

Pourquoi côté serveur et pas dans l'app mobile : les restrictions Android
d'une clé Google (package + empreinte SHA-1) ne s'appliquent PAS aux API web
comme Directions. Une clé capable de router, embarquée dans l'APK, est
extractible et facturable par n'importe qui. Ici l'appel part du serveur, une
seule fois par trajet à la création — pas à chaque affichage de carte.

Le fournisseur est isolé derrière `fetch_route()` : en changer ne touche qu'un
seul endroit. Par défaut OSRM public, qui ne demande aucun credential.
ATTENTION : le serveur de démonstration OSRM n'offre aucun engagement de
service et sa politique d'usage exclut la production. Pour un déploiement
réel, pointer OSRM_BASE_URL sur une instance auto-hébergée.
"""
import logging
import os
from typing import NamedTuple, Optional

import requests

logger = logging.getLogger(__name__)

OSRM_BASE_URL = os.environ.get('OSRM_BASE_URL', 'https://router.project-osrm.org')

# La publication est un geste interactif : au-delà de ce délai on renonce au
# routage et on retombe sur l'estimation, plutôt que faire attendre l'utilisateur.
ROUTING_TIMEOUT_SECONDS = float(os.environ.get('ROUTING_TIMEOUT_SECONDS', '4'))


class RouteResult(NamedTuple):
    """Polyligne encodée (précision 5) et distance routière en kilomètres."""
    polyline: str
    distance_km: float


def fetch_route(lat1, lng1, lat2, lng2, timeout: Optional[float] = None) -> Optional[RouteResult]:
    """
    Interroge le routeur pour un trajet en voiture. Retourne None sur toute
    anomalie — réseau, format inattendu, itinéraire introuvable.

    Ne lève JAMAIS : la création d'un trajet ne doit pas échouer parce qu'un
    service tiers est indisponible.

    `timeout` permet aux traitements par lot (backfill) d'être plus patients que
    la publication interactive : le serveur OSRM public dépasse régulièrement
    les 4 secondes.
    """
    from django.conf import settings

    # Coupe-circuit : la suite de tests ne doit pas dependre d'un service tiers,
    # et un incident du routeur doit pouvoir etre neutralise sans redeploiement.
    if not getattr(settings, 'ROUTING_ENABLED', True):
        return None

    try:
        # OSRM attend lng,lat (et non lat,lng) : inverser est l'erreur classique,
        # elle produit un itinéraire au milieu de l'océan.
        coords = f'{float(lng1)},{float(lat1)};{float(lng2)},{float(lat2)}'
    except (TypeError, ValueError):
        return None

    url = f'{OSRM_BASE_URL}/route/v1/driving/{coords}'
    try:
        response = requests.get(
            url,
            # `simplified` et non `full` : mesure sur Sousse -> Sfax, 119
            # caracteres contre 6458, pour une distance identique au dixieme de
            # km. La geometrie part dans CHAQUE resultat de recherche (10 par
            # reponse) : `full` ajouterait ~64 Ko par requete pour un detail
            # invisible sur une carte de 220 px de haut.
            params={'overview': 'simplified', 'geometries': 'polyline'},
            timeout=ROUTING_TIMEOUT_SECONDS if timeout is None else timeout,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning('ROUTING: appel echoue (%s) — repli sur l estimation', exc)
        return None

    if payload.get('code') != 'Ok':
        logger.warning('ROUTING: reponse non Ok (%s)', payload.get('code'))
        return None

    routes = payload.get('routes') or []
    if not routes:
        return None

    route = routes[0]
    geometry = route.get('geometry')
    distance_m = route.get('distance')
    if not isinstance(geometry, str) or not geometry:
        return None
    if not isinstance(distance_m, (int, float)):
        return None

    return RouteResult(polyline=geometry, distance_km=round(distance_m / 1000.0, 1))


def resolve_route_for_job(
    pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
    pickup_governorate, dropoff_governorate,
    timeout: Optional[float] = None,
) -> Optional[RouteResult]:
    """
    Route un trajet à partir des coordonnées précises, avec repli sur les
    centroïdes de gouvernorat — même cascade que l'estimation de distance, pour
    que les deux chiffres portent sur les mêmes points.
    """
    from .pricing import GOVERNORATE_CENTROIDS

    route = fetch_route(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, timeout)
    if route is not None:
        return route

    origin = GOVERNORATE_CENTROIDS.get((pickup_governorate or '').strip().lower())
    destination = GOVERNORATE_CENTROIDS.get((dropoff_governorate or '').strip().lower())
    if origin and destination:
        return fetch_route(origin[0], origin[1], destination[0], destination[1], timeout)
    return None


def annotate_distance_and_route(validated_data: dict) -> None:
    """
    Renseigne `distance_km` et `route_polyline` sur les données de création.

    La distance vient du routeur quand il répond : le tracé affiché et le
    kilométrage proviennent alors du même calcul, donc ne se contredisent pas.
    Sinon on retombe sur l'estimation historique (haversine × 1.25), qui
    surestime d'environ 13 % sur les corridors autoroutiers.
    """
    from .pricing import estimate_distance_for_job

    args = (
        validated_data.get('pickup_lat'), validated_data.get('pickup_lng'),
        validated_data.get('dropoff_lat'), validated_data.get('dropoff_lng'),
        validated_data.get('pickup_governorate'), validated_data.get('dropoff_governorate'),
    )

    route = resolve_route_for_job(*args)
    if route is not None:
        validated_data['distance_km'] = route.distance_km
        validated_data['route_polyline'] = route.polyline
        return

    validated_data['distance_km'] = estimate_distance_for_job(*args)
    validated_data['route_polyline'] = ''
