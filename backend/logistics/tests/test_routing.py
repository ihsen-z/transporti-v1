"""
Routage : geometrie et distance reelles (logistics/routing.py).

Aucun de ces tests ne sort sur le reseau — requests.get est toujours simule.
Un test de routage qui appelle vraiment OSRM serait lent et casserait le jour
ou le service tombe, ce qui n'apprendrait rien sur notre code.
"""
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from logistics.routing import (
    annotate_distance_and_route,
    fetch_route,
    resolve_route_for_job,
)

# Sousse et Sfax, chefs-lieux.
SOUSSE = (35.8254, 10.636)
SFAX = (34.7406, 10.7603)

OK_PAYLOAD = {
    'code': 'Ok',
    'routes': [{'geometry': 'abc123', 'distance': 133_500.0}],
}


class FakeResponse:
    """Reponse HTTP minimale : juste ce que fetch_route consomme."""

    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


@override_settings(ROUTING_ENABLED=True)
class FetchRouteTests(SimpleTestCase):
    def test_convertit_les_metres_en_kilometres(self):
        with patch('logistics.routing.requests.get', return_value=FakeResponse(OK_PAYLOAD)):
            route = fetch_route(*SOUSSE, *SFAX)

        self.assertIsNotNone(route)
        self.assertEqual(route.polyline, 'abc123')
        self.assertEqual(route.distance_km, 133.5)

    def test_envoie_les_coordonnees_en_lng_lat(self):
        # Inverser lat/lng est l'erreur classique : elle produit un itineraire
        # au milieu de l'ocean sans lever la moindre exception.
        with patch('logistics.routing.requests.get', return_value=FakeResponse(OK_PAYLOAD)) as get:
            fetch_route(*SOUSSE, *SFAX)

        url = get.call_args.args[0]
        self.assertIn('10.636,35.8254;10.7603,34.7406', url)

    def test_demande_une_geometrie_simplifiee(self):
        # `full` pesait 6458 caracteres contre 119, pour la meme distance, et
        # part dans chaque resultat de recherche.
        with patch('logistics.routing.requests.get', return_value=FakeResponse(OK_PAYLOAD)) as get:
            fetch_route(*SOUSSE, *SFAX)

        self.assertEqual(get.call_args.kwargs['params']['overview'], 'simplified')

    def test_rend_none_sur_coordonnees_invalides(self):
        with patch('logistics.routing.requests.get') as get:
            self.assertIsNone(fetch_route(None, None, *SFAX))
        get.assert_not_called()

    def test_rend_none_quand_le_routeur_echoue(self):
        import requests

        with patch('logistics.routing.requests.get', side_effect=requests.Timeout('trop lent')):
            self.assertIsNone(fetch_route(*SOUSSE, *SFAX))

    def test_rend_none_sur_reponse_non_ok(self):
        payload = {'code': 'NoRoute', 'routes': []}
        with patch('logistics.routing.requests.get', return_value=FakeResponse(payload)):
            self.assertIsNone(fetch_route(*SOUSSE, *SFAX))

    def test_rend_none_sur_geometrie_absente(self):
        payload = {'code': 'Ok', 'routes': [{'distance': 1000.0}]}
        with patch('logistics.routing.requests.get', return_value=FakeResponse(payload)):
            self.assertIsNone(fetch_route(*SOUSSE, *SFAX))

    def test_rend_none_sur_distance_non_numerique(self):
        payload = {'code': 'Ok', 'routes': [{'geometry': 'abc', 'distance': 'loin'}]}
        with patch('logistics.routing.requests.get', return_value=FakeResponse(payload)):
            self.assertIsNone(fetch_route(*SOUSSE, *SFAX))


class RoutingDisabledTests(SimpleTestCase):
    @override_settings(ROUTING_ENABLED=False)
    def test_le_coupe_circuit_evite_tout_appel_reseau(self):
        # Sert pendant les tests (la suite passait de 170 s a 124 s) et permet
        # de neutraliser un incident du routeur sans redeploiement.
        with patch('logistics.routing.requests.get') as get:
            self.assertIsNone(fetch_route(*SOUSSE, *SFAX))
        get.assert_not_called()


@override_settings(ROUTING_ENABLED=True)
class ResolveRouteForJobTests(SimpleTestCase):
    def test_retombe_sur_les_centroides_sans_coordonnees_precises(self):
        with patch('logistics.routing.requests.get', return_value=FakeResponse(OK_PAYLOAD)) as get:
            route = resolve_route_for_job(None, None, None, None, 'Sousse', 'Sfax')

        self.assertIsNotNone(route)
        # Un seul appel : les coordonnees precises manquantes sont ecartees
        # avant la requete, pas apres.
        self.assertEqual(get.call_count, 1)

    def test_rend_none_quand_le_gouvernorat_est_inconnu(self):
        with patch('logistics.routing.requests.get') as get:
            self.assertIsNone(
                resolve_route_for_job(None, None, None, None, 'Atlantide', 'Sfax')
            )
        get.assert_not_called()


@override_settings(ROUTING_ENABLED=True)
class AnnotateDistanceAndRouteTests(SimpleTestCase):
    def test_renseigne_distance_et_geometrie_du_meme_appel(self):
        data = {
            'pickup_lat': SOUSSE[0], 'pickup_lng': SOUSSE[1],
            'dropoff_lat': SFAX[0], 'dropoff_lng': SFAX[1],
            'pickup_governorate': 'Sousse', 'dropoff_governorate': 'Sfax',
        }
        with patch('logistics.routing.requests.get', return_value=FakeResponse(OK_PAYLOAD)):
            annotate_distance_and_route(data)

        # Meme source : le trace et le kilometrage ne peuvent pas se contredire.
        self.assertEqual(data['distance_km'], 133.5)
        self.assertEqual(data['route_polyline'], 'abc123')

    def test_retombe_sur_l_estimation_quand_le_routeur_est_injoignable(self):
        import requests

        data = {
            'pickup_lat': SOUSSE[0], 'pickup_lng': SOUSSE[1],
            'dropoff_lat': SFAX[0], 'dropoff_lng': SFAX[1],
            'pickup_governorate': 'Sousse', 'dropoff_governorate': 'Sfax',
        }
        with patch('logistics.routing.requests.get', side_effect=requests.Timeout()):
            annotate_distance_and_route(data)

        # Une indisponibilite du routeur ne doit pas faire echouer une
        # publication : distance estimee, geometrie vide, et le mobile trace
        # alors une ligne droite en pointilles.
        self.assertIsNotNone(data['distance_km'])
        self.assertGreater(float(data['distance_km']), 0)
        self.assertEqual(data['route_polyline'], '')
