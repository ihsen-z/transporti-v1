"""
Auto-release escrow after 48h for completed jobs.
Run via cron: python manage.py auto_release_escrow
"""
from django.core.management.base import BaseCommand
from payments.services import get_escrow_eligible_for_auto_release, release_escrow_on_completion


class Command(BaseCommand):
    help = 'Auto-release escrow for completed jobs after 48h'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show eligible escrow without releasing',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Get eligible escrow
        eligible = get_escrow_eligible_for_auto_release()
        
        if not eligible:
            self.stdout.write(self.style.SUCCESS('No escrow eligible for auto-release.'))
            return
        
        self.stdout.write(f'Found {len(eligible)} escrow transaction(s) eligible for auto-release:')
        
        released_count = 0
        error_count = 0
        
        for escrow in eligible:
            job = escrow.booking_reference
            
            if dry_run:
                self.stdout.write(f'  [DRY RUN] Would release: Escrow #{escrow.id} for Job #{job.id}')
                continue
            
            try:
                release_escrow_on_completion(
                    job=job,
                    reason=f'Auto-release after 48h (Job #{job.id})'
                )
                released_count += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ Released: Escrow #{escrow.id} for Job #{job.id}'))
            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f'  ✗ Failed: Escrow #{escrow.id} - {str(e)}'))
        
        if not dry_run:
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS(f'Released: {released_count}'))
            if error_count > 0:
                self.stdout.write(self.style.WARNING(f'Errors: {error_count}'))
