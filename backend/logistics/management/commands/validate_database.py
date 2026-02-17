"""
validate_database — Database Integrity Check
Production Hardening — Sprint H3

Usage: python manage.py validate_database
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import F, Q

from logistics.models import TransportJob, Offer
from users.models import User


class Command(BaseCommand):
    help = 'Validate database integrity for production readiness'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('=== Database Integrity Check ===\n'))
        
        errors = 0
        warnings = 0
        
        # 1. Check for orphan offers (offers on non-existent jobs)
        self.stdout.write('  [1/8] Orphan offers...')
        orphan_offers = Offer.objects.filter(job__isnull=True).count()
        if orphan_offers > 0:
            self.stdout.write(self.style.ERROR(f'    FAIL: {orphan_offers} orphan offers found'))
            errors += 1
        else:
            self.stdout.write(self.style.SUCCESS('    PASS'))
        
        # 2. Check for null critical fields
        self.stdout.write('  [2/8] Null critical fields...')
        null_pickup = TransportJob.objects.filter(pickup_address='').count()
        null_dropoff = TransportJob.objects.filter(dropoff_address='').count()
        if null_pickup > 0 or null_dropoff > 0:
            self.stdout.write(self.style.ERROR(f'    FAIL: {null_pickup} null pickups, {null_dropoff} null dropoffs'))
            errors += 1
        else:
            self.stdout.write(self.style.SUCCESS('    PASS'))
        
        # 3. Timestamp consistency (created_at <= updated_at)
        self.stdout.write('  [3/8] Timestamp consistency...')
        bad_timestamps = TransportJob.objects.filter(updated_at__lt=F('created_at')).count()
        if bad_timestamps > 0:
            self.stdout.write(self.style.ERROR(f'    FAIL: {bad_timestamps} jobs with updated_at < created_at'))
            errors += 1
        else:
            self.stdout.write(self.style.SUCCESS('    PASS'))
        
        # 4. Price integrity on offers (total >= net, all positive)
        self.stdout.write('  [4/8] Price integrity...')
        bad_prices = Offer.objects.filter(
            Q(total_price__lt=F('price_net')) |
            Q(price_net__lt=0) |
            Q(commission_amount__lt=0)
        ).count()
        if bad_prices > 0:
            self.stdout.write(self.style.ERROR(f'    FAIL: {bad_prices} offers with invalid prices'))
            errors += 1
        else:
            self.stdout.write(self.style.SUCCESS('    PASS'))
        
        # 5. ACCEPTED offers must have IN_PROGRESS/COMPLETED job
        self.stdout.write('  [5/8] Accepted offer consistency...')
        accepted_with_wrong_job = Offer.objects.filter(
            status='ACCEPTED'
        ).exclude(
            job__status__in=['MATCHED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED']
        ).count()
        if accepted_with_wrong_job > 0:
            self.stdout.write(self.style.WARNING(f'    WARN: {accepted_with_wrong_job} accepted offers on non-active jobs'))
            warnings += 1
        else:
            self.stdout.write(self.style.SUCCESS('    PASS'))
        
        # 6. Users without profiles (should auto-create)
        self.stdout.write('  [6/8] User profiles...')
        users_no_profile = User.objects.filter(profile__isnull=True).count()
        if users_no_profile > 0:
            self.stdout.write(self.style.WARNING(f'    WARN: {users_no_profile} users without profile'))
            warnings += 1
        else:
            self.stdout.write(self.style.SUCCESS('    PASS'))
        
        # 7. Duplicate offers (same transporter on same job)
        self.stdout.write('  [7/8] Duplicate offers...')
        from django.db.models import Count
        dupes = (
            Offer.objects
            .values('job', 'transporter')
            .annotate(cnt=Count('id'))
            .filter(cnt__gt=1)
        )
        dupe_count = dupes.count()
        if dupe_count > 0:
            self.stdout.write(self.style.WARNING(f'    WARN: {dupe_count} transporter(s) with multiple offers on same job'))
            warnings += 1
        else:
            self.stdout.write(self.style.SUCCESS('    PASS'))
        
        # 8. Jobs scheduled in the past that are still PUBLISHED
        self.stdout.write('  [8/8] Stale published jobs...')
        stale_jobs = TransportJob.objects.filter(
            status='PUBLISHED',
            scheduled_time__lt=timezone.now()
        ).count()
        if stale_jobs > 0:
            self.stdout.write(self.style.WARNING(f'    WARN: {stale_jobs} published jobs with past scheduled time'))
            warnings += 1
        else:
            self.stdout.write(self.style.SUCCESS('    PASS'))
        
        # Summary
        self.stdout.write(self.style.MIGRATE_HEADING(f'\n=== Summary ==='))
        total = TransportJob.objects.count()
        offers = Offer.objects.count()
        users = User.objects.count()
        self.stdout.write(f'  Records: {users} users, {total} jobs, {offers} offers')
        
        if errors > 0:
            self.stdout.write(self.style.ERROR(f'  Result: FAIL — {errors} error(s), {warnings} warning(s)'))
        elif warnings > 0:
            self.stdout.write(self.style.WARNING(f'  Result: PASS with {warnings} warning(s)'))
        else:
            self.stdout.write(self.style.SUCCESS(f'  Result: PASS — All checks clean'))
