"""
Financial Integrity Services - Transporti V1
Guarantees no financial flow is lost, duplicated, or left undefined.

RULES:
- No silent recovery
- Every anomaly must be logged
- Production-grade error messages only
"""
import logging
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.db.models import Q, F

logger = logging.getLogger('payments')


# =============================================================================
# CONFIGURATION
# =============================================================================

# Timeout for HELD escrows (hours) before considered stuck
ESCROW_STUCK_TIMEOUT_HOURS = 72  # 3 days

# Threshold for unsettled COD before considered overdue (days)
COD_OVERDUE_THRESHOLD_DAYS = 30

# Final states for escrow
ESCROW_FINAL_STATES = ['RELEASED', 'REFUNDED', 'FAILED']


# =============================================================================
# EXCEPTIONS
# =============================================================================

class FinancialIntegrityError(Exception):
    """Base exception for financial integrity violations."""
    pass


class DuplicateFinancialActionError(FinancialIntegrityError):
    """Raised when attempting to duplicate a financial action."""
    pass


class EscrowStateError(FinancialIntegrityError):
    """Raised when escrow is in unexpected state."""
    pass


class CODLedgerError(FinancialIntegrityError):
    """Raised when COD ledger has integrity issues."""
    pass


# =============================================================================
# ESCROW INTEGRITY
# =============================================================================

def detect_stuck_escrows() -> list:
    """
    Detect escrows stuck in HELD state beyond timeout.
    
    Returns:
        List of stuck EscrowTransaction objects
    """
    from payments.models import EscrowTransaction
    
    timeout = timezone.now() - timedelta(hours=ESCROW_STUCK_TIMEOUT_HOURS)
    
    stuck_escrows = EscrowTransaction.objects.filter(
        status=EscrowTransaction.Status.HELD,
        created_at__lt=timeout
    ).select_related('booking_reference')
    
    for escrow in stuck_escrows:
        logger.error(
            f"ESCROW_STUCK_DETECTED: escrow_id={escrow.id}, "
            f"job_id={escrow.booking_reference_id}, amount={escrow.amount}, "
            f"held_since={escrow.created_at}, hours_stuck={(timezone.now() - escrow.created_at).total_seconds() / 3600:.1f}"
        )
    
    return list(stuck_escrows)


def validate_escrow_final_state(escrow) -> bool:
    """
    Check if escrow is in a valid final state.
    
    Returns:
        True if in final state, False otherwise
    """
    return escrow.status in ESCROW_FINAL_STATES


def enforce_escrow_idempotency(job, action: str) -> bool:
    """
    Check if an escrow action would be a duplicate.
    
    Args:
        job: TransportJob
        action: 'create', 'release', or 'refund'
    
    Returns:
        True if action is safe, raises DuplicateFinancialActionError otherwise
    """
    from payments.models import EscrowTransaction
    
    existing_escrows = EscrowTransaction.objects.filter(booking_reference=job)
    
    if action == 'create':
        # Cannot create if any escrow exists for this job
        if existing_escrows.exists():
            active = existing_escrows.first()
            logger.warning(
                f"ESCROW_DUPLICATE_BLOCKED: action={action}, job_id={job.id}, "
                f"existing_escrow_id={active.id}, status={active.status}"
            )
            raise DuplicateFinancialActionError(
                f"Escrow already exists for job {job.id} (escrow_id={active.id})"
            )
    
    elif action == 'release':
        # Cannot release if already in final state
        already_final = existing_escrows.filter(status__in=ESCROW_FINAL_STATES).first()
        if already_final:
            logger.warning(
                f"ESCROW_DUPLICATE_BLOCKED: action={action}, job_id={job.id}, "
                f"escrow_id={already_final.id}, status={already_final.status}"
            )
            raise DuplicateFinancialActionError(
                f"Escrow already finalized for job {job.id} (status={already_final.status})"
            )
    
    elif action == 'refund':
        # Cannot refund if already released or refunded
        already_final = existing_escrows.filter(status__in=['RELEASED', 'REFUNDED']).first()
        if already_final:
            logger.warning(
                f"ESCROW_DUPLICATE_BLOCKED: action={action}, job_id={job.id}, "
                f"escrow_id={already_final.id}, status={already_final.status}"
            )
            raise DuplicateFinancialActionError(
                f"Escrow already finalized for job {job.id} (status={already_final.status})"
            )
    
    return True


# =============================================================================
# COD LEDGER INTEGRITY
# =============================================================================

def detect_overdue_cod_entries() -> list:
    """
    Detect unsettled COD ledger entries beyond threshold.
    
    Returns:
        List of overdue CommissionLedger objects
    """
    from payments.models import CommissionLedger
    
    threshold = timezone.now() - timedelta(days=COD_OVERDUE_THRESHOLD_DAYS)
    
    overdue_entries = CommissionLedger.objects.filter(
        is_settled=False,
        created_at__lt=threshold
    ).select_related('transporter', 'job_reference')
    
    for entry in overdue_entries:
        logger.error(
            f"COD_LEDGER_OVERDUE: ledger_id={entry.id}, "
            f"transporter_id={entry.transporter_id}, job_id={entry.job_reference_id}, "
            f"amount={entry.amount}, created_at={entry.created_at}, "
            f"days_overdue={(timezone.now() - entry.created_at).days}"
        )
    
    return list(overdue_entries)


