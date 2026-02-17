"""
Management command: expire_stale_offers
Auto-expire offers whose valid_until < now() and status is still PENDING.

Usage:
    python manage.py expire_stale_offers
    python manage.py expire_stale_offers --dry-run
"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from logistics.models import Offer

logger = logging.getLogger('transporti')


class Command(BaseCommand):
    help = 'Auto-expire PENDING offers whose valid_until has passed'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be expired without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()

        stale_offers = Offer.objects.filter(
            status=Offer.Status.PENDING,
            valid_until__lt=now,
        )

        count = stale_offers.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No stale offers found.'))
            return

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'[DRY-RUN] Would expire {count} stale offer(s):')
            )
            for offer in stale_offers[:20]:
                self.stdout.write(
                    f'  - Offer #{offer.id} (Job #{offer.job_id}) — '
                    f'valid_until={offer.valid_until}, '
                    f'transporter={offer.transporter_id}'
                )
            return

        # Bulk update
        updated = stale_offers.update(status=Offer.Status.EXPIRED)

        self.stdout.write(
            self.style.SUCCESS(f'Successfully expired {updated} stale offer(s).')
        )
        logger.info(
            f'EXPIRE_STALE_OFFERS: expired={updated}, timestamp={now.isoformat()}'
        )
