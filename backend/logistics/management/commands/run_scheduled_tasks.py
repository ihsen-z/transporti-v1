"""
Management command: run_scheduled_tasks
Executes periodic maintenance tasks in a loop.
For environments without native cron (e.g. Windows dev, simple Docker).

En production (offre gratuite, sans « worker »), les mêmes tâches sont
déclenchées par un cron externe via POST /api/v1/taches-planifiees/
(voir logistics/taches_planifiees.py).

Usage:
    python manage.py run_scheduled_tasks
    python manage.py run_scheduled_tasks --once (single run, no loop)
    python manage.py run_scheduled_tasks --once --groupe quotidiennes
"""
import time

from django.core.management.base import BaseCommand
from django.utils import timezone

from logistics.taches_planifiees import GROUPES, TACHES, executer_groupe, executer_tache


class Command(BaseCommand):
    help = 'Run all scheduled maintenance tasks in a loop'

    def add_arguments(self, parser):
        parser.add_argument(
            '--once',
            action='store_true',
            help='Run all tasks once and exit (no loop)',
        )
        parser.add_argument(
            '--groupe',
            choices=GROUPES,
            help="Avec --once : ne lancer qu'un groupe de tâches",
        )

    def handle(self, *args, **options):
        if options['once']:
            groupes = [options['groupe']] if options['groupe'] else list(GROUPES)
            self.stdout.write(self.style.NOTICE(
                f'[{timezone.now().isoformat()}] Running once: {", ".join(groupes)}...'
            ))
            for groupe in groupes:
                self._afficher(executer_groupe(groupe))
            return

        self.stdout.write(self.style.SUCCESS(
            f'[{timezone.now().isoformat()}] Scheduler started. '
            f'{len(TACHES)} tasks registered.'
        ))

        # Track last execution time per task
        last_run = {commande: 0.0 for commande, *_ in TACHES}

        try:
            while True:
                now = time.time()
                for commande, intervalle, description, _groupe in TACHES:
                    if now - last_run[commande] >= intervalle:
                        self._afficher({commande: executer_tache(commande, description)})
                        last_run[commande] = now

                # Sleep 60 seconds between checks
                time.sleep(60)

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\nScheduler stopped.'))

    def _afficher(self, resultats: dict[str, bool]):
        for commande, reussie in resultats.items():
            if reussie:
                self.stdout.write(self.style.SUCCESS(f'  ✓ {commande} completed'))
            else:
                self.stdout.write(self.style.ERROR(f'  ✗ {commande} failed (see logs)'))
