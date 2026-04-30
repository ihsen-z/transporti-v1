"""
Management command to expire pending offers whose valid_until has passed.

Run periodically via cron or scheduled task:
    python manage.py expire_offers

Example cron (every 30 minutes):
    */30 * * * * cd /path/to/backend && python manage.py expire_offers
"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from logistics.models import Offer

logger = logging.getLogger('transporti')


class Command(BaseCommand):
    help = 'Expire PENDING offers whose valid_until date has passed.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be expired without making changes.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()

        expired_qs = Offer.objects.filter(
            status=Offer.Status.PENDING,
            valid_until__lt=now,
        )

        count = expired_qs.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No expired offers found.'))
            return

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'[DRY RUN] Would expire {count} offer(s):')
            )
            for offer in expired_qs.select_related('job', 'transporter')[:20]:
                self.stdout.write(
                    f'  - Offer #{offer.id} for Job #{offer.job_id} '
                    f'(transporter: {offer.transporter.email}, '
                    f'expired: {offer.valid_until})'
                )
            if count > 20:
                self.stdout.write(f'  ... and {count - 20} more.')
            return

        # Perform the bulk update
        updated = expired_qs.update(status=Offer.Status.EXPIRED)

        logger.info(f'OFFERS_EXPIRED: count={updated}')
        self.stdout.write(
            self.style.SUCCESS(f'Successfully expired {updated} offer(s).')
        )
