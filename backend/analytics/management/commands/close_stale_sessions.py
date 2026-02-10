"""
Close stale sessions - Management Command
Run via cron: python manage.py close_stale_sessions
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from analytics.models import UserSession


class Command(BaseCommand):
    help = 'Close stale user sessions (inactive for 30+ minutes)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show sessions to close without closing them',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        cutoff = timezone.now() - timedelta(minutes=30)
        
        # Find stale sessions
        stale_sessions = UserSession.objects.filter(
            ended_at__isnull=True,
            last_activity_at__lt=cutoff
        )
        
        count = stale_sessions.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No stale sessions to close.'))
            return
        
        self.stdout.write(f'Found {count} stale session(s):')
        
        closed = 0
        for session in stale_sessions:
            if dry_run:
                self.stdout.write(f'  [DRY RUN] Would close: {session.session_id} ({session.user.email})')
            else:
                session.close_session()
                closed += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ Closed: {session.session_id}'))
        
        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f'\nClosed {closed} session(s).'))
