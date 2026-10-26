"""
Tâches de maintenance périodiques, rangées par fréquence.

Deux façons de les lancer :
- la commande `run_scheduled_tasks` (boucle continue, pour un service
  « worker » ou le développement local) ;
- la route protégée POST /api/v1/taches-planifiees/ (transporti_core/cron.py),
  appelée par un cron externe gratuit. C'est le mode de production retenu le
  26/10/2026 : l'offre gratuite de Render n'a pas de service « worker ».

Le cron externe appelle chaque groupe à sa fréquence : FREQUENTES toutes les
heures, QUOTIDIENNES une fois par nuit. Toutes ces commandes peuvent être
relancées sans risque : elles ne traitent que ce qui est échu.
"""
import logging

from django.core.management import call_command
from django.utils import timezone

logger = logging.getLogger('transporti')

FREQUENTES = 'frequentes'
QUOTIDIENNES = 'quotidiennes'

# (commande, intervalle en secondes pour la boucle, description, groupe)
TACHES = [
    ('expire_stale_offers', 30 * 60, 'Expire stale PENDING offers', FREQUENTES),
    ('auto_release_escrow', 4 * 60 * 60, 'Auto-release escrow after 48h', FREQUENTES),
    ('reveal_stale_reviews', 24 * 60 * 60, 'Auto-reveal reviews after 7 days', QUOTIDIENNES),
    ('purge_kyc_documents', 24 * 60 * 60, 'Purge KYC documents 5 years past expiry', QUOTIDIENNES),
]

GROUPES = (FREQUENTES, QUOTIDIENNES)


def executer_tache(commande: str, description: str) -> bool:
    """Lance une commande ; une erreur est journalisée, jamais propagée."""
    horodatage = timezone.now().isoformat()
    try:
        call_command(commande)
    except Exception as exc:  # une tâche en échec ne doit pas bloquer les suivantes
        logger.error(f'SCHEDULER_TASK_FAILED: task={commande}, error={exc}, timestamp={horodatage}')
        return False
    logger.info(f'SCHEDULER_TASK_OK: task={commande}, timestamp={horodatage} ({description})')
    return True


def executer_groupe(groupe: str) -> dict[str, bool]:
    """Lance toutes les tâches d'un groupe ; renvoie {commande: réussie}."""
    if groupe not in GROUPES:
        raise ValueError(f'groupe inconnu : {groupe!r}')
    return {
        commande: executer_tache(commande, description)
        for commande, _intervalle, description, g in TACHES
        if g == groupe
    }
