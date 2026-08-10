"""
P1-03: Auto-release escrow management command.

Releases escrow for COMPLETED jobs with no active dispute, after the delay set
by settings.ESCROW_AUTO_RELEASE_HOURS (48h — decision L2).

Selection is delegated to payments.services.get_escrow_eligible_for_auto_release
so that the dispute guards live in exactly one place. This command used to
re-implement its own query with a 72h cutoff that only excluded OPEN and
INVESTIGATING disputes: a dispute already RESOLVED in the client's favour
(REFUND_CLIENT / SPLIT / NONE) did NOT block it, so the timer could pay the
transporter money that had been ruled to belong to the client.

Usage:
    python manage.py auto_release_escrow
    (Schedule via cron or Celery beat)
"""
import logging
from django.core.management.base import BaseCommand
from django.db import transaction

from payments.services import (
    get_escrow_eligible_for_auto_release,
    release_escrow_on_completion,
)

logger = logging.getLogger('transporti')


class Command(BaseCommand):
    help = 'Auto-release escrow for completed jobs after the L2 delay, disputes excluded (P1-03)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=None,
            help='Override the delay in hours (default: settings.ESCROW_AUTO_RELEASE_HOURS)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print what would be released without actually releasing',
        )

    def handle(self, *args, **options):
        hours = options['hours']
        dry_run = options['dry_run']

        # Single source of truth for eligibility, including the L2 dispute guards
        eligible_escrows = get_escrow_eligible_for_auto_release(hours=hours)

        released_count = 0
        skipped_count = 0
        error_count = 0

        for escrow in eligible_escrows:
            job = escrow.booking_reference

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
                        reason=(
                            "Auto-release after the L2 delay "
                            "(no dispute, no client confirmation)"
                        )
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
