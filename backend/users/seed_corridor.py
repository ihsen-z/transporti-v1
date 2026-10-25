"""
Catalogue de demonstration du corridor pilote Tunis - Sousse - Sfax.

Pourquoi ce module existe. Le jeu de donnees fixe ne contenait qu'UN trajet
retour reservable (le n° 8, Sousse -> Tunis). L'audit de lancement du 06/09
l'a releve (m-06) : une seule reservation d'essai vidait le catalogue, et
toute demonstration suivante tombait sur l'etat vide. Or le pilote se fait
sur ce corridor, avec les vehicules vises au lancement : utilitaires 3,5 t,
porteurs et camions de demenagement.

Ce module ajoute trois transporteurs verifies et douze trajets retour, dans
les deux sens de chaque troncon, etales sur les six prochains jours. Il est
separe de `seed_test_data.py` (deja long de plus de 800 lignes) et appele par
lui : `python manage.py seed_test_data` suffit.

Aucun trajet n'est en reservation immediate : le commutateur est inerte cote
cliente (defaut M-02 de l'audit du 06/09), le n° 8 garde seul ce scenario.
"""
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal
from typing import Optional

from django.utils import timezone

from trust.models import TrustProfile, VerificationStatus
from users.models import User

# Mot de passe commun a tous les comptes du jeu de recette.
MOT_DE_PASSE_RECETTE = 'Test@123!'


@dataclass(frozen=True)
class TransporteurDemo:
    cle: str
    email: str
    username: str
    prenom: str
    nom: str
    telephone: str
    vehicule: str
    capacite_kg: Decimal
    capacite_m3: Optional[Decimal]
    plaque: str


@dataclass(frozen=True)
class TrajetDemo:
    # Identifiants fixes, loin des jobs 1 a 9 du jeu de base : un rejeu
    # retrouve la meme ligne au lieu d'en creer une nouvelle.
    job_id: int
    transporteur: str
    depart: str
    arrivee: str
    dans_jours: int
    heure: int
    capacite_kg: Decimal
    capacite_m3: Optional[Decimal]
    libelle_capacite: str
    prix_min: Decimal
    prix_max: Decimal
    description: str


TRANSPORTEURS = (
    TransporteurDemo(
        cle='youssef', email='youssef.bensalah@test.transporti.tn',
        username='youssef_transporter', prenom='Youssef', nom='Ben Salah',
        telephone='+21650222003', vehicule='Utilitaire 3,5 t',
        capacite_kg=Decimal('1200'), capacite_m3=Decimal('12'), plaque='214 TU 3301',
    ),
    TransporteurDemo(
        cle='nizar', email='nizar.haddad@test.transporti.tn',
        username='nizar_transporter', prenom='Nizar', nom='Haddad',
        telephone='+21650222004', vehicule='Porteur 8 t',
        capacite_kg=Decimal('6000'), capacite_m3=Decimal('30'), plaque='198 TU 7720',
    ),
    TransporteurDemo(
        cle='hatem', email='hatem.mansouri@test.transporti.tn',
        username='hatem_transporter', prenom='Hatem', nom='Mansouri',
        telephone='+21650222005', vehicule='Camion de déménagement',
        capacite_kg=Decimal('3000'), capacite_m3=Decimal('20'), plaque='231 TU 0458',
    ),
)

