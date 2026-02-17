"""
Management command: archive_old_jobs
Cancel PUBLISHED jobs whose scheduled_time has passed — these are stale listings
that were never matched with a transporter.

Usage:
    python manage.py archive_old_jobs
    python manage.py archive_old_jobs --dry-run
    python manage.py archive_old_jobs --grace-hours 12
"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from logistics.models import TransportJob

logger = logging.getLogger('transporti')


class Command(BaseCommand):
    help = 'Cancel PUBLISHED jobs whose scheduled_time has passed'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be archived without making changes',
        )
        parser.add_argument(
            '--grace-hours',
            type=int,
            default=0,
            help='Grace period in hours after scheduled_time before archiving (default: 0)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        grace_hours = options['grace_hours']
        now = timezone.now()
        cutoff = now - timedelta(hours=grace_hours)

        stale_jobs = TransportJob.objects.filter(
            status=TransportJob.Status.PUBLISHED,
            scheduled_time__lt=cutoff,
        )

        count = stale_jobs.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No stale jobs found.'))
            return

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'[DRY-RUN] Would archive {count} stale job(s):')
            )
            for job in stale_jobs[:20]:
                self.stdout.write(
                    f'  - Job #{job.id} "{job.job_type}" — '
                    f'scheduled={job.scheduled_time}, '
                    f'owner={job.owner_id}'
                )
            return

        # Archive each job: set status to CANCELLED and mark as auto-archived in specifications
        archived_count = 0
        for job in stale_jobs:
            specs = job.specifications or {}
            specs['_auto_archived'] = True
            specs['_archived_at'] = now.isoformat()
            job.specifications = specs
            job.status = TransportJob.Status.CANCELLED
            job.save(update_fields=['status', 'specifications', 'updated_at'])
            archived_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'Successfully archived {archived_count} stale job(s).')
        )
        logger.info(
            f'ARCHIVE_OLD_JOBS: archived={archived_count}, '
            f'cutoff={cutoff.isoformat()}, timestamp={now.isoformat()}'
        )
