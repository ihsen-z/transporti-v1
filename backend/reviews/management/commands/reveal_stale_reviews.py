"""
Management command: reveal_stale_reviews
Auto-reveal reviews older than 7 days that have not been revealed.
Run via cron: python manage.py reveal_stale_reviews
"""
import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from reviews.models import Review

logger = logging.getLogger('transporti')

# Number of days after which reviews are auto-revealed
REVEAL_WINDOW_DAYS = 7


class Command(BaseCommand):
    help = 'Auto-reveal reviews older than 7 days (double-blind timeout)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be revealed without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        cutoff = timezone.now() - timedelta(days=REVEAL_WINDOW_DAYS)

        stale_reviews = Review.objects.filter(
            is_revealed=False,
            created_at__lt=cutoff,
        )

        count = stale_reviews.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No stale reviews to reveal.'))
            return

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'[DRY-RUN] Would reveal {count} review(s):')
            )
            for review in stale_reviews[:20]:
                self.stdout.write(
                    f'  - Review #{review.id} (Job #{review.job_id}) — '
                    f'role={review.role}, created={review.created_at}, '
                    f'reviewer={review.reviewer_id}'
                )
            return

        # Bulk update
        updated = stale_reviews.update(
            is_revealed=True,
            revealed_at=timezone.now()
        )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully revealed {updated} stale review(s).')
        )
        logger.info(
            f'REVEAL_STALE_REVIEWS: revealed={updated}, cutoff={cutoff.isoformat()}'
        )