# Les prix suivent l'ordre de grandeur des retours du jeu de base (100 a
# 140 DT sur Sousse -> Tunis, ~140 km) : un retour se vend sous le prix d'un
# transport dedie, c'est toute la promesse.
TRAJETS = (
    # Tunis <-> Sousse (~140 km)
    TrajetDemo(201, 'youssef', 'Tunis', 'Sousse', 1, 15, Decimal('900'), Decimal('9'),
               '900 kg, 9 m³ libres', Decimal('90'), Decimal('120'),
               'Retour après une livraison à La Marsa. Départ en milieu d’après-midi.'),
    TrajetDemo(202, 'hatem', 'Sousse', 'Tunis', 3, 9, Decimal('2500'), Decimal('18'),
               'Camion presque vide, 18 m³', Decimal('150'), Decimal('200'),
               'Retour de déménagement. Sangles et couvertures à bord.'),
    TrajetDemo(203, 'nizar', 'Tunis', 'Sousse', 5, 7, Decimal('4000'), Decimal('22'),
               '4 tonnes disponibles', Decimal('180'), Decimal('240'),
               'Porteur avec hayon. Palettes acceptées.'),
    # Sousse <-> Sfax (~130 km)
    TrajetDemo(204, 'nizar', 'Sousse', 'Sfax', 1, 6, Decimal('5000'), Decimal('25'),
               '5 tonnes, 25 m³', Decimal('170'), Decimal('230'),
               'Retour vers le dépôt de Sfax. Chargement possible dès 6 h.'),
    TrajetDemo(205, 'youssef', 'Sfax', 'Sousse', 2, 14, Decimal('1000'), Decimal('10'),
               '1 tonne, fourgon couvert', Decimal('80'), Decimal('110'),
               'Fourgon couvert, idéal pour colis et petits meubles.'),
    TrajetDemo(206, 'hatem', 'Sfax', 'Sousse', 4, 10, Decimal('2800'), Decimal('20'),
               'Camion vide, 20 m³', Decimal('140'), Decimal('190'),
               'Retour après un déménagement à Sfax. Aide au chargement possible.'),
    # Tunis <-> Sfax (~270 km)
    TrajetDemo(207, 'hatem', 'Tunis', 'Sfax', 2, 8, Decimal('3000'), Decimal('20'),
               'Camion entier, 20 m³', Decimal('260'), Decimal('340'),
               'Départ tôt le matin, arrivée à Sfax avant midi.'),
    TrajetDemo(208, 'nizar', 'Sfax', 'Tunis', 3, 5, Decimal('6000'), Decimal('30'),
               '6 tonnes, porteur vide', Decimal('320'), Decimal('420'),
               'Porteur vide après livraison à Sfax. Hayon élévateur.'),
    TrajetDemo(209, 'youssef', 'Sfax', 'Tunis', 6, 13, Decimal('1200'), Decimal('12'),
               '1,2 tonne, 12 m³', Decimal('150'), Decimal('200'),
               'Utilitaire 3,5 t, permis B. Arrêt possible à Sousse.'),
    TrajetDemo(210, 'youssef', 'Tunis', 'Sfax', 4, 16, Decimal('800'), Decimal('8'),
               '800 kg disponibles', Decimal('140'), Decimal('180'),
               'Retour vers Sfax en fin de journée.'),
    TrajetDemo(211, 'hatem', 'Sousse', 'Tunis', 6, 11, Decimal('1500'), Decimal('10'),
               'Demi-camion, 10 m³', Decimal('110'), Decimal('150'),
               'Demi-chargement : le reste du camion est déjà réservé.'),
    TrajetDemo(212, 'nizar', 'Sfax', 'Sousse', 5, 15, Decimal('3500'), Decimal('18'),
               '3,5 tonnes disponibles', Decimal('150'), Decimal('210'),
               'Retour à vide vers Sousse, chargement au port de Sfax possible.'),
)


def _creer_transporteur(t: TransporteurDemo) -> User:
    """Cree (ou retrouve) un transporteur verifie avec son vehicule."""
    user, _ = User.objects.get_or_create(
        email=t.email,
        defaults={
            'username': t.username,
            'first_name': t.prenom,
            'last_name': t.nom,
            'phone': t.telephone,
            'role': 'TRANSPORTER',
            'is_phone_verified': True,
        },
    )
    user.set_password(MOT_DE_PASSE_RECETTE)
    user.save()

    # VERIFIE : un transporteur non verifie ne peut ni encaisser ni recevoir
    # de paiement en especes (payments/services.py), le scenario serait faux.
    TrustProfile.objects.get_or_create(
        user=user,
        defaults={
            'verification_status': VerificationStatus.VERIFIED,
            'verified_at': timezone.now() - timedelta(days=20),
            'vehicle_type': t.vehicule,
            'vehicle_capacity_kg': t.capacite_kg,
            'vehicle_capacity_m3': t.capacite_m3,
            'vehicle_plate': t.plaque,
        },
    )
    return user


def _date_du_trajet(dans_jours: int, heure: int):
    """Date relative a maintenant, a heure ronde, pour un catalogue lisible."""
    jour = timezone.localtime() + timedelta(days=dans_jours)
    return jour.replace(hour=heure, minute=0, second=0, microsecond=0)


def seed_corridor(creer_job) -> int:
    """
    Cree les transporteurs et les trajets du corridor. Retourne le nombre de
    trajets.

    `creer_job` est `Command._creer_job` de seed_test_data : la meme fonction
    que le jeu de base, donc la meme annotation de distance que le chemin
    reel de publication.
    """
    transporteurs = {t.cle: _creer_transporteur(t) for t in TRANSPORTEURS}

    for trajet in TRAJETS:
        champs = {
            'owner': transporteurs[trajet.transporteur],
            'job_type': 'TRANSPORT',
            'status': 'PUBLISHED',
            'is_return_trip': True,
            'available_capacity': trajet.libelle_capacite,
            'available_capacity_kg': trajet.capacite_kg,
            'pickup_address': f'Centre Ville, {trajet.depart}',
            'pickup_governorate': trajet.depart,
            'dropoff_address': f'Centre Ville, {trajet.arrivee}',
            'dropoff_governorate': trajet.arrivee,
            'scheduled_time': _date_du_trajet(trajet.dans_jours, trajet.heure),
            'price_tnd_min': trajet.prix_min,
            'price_tnd_max': trajet.prix_max,
            'description': trajet.description,
        }
        if trajet.capacite_m3 is not None:
            champs['available_capacity_m3'] = trajet.capacite_m3

        # Comme pour le n° 8 : un rejeu ramene la date dans le futur et
        # republie le trajet (une reservation d'essai l'a peut-etre consomme).
        creer_job(trajet.job_id, champs, rafraichir=('scheduled_time', 'status'))

    return len(TRAJETS)