def enforce_cod_settlement_idempotency(ledger_entry) -> bool:
    """
    Check if COD settlement would be a duplicate.
    
    Returns:
        True if safe, raises DuplicateFinancialActionError otherwise
    """
    if ledger_entry.is_settled:
        logger.warning(
            f"COD_DUPLICATE_BLOCKED: ledger_id={ledger_entry.id}, "
            f"already_settled_at={ledger_entry.settled_at}"
        )
        raise DuplicateFinancialActionError(
            f"COD ledger entry {ledger_entry.id} already settled at {ledger_entry.settled_at}"
        )
    return True


# =============================================================================
# ORPHAN & INCONSISTENCY DETECTION
# =============================================================================

def detect_financial_inconsistencies() -> dict:
    """
    Detect jobs with financial inconsistencies:
    - COMPLETED jobs without escrow resolution
    - COMPLETED COD jobs with unsettled ledger
    
    Returns:
        Dict with 'escrow_orphans' and 'cod_orphans' lists
    """
    from logistics.models import TransportJob
    from payments.models import EscrowTransaction, CommissionLedger
    
    inconsistencies = {
        'escrow_orphans': [],
        'cod_orphans': [],
    }
    
    # Find COMPLETED jobs
    completed_jobs = TransportJob.objects.filter(
        status=TransportJob.Status.COMPLETED
    )
    
    for job in completed_jobs:
        # Check escrow resolution
        escrows = EscrowTransaction.objects.filter(booking_reference=job)
        
        if escrows.exists():
            # Has escrow - check if resolved
            final_escrow = escrows.filter(status__in=ESCROW_FINAL_STATES).first()
            held_escrow = escrows.filter(status=EscrowTransaction.Status.HELD).first()
            
            if held_escrow and not final_escrow:
                inconsistencies['escrow_orphans'].append({
                    'job_id': job.id,
                    'escrow_id': held_escrow.id,
                    'amount': held_escrow.amount,
                    'status': held_escrow.status,
                    'reason': 'COMPLETED job has unresolved HELD escrow'
                })
                logger.error(
                    f"FINANCIAL_INCONSISTENCY_ERROR: type=escrow_orphan, "
                    f"job_id={job.id}, escrow_id={held_escrow.id}, "
                    f"amount={held_escrow.amount}"
                )
        
        # Check COD ledger resolution
        try:
            ledger = CommissionLedger.objects.get(job_reference=job)
            if not ledger.is_settled:
                # Check if overdue
                days_since = (timezone.now() - ledger.created_at).days
                if days_since > 7:  # 7 days after completion is suspicious
                    inconsistencies['cod_orphans'].append({
                        'job_id': job.id,
                        'ledger_id': ledger.id,
                        'amount': ledger.amount,
                        'days_unsettled': days_since,
                        'reason': 'COMPLETED job has long-unsettled COD'
                    })
                    logger.error(
                        f"FINANCIAL_INCONSISTENCY_ERROR: type=cod_orphan, "
                        f"job_id={job.id}, ledger_id={ledger.id}, "
                        f"amount={ledger.amount}, days_unsettled={days_since}"
                    )
        except CommissionLedger.DoesNotExist:
            # No ledger - this is fine if job was digital payment
            pass
    
    return inconsistencies


# =============================================================================
# FULL AUDIT
# =============================================================================

def run_financial_integrity_audit() -> dict:
    """
    Run complete financial integrity audit.
    
    Returns:
        Dict with all audit results
    """
    from payments.models import EscrowTransaction, CommissionLedger
    
    results = {
        'timestamp': timezone.now().isoformat(),
        'totals': {},
        'issues': {},
    }
    
    # Totals
    results['totals']['total_escrows'] = EscrowTransaction.objects.count()
    results['totals']['held_escrows'] = EscrowTransaction.objects.filter(
        status=EscrowTransaction.Status.HELD
    ).count()
    results['totals']['released_escrows'] = EscrowTransaction.objects.filter(
        status=EscrowTransaction.Status.RELEASED
    ).count()
    results['totals']['refunded_escrows'] = EscrowTransaction.objects.filter(
        status=EscrowTransaction.Status.REFUNDED
    ).count()
    
    results['totals']['total_cod_entries'] = CommissionLedger.objects.count()
    results['totals']['settled_cod'] = CommissionLedger.objects.filter(is_settled=True).count()
    results['totals']['unsettled_cod'] = CommissionLedger.objects.filter(is_settled=False).count()
    
    # Issues
    stuck_escrows = detect_stuck_escrows()
    results['issues']['stuck_escrows'] = len(stuck_escrows)
    results['issues']['stuck_escrow_ids'] = [e.id for e in stuck_escrows]
    
    overdue_cod = detect_overdue_cod_entries()
    results['issues']['overdue_cod'] = len(overdue_cod)
    results['issues']['overdue_cod_ids'] = [e.id for e in overdue_cod]
    
    inconsistencies = detect_financial_inconsistencies()
    results['issues']['escrow_orphans'] = len(inconsistencies['escrow_orphans'])
    results['issues']['cod_orphans'] = len(inconsistencies['cod_orphans'])
    results['issues']['inconsistency_details'] = inconsistencies
    
    # Summary
    total_issues = (
        results['issues']['stuck_escrows'] +
        results['issues']['overdue_cod'] +
        results['issues']['escrow_orphans'] +
        results['issues']['cod_orphans']
    )
    results['summary'] = {
        'total_issues': total_issues,
        'status': 'CLEAN' if total_issues == 0 else 'ISSUES_DETECTED'
    }
    
    logger.info(
        f"FINANCIAL_AUDIT_COMPLETE: status={results['summary']['status']}, "
        f"total_issues={total_issues}, stuck_escrows={results['issues']['stuck_escrows']}, "
        f"overdue_cod={results['issues']['overdue_cod']}"
    )
    
    return results
