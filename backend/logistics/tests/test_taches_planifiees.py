"""
Tâches planifiées lancées par un cron externe (transporti_core/cron.py).

Ce que ces tests protègent : sur l'offre gratuite, c'est cette route qui
remplace le service « worker ». Si elle s'ouvrait sans secret, n'importe qui
pourrait déclencher la purge KYC ; si elle mélangeait les groupes, la purge
quotidienne tournerait toutes les heures. Et /ping/ ne doit jamais toucher la
base : il est appelé en boucle, et réveillerait Neon à chaque fois.
"""
from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.test import TestCase, override_settings

URL = '/api/v1/taches-planifiees/'
SECRET = 'secret-de-recette-0123456789'
APPEL = 'logistics.taches_planifiees.call_command'


@override_settings(CRON_SECRET=SECRET)
class RouteDesTachesPlanifieesTests(TestCase):

    def _appeler(self, groupe='frequentes', jeton=SECRET):
        entetes = {'HTTP_AUTHORIZATION': f'Bearer {jeton}'} if jeton else {}
        return self.client.post(f'{URL}?groupe={groupe}', **entetes)

    def test_lance_seulement_les_taches_du_groupe(self):
        with mock.patch(APPEL) as appel:
            reponse = self._appeler('quotidiennes')

        self.assertEqual(reponse.status_code, 200)
        lancees = [c.args[0] for c in appel.call_args_list]
        self.assertEqual(lancees, ['reveal_stale_reviews', 'purge_kyc_documents'])
        self.assertEqual(reponse.json()['taches'], {
            'reveal_stale_reviews': True, 'purge_kyc_documents': True,
        })

    def test_les_taches_frequentes_ne_lancent_pas_la_purge(self):
        with mock.patch(APPEL) as appel:
            self._appeler('frequentes')

        lancees = [c.args[0] for c in appel.call_args_list]
        self.assertEqual(lancees, ['expire_stale_offers', 'auto_release_escrow'])

    def test_refuse_un_mauvais_jeton_ou_son_absence(self):
        with mock.patch(APPEL) as appel:
            self.assertEqual(self._appeler(jeton='faux').status_code, 401)
            self.assertEqual(self._appeler(jeton=None).status_code, 401)
        appel.assert_not_called()

    @override_settings(CRON_SECRET='')
    def test_sans_secret_configure_la_route_n_existe_pas(self):
        with mock.patch(APPEL) as appel:
            self.assertEqual(self._appeler(jeton='').status_code, 404)
        appel.assert_not_called()

    def test_refuse_un_groupe_inconnu(self):
        with mock.patch(APPEL) as appel:
            self.assertEqual(self._appeler('toutes').status_code, 400)
        appel.assert_not_called()

    def test_refuse_un_get(self):
        reponse = self.client.get(f'{URL}?groupe=frequentes', HTTP_AUTHORIZATION=f'Bearer {SECRET}')
        self.assertEqual(reponse.status_code, 405)

    def test_une_tache_en_echec_n_arrete_pas_les_suivantes_et_donne_500(self):
        def appel(commande):
            if commande == 'expire_stale_offers':
                raise RuntimeError('base indisponible')

        with mock.patch(APPEL, side_effect=appel) as simule:
            reponse = self._appeler('frequentes')

        self.assertEqual(reponse.status_code, 500)
        self.assertEqual(simule.call_count, 2)
        self.assertEqual(reponse.json()['taches'], {
            'expire_stale_offers': False, 'auto_release_escrow': True,
        })


class PingTests(TestCase):

    def test_repond_sans_aucune_requete_en_base(self):
        with self.assertNumQueries(0):
            reponse = self.client.get('/ping/')

        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.json(), {'status': 'ok'})


class CommandeUneFoisParGroupeTests(TestCase):

    def test_once_avec_groupe_ne_lance_que_ce_groupe(self):
        with mock.patch(APPEL) as appel:
            call_command('run_scheduled_tasks', once=True, groupe='quotidiennes', stdout=StringIO())

        lancees = [c.args[0] for c in appel.call_args_list]
        self.assertEqual(lancees, ['reveal_stale_reviews', 'purge_kyc_documents'])

    def test_once_sans_groupe_lance_tout(self):
        with mock.patch(APPEL) as appel:
            call_command('run_scheduled_tasks', once=True, stdout=StringIO())

        self.assertEqual(appel.call_count, 4)
