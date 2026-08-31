"""
`job_is_return_trip` sur les notifications.

Le front construit l'URL canonique d'un job (/demandes/<id> ou /trajets/<id>)
directement depuis la notification. Sans ce champ il devait recharger le job
via une route de resolution, qui affiche un ecran d'attente avant de rediriger.

Trois choses sont verrouillees ici, et une seule des trois se voit a l'oeil :

- la valeur juste pour un trajet retour et pour une demande classique ;
- `None` — et NON `False` — quand la nature est inconnue. `False` signifierait
  « demande classique » et enverrait le lecteur sur la mauvaise route, sans
  aucun signal. C'est le cas d'un job supprime depuis l'emission ;
- une seule requete pour la page entiere. Une resolution par notification
  passerait tous les tests fonctionnels en restant un N+1.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from logistics.models import TransportJob
from notifications.models import Notification, NotificationCategory, NotificationType
from notifications.serializers import NotificationListSerializer

User = get_user_model()


class NatureDuJobSurNotificationTests(TestCase):
    def setUp(self):
        self.proprietaire = User.objects.create_user(
            username='notif_owner', email='notif_owner@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
            first_name='Nota', last_name='Bene',
        )
        self.lecteur = User.objects.create_user(
            username='notif_lecteur', email='notif_lecteur@test.tn',
            password='SecurePass123!', role='CLIENT',
            first_name='Lec', last_name='Teur',
        )

    def _job(self, is_return_trip):
        return TransportJob.objects.create(
            owner=self.proprietaire,
            job_type='TRANSPORT',
            status=TransportJob.Status.PUBLISHED,
            is_return_trip=is_return_trip,
            pickup_address='Centre Sousse', pickup_governorate='Sousse',
            dropoff_address='Centre Tunis', dropoff_governorate='Tunis',
            scheduled_time=timezone.now() + timedelta(days=2),
            price_tnd_min=Decimal('120'),
        )

    def _notif(self, metadata):
        return Notification.objects.create(
            user=self.lecteur,
            type=NotificationType.OFFER_RECEIVED,
            category=NotificationCategory.JOB,
            title='Titre', message='Message',
            metadata=metadata,
        )

    def _serialise(self, notifications):
        return NotificationListSerializer(notifications, many=True).data

    def test_trajet_retour_et_demande_classique_sont_distingues(self):
        retour = self._job(is_return_trip=True)
        classique = self._job(is_return_trip=False)
        notifs = [
            self._notif({'job_id': retour.id}),
            self._notif({'job_id': classique.id}),
        ]

        par_job = {
            d['metadata']['job_id']: d['job_is_return_trip']
            for d in self._serialise(notifs)
        }

        self.assertIs(par_job[retour.id], True)
        self.assertIs(par_job[classique.id], False)

    def test_job_supprime_donne_none_et_non_false(self):
        """
        Le cas qui ne se voit pas. `False` serait lu comme « demande
        classique » et construirait une URL fausse en silence.
        """
        job = self._job(is_return_trip=True)
        job_id = job.id
        notif = self._notif({'job_id': job_id})
        job.delete()

        (donnees,) = self._serialise([notif])

        self.assertIsNone(donnees['job_is_return_trip'])

    def test_notification_sans_job_donne_none(self):
        notif = self._notif({'review_id': 7})

        (donnees,) = self._serialise([notif])

        self.assertIsNone(donnees['job_is_return_trip'])

    def test_metadata_vide_donne_none(self):
        """
        `metadata` est `default=dict` et NOT NULL en base : il ne vaut jamais
        None, mais il peut etre vide. Le champ doit alors dire « je ne sais
        pas », pas « demande classique ».
        """
        notif = self._notif({})

        (donnees,) = self._serialise([notif])

        self.assertIsNone(donnees['job_is_return_trip'])

    def test_une_seule_requete_pour_toute_la_page(self):
        """
        Anti N+1. Dix notifications sur dix jobs distincts : la resolution des
        natures doit couter UNE requete, pas dix. Un test purement fonctionnel
        laisserait passer la version naive.
        """
        notifs = [self._notif({'job_id': self._job(i % 2 == 0).id}) for i in range(10)]

        with self.assertNumQueries(1):
            donnees = self._serialise(notifs)

        # La requete unique doit quand meme avoir donne les bonnes valeurs :
        # un cache vide couterait aussi une requete.
        self.assertEqual(
            [d['job_is_return_trip'] for d in donnees],
            [i % 2 == 0 for i in range(10)],
        )
