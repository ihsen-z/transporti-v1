"""
Management command: expire_stale_offers
Auto-expire offers whose valid_until < now() and status is still PENDING.
Also expires any PENDING counter-offers attached to expired offers.

Usage:
    python manage.py expire_stale_offers
    python manage.py expire_stale_offers --dry-run
"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from logistics.models import Offer, CounterOffer

logger = logging.getLogger('transporti')


class Command(BaseCommand):
    help = 'Auto-expire PENDING offers whose valid_until has passed + their counter-offers'

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

        # Collect IDs for notifications + counter-offer cleanup
        expired_offer_ids = list(stale_offers.values_list('id', flat=True))
        transporter_ids = list(
            stale_offers.values_list('transporter_id', flat=True).distinct()
        )

        # Bulk expire offers
        updated = stale_offers.update(status=Offer.Status.EXPIRED)

        # Also expire any PENDING counter-offers on these now-expired offers
        counter_expired = CounterOffer.objects.filter(
            offer_id__in=expired_offer_ids,
            status=CounterOffer.Status.PENDING,
        ).update(status=CounterOffer.Status.EXPIRED)

        # Notify transporters
        try:
            from notifications.services import create_notification
            for tid in transporter_ids:
                create_notification(
                    user_id=tid,
                    title="Offre(s) expirée(s)",
                    message=f"{updated} de vos offre(s) ont expiré automatiquement.",
                    category="JOB",
                )
        except Exception:
            pass  # Notification failure must never block maintenance

        self.stdout.write(
            self.style.SUCCESS(
                f'Expired {updated} offer(s) + {counter_expired} counter-offer(s).'
            )
        )
        logger.info(
            f'EXPIRE_STALE_OFFERS: offers={updated}, counters={counter_expired}, '
            f'timestamp={now.isoformat()}'
        )
