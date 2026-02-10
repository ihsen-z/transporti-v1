"""
Financial Integrity Audit Management Command - Transporti V1
Detects stuck escrows, overdue COD, and financial inconsistencies.

Usage:
    python manage.py audit_financial_integrity
    python manage.py audit_financial_integrity --verbose
    python manage.py audit_financial_integrity --json
"""
import json
from django.core.management.base import BaseCommand
from django.utils import timezone

from payments.integrity import run_financial_integrity_audit


class Command(BaseCommand):
    help = 'Audit financial integrity: detect stuck escrows, overdue COD, and inconsistencies'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose', '-v',
            action='store_true',
            help='Show detailed output for each issue'
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output results as JSON'
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\n{'='*60}\n"
            f"TRANSPORTI V1 - FINANCIAL INTEGRITY AUDIT\n"
            f"{'='*60}\n"
            f"Timestamp: {timezone.now().isoformat()}\n"
        ))
        
        # Run audit
        results = run_financial_integrity_audit()
        
        if options['json']:
            self.stdout.write(json.dumps(results, indent=2, default=str))
            return
        
        # Display totals
        self.stdout.write(self.style.HTTP_INFO("\n📊 TOTALS\n"))
        totals = results['totals']
        self.stdout.write(f"  Total Escrows:     {totals['total_escrows']}")
        self.stdout.write(f"    - HELD:          {totals['held_escrows']}")
        self.stdout.write(f"    - RELEASED:      {totals['released_escrows']}")
        self.stdout.write(f"    - REFUNDED:      {totals['refunded_escrows']}")
        self.stdout.write(f"  Total COD Entries: {totals['total_cod_entries']}")
        self.stdout.write(f"    - Settled:       {totals['settled_cod']}")
        self.stdout.write(f"    - Unsettled:     {totals['unsettled_cod']}")
        
        # Display issues
        issues = results['issues']
        self.stdout.write(self.style.HTTP_INFO("\n⚠️  ISSUES DETECTED\n"))
        
        # Stuck escrows
        if issues['stuck_escrows'] > 0:
            self.stdout.write(self.style.ERROR(
                f"  ❌ Stuck Escrows (HELD > 72h): {issues['stuck_escrows']}"
            ))
            if options['verbose']:
                for eid in issues['stuck_escrow_ids']:
                    self.stdout.write(f"      - Escrow ID: {eid}")
        else:
            self.stdout.write(self.style.SUCCESS(
                f"  ✅ Stuck Escrows: 0"
            ))
        
        # Overdue COD
        if issues['overdue_cod'] > 0:
            self.stdout.write(self.style.ERROR(
                f"  ❌ Overdue COD (> 30 days): {issues['overdue_cod']}"
            ))
            if options['verbose']:
                for lid in issues['overdue_cod_ids']:
                    self.stdout.write(f"      - Ledger ID: {lid}")
        else:
            self.stdout.write(self.style.SUCCESS(
                f"  ✅ Overdue COD: 0"
            ))
        
        # Escrow orphans
        if issues['escrow_orphans'] > 0:
            self.stdout.write(self.style.ERROR(
                f"  ❌ Escrow Orphans: {issues['escrow_orphans']}"
            ))
            if options['verbose']:
                for orphan in issues['inconsistency_details']['escrow_orphans']:
                    self.stdout.write(
                        f"      - Job {orphan['job_id']}: Escrow {orphan['escrow_id']} "
                        f"({orphan['amount']} TND) - {orphan['reason']}"
                    )
        else:
            self.stdout.write(self.style.SUCCESS(
                f"  ✅ Escrow Orphans: 0"
            ))
        
        # COD orphans
        if issues['cod_orphans'] > 0:
            self.stdout.write(self.style.ERROR(
                f"  ❌ COD Orphans: {issues['cod_orphans']}"
            ))
            if options['verbose']:
                for orphan in issues['inconsistency_details']['cod_orphans']:
                    self.stdout.write(
                        f"      - Job {orphan['job_id']}: Ledger {orphan['ledger_id']} "
                        f"({orphan['amount']} TND) unsettled for {orphan['days_unsettled']} days"
                    )
        else:
            self.stdout.write(self.style.SUCCESS(
                f"  ✅ COD Orphans: 0"
            ))
        
        # Summary
        summary = results['summary']
        self.stdout.write(self.style.HTTP_INFO("\n📋 SUMMARY\n"))
        
        if summary['status'] == 'CLEAN':
            self.stdout.write(self.style.SUCCESS(
                f"  ✅ STATUS: {summary['status']}\n"
                f"  No financial integrity issues detected.\n"
            ))
        else:
            self.stdout.write(self.style.ERROR(
                f"  ❌ STATUS: {summary['status']}\n"
                f"  Total Issues: {summary['total_issues']}\n"
                f"  \n"
                f"  ⚠️  ATTENTION REQUIRED: Review logged issues above.\n"
                f"  No automatic fixes applied. Manual intervention required.\n"
            ))
        
        self.stdout.write(f"\n{'='*60}\n")
