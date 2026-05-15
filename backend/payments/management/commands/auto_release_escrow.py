"""
P1-03: Auto-release escrow management command.

Releases escrow for COMPLETED jobs older than 72 hours
where the client has not confirmed and no active dispute exists.

Usage:
    python manage.py auto_release_escrow
    (Schedule via cron or Celery beat)
"""
import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from logistics.models import TransportJob
from payments.models import EscrowTransaction
from payments.services import release_escrow_on_completion
from support.models import Dispute

logger = logging.getLogger('transporti')


class Command(BaseCommand):
    help = 'Auto-release escrow for completed jobs after 72h with no dispute (P1-03)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=72,
            help='Number of hours after completion to auto-release (default: 72)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print what would be released without actually releasing',
        )

    def handle(self, *args, **options):
        hours = options['hours']
        dry_run = options['dry_run']
        cutoff = timezone.now() - timedelta(hours=hours)

        # Find COMPLETED jobs with HELD escrow, completed before cutoff
        eligible_jobs = TransportJob.objects.filter(
            status=TransportJob.Status.COMPLETED,
            updated_at__lt=cutoff,  # completed_at approximated by updated_at
        ).exclude(
            # Exclude jobs with active disputes
            id__in=Dispute.objects.filter(
                status__in=['OPEN', 'INVESTIGATING']
            ).values_list('job_id', flat=True)
        )

        released_count = 0
        skipped_count = 0
        error_count = 0

        for job in eligible_jobs:
            # Check if escrow is still HELD (not already released)
            escrow = EscrowTransaction.objects.filter(
                booking_reference=job,
                status=EscrowTransaction.Status.HELD,
            ).first()

            if not escrow:
                skipped_count += 1
                continue

            if dry_run:
                self.stdout.write(
                    f"[DRY-RUN] Would release escrow #{escrow.id} "
                    f"({escrow.amount} TND) for job #{job.id}"
                )
                released_count += 1
                continue

            try:
                with transaction.atomic():
                    release_escrow_on_completion(
                        job=job,
                        reason=f"Auto-release after {hours}h (no dispute, no client confirmation)"
                    )
                    released_count += 1
                    logger.info(
                        f"AUTO_RELEASE_ESCROW: job_id={job.id}, escrow_id={escrow.id}, "
                        f"amount={escrow.amount}"
                    )
                    self.stdout.write(self.style.SUCCESS(
                        f"✅ Released escrow #{escrow.id} ({escrow.amount} TND) "
                        f"for job #{job.id}"
                    ))

                    # Notify both parties
                    try:
                        from notifications.services import notify_escrow_released
                        notify_escrow_released(escrow)
                    except Exception:
                        pass

            except Exception as e:
                error_count += 1
                logger.error(
                    f"AUTO_RELEASE_ESCROW_FAILED: job_id={job.id}, error={str(e)}"
                )
                self.stdout.write(self.style.ERROR(
                    f"❌ Failed to release escrow for job #{job.id}: {e}"
                ))

        prefix = "[DRY-RUN] " if dry_run else ""
        self.stdout.write(self.style.SUCCESS(
            f"\n{prefix}Auto-release complete: "
            f"{released_count} released, {skipped_count} skipped, {error_count} errors"
        ))
