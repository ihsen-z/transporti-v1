"""
Management command: run_scheduled_tasks
Executes periodic maintenance tasks in a loop.
For environments without native cron (e.g. Windows dev, simple Docker).

Usage:
    python manage.py run_scheduled_tasks
    python manage.py run_scheduled_tasks --once (single run, no loop)
"""
import time
import logging
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.utils import timezone

logger = logging.getLogger('transporti')

# Task definitions: (command_name, interval_seconds, description)
SCHEDULED_TASKS = [
    ('expire_stale_offers', 30 * 60, 'Expire stale PENDING offers'),          # Every 30 min
    ('auto_release_escrow', 4 * 60 * 60, 'Auto-release escrow after 48h'),    # Every 4 hours
    ('reveal_stale_reviews', 24 * 60 * 60, 'Auto-reveal reviews after 7 days'), # Once daily
]


class Command(BaseCommand):
    help = 'Run all scheduled maintenance tasks in a loop'

    def add_arguments(self, parser):
        parser.add_argument(
            '--once',
            action='store_true',
            help='Run all tasks once and exit (no loop)',
        )

    def handle(self, *args, **options):
        once = options['once']

        if once:
            self.stdout.write(self.style.NOTICE(f'[{timezone.now().isoformat()}] Running all tasks once...'))
            self._run_all_tasks()
            return

        self.stdout.write(self.style.SUCCESS(
            f'[{timezone.now().isoformat()}] Scheduler started. '
            f'{len(SCHEDULED_TASKS)} tasks registered.'
        ))

        # Track last execution time per task
        last_run = {task[0]: 0.0 for task in SCHEDULED_TASKS}

        try:
            while True:
                now = time.time()
                for cmd_name, interval, description in SCHEDULED_TASKS:
                    if now - last_run[cmd_name] >= interval:
                        self._run_task(cmd_name, description)
                        last_run[cmd_name] = now

                # Sleep 60 seconds between checks
                time.sleep(60)

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\nScheduler stopped.'))

    def _run_all_tasks(self):
        """Run every task once."""
        for cmd_name, _interval, description in SCHEDULED_TASKS:
            self._run_task(cmd_name, description)

    def _run_task(self, cmd_name: str, description: str):
        """Execute a single management command safely."""
        timestamp = timezone.now().isoformat()
        try:
            self.stdout.write(f'  [{timestamp}] Running: {description} ({cmd_name})...')
            call_command(cmd_name)
            self.stdout.write(self.style.SUCCESS(f'  [{timestamp}] ✓ {cmd_name} completed'))
            logger.info(f'SCHEDULER_TASK_OK: task={cmd_name}, timestamp={timestamp}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  [{timestamp}] ✗ {cmd_name} failed: {str(e)}'))
            logger.error(f'SCHEDULER_TASK_FAILED: task={cmd_name}, error={str(e)}, timestamp={timestamp}')
