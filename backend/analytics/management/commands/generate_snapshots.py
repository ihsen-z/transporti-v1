"""
Generate Daily Snapshots - Management Command
Run via cron: python manage.py generate_snapshots
"""
from django.core.management.base import BaseCommand
from analytics.services import generate_daily_snapshots


class Command(BaseCommand):
    help = 'Generate daily user snapshots for analytics'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show count without generating snapshots',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            from django.utils import timezone
            from datetime import timedelta
            from users.models import User
            
            cutoff = timezone.now() - timedelta(days=30)
            count = User.objects.filter(
                last_seen_at__gte=cutoff
            ).exclude(role__in=['ADMIN', 'MODERATOR']).count()
            
            self.stdout.write(f'[DRY RUN] Would generate snapshots for {count} users.')
            return
        
        count = generate_daily_snapshots()
        self.stdout.write(self.style.SUCCESS(f'✓ Generated {count} daily snapshots.'))
