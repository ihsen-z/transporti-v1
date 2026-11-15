"""
Règle produit « coordonnées masquées avant accord », appliquée aux adresses.

Sur une demande publiée par un CLIENT, l'adresse exacte, les indications
d'accès (étage, code de porte) et le tracé de l'itinéraire désignent son
domicile ou son local. Tant qu'aucun transporteur n'est engagé, n'importe quel
compte — et même un visiteur — pouvait les lire en listant les demandes.

Ce module décide QUI voit l'adresse exacte et produit la version publique :
le gouvernorat, des coordonnées arrondies (≈ 1 km) et aucune indication.

Les trajets retour ne sont pas concernés : leur départ et leur arrivée sont
l'annonce du transporteur lui-même, saisie pour être publique. L'adresse du
client d'un trajet retour vit sur sa demande (ReturnTripRequest), qu'il
n'envoie qu'au transporteur de son choix.
"""

# Texte affiché quand la demande n'a même pas de gouvernorat renseigné.
MASKED_ADDRESS_FALLBACK = "Adresse communiquée après accord"

# 2 décimales ≈ 1,1 km : assez pour situer le quartier sur une carte et
# estimer une distance, pas assez pour trouver une porte.
COORD_DECIMALS = 2

_COORD_FIELDS = ('pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng')
_HINT_FIELDS = ('pickup_hint', 'dropoff_hint')
_STAFF_ROLES = ('ADMIN', 'MODERATOR')


def can_see_exact_addresses(user, job) -> bool:
    """Vrai si `user` a le droit de lire l'adresse exacte de `job`."""
    if getattr(job, 'is_return_trip', False):
        return True
    if user is None or not getattr(user, 'is_authenticated', False):
        return False
    # Le propriétaire d'abord : c'est le cas courant et il ne coûte aucune requête.
    if job.owner_id == user.id:
        return True
    if getattr(user, 'role', None) in _STAFF_ROLES:
        return True
    # Import local : participants importe les modèles de logistics.
    from .participants import is_job_participant
    return is_job_participant(user, job)


def public_address(governorate) -> str:
    """Version publique d'une adresse : son gouvernorat, rien de plus."""
    return governorate or MASKED_ADDRESS_FALLBACK


def visible_address(user, job, side: str) -> str:
    """Adresse de `side` ('pickup' ou 'dropoff') telle que `user` peut la lire."""
    if can_see_exact_addresses(user, job):
        return getattr(job, f'{side}_address')
    return public_address(getattr(job, f'{side}_governorate', ''))


def _round_coord(value):
    """Arrondit une coordonnée en gardant son type (DRF rend parfois une chaîne)."""
    if value is None or value == '':
        return value
    rounded = round(float(value), COORD_DECIMALS)
    return f"{rounded:.{COORD_DECIMALS}f}" if isinstance(value, str) else rounded


def mask_job_data(data: dict, job) -> dict:
    """Remplace dans `data` (un job sérialisé) tout ce qui situe une porte."""
    if 'pickup_address' in data:
        data['pickup_address'] = public_address(job.pickup_governorate)
    if 'dropoff_address' in data:
        data['dropoff_address'] = public_address(job.dropoff_governorate)
    for field in _COORD_FIELDS:
        if field in data:
            data[field] = _round_coord(data[field])
    for field in _HINT_FIELDS:
        if field in data:
            data[field] = ''
    # Le tracé commence et finit exactement devant les deux adresses.
    if 'route_polyline' in data:
        data['route_polyline'] = ''
    return data


def user_from_context(context):
    """Utilisateur de la requête, ou None si le serializer est appelé sans elle."""
    request = context.get('request') if context else None
    return getattr(request, 'user', None)


class ExactAddressesAfterAgreementMixin:
    """
    À poser sur un serializer de TransportJob : masque les adresses pour qui
    n'est pas engagé dans la mission, et l'annonce par `addresses_masked` pour
    que les écrans puissent l'expliquer.

    Sans requête dans le contexte, on masque : mieux vaut une adresse vague
    qu'une fuite par un appel qui a oublié de passer la requête.
    """

    def to_representation(self, obj):
        data = super().to_representation(obj)
        visible = can_see_exact_addresses(user_from_context(self.context), obj)
        data['addresses_masked'] = not visible
        if not visible:
            mask_job_data(data, obj)
        return data
