"""
Review Audit Management Command - Transporti V1
Detects abnormal ratings, duplicate behavior, and trust inconsistencies.

Usage:
    python manage.py audit_reviews
    python manage.py audit_reviews --verbose
    python manage.py audit_reviews --json
"""
import json
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db.models import Avg, Count, StdDev, F
from django.utils import timezone

from reviews.models import Review, ReviewAbuseLog, ReviewRole


class Command(BaseCommand):
    help = 'Audit reviews: detect abnormal patterns, duplicates, and trust inconsistencies'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose', '-v',
            action='store_true',
            help='Show detailed output'
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output as JSON'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Analyze reviews from last N days (default: 30)'
        )
    
    def handle(self, *args, **options):
        days = options['days']
        since = timezone.now() - timedelta(days=days)
        
        results = {
            'timestamp': timezone.now().isoformat(),
            'period_days': days,
            'totals': {},
            'issues': {},
        }
        
        # Get all reviews in period
        reviews = Review.objects.filter(created_at__gte=since)
        
        # =====================================================================
        # TOTALS
        # =====================================================================
        results['totals']['total_reviews'] = reviews.count()
        results['totals']['client_reviews'] = reviews.filter(role=ReviewRole.CLIENT).count()
        results['totals']['transporter_reviews'] = reviews.filter(role=ReviewRole.TRANSPORTER).count()
        results['totals']['flagged_reviews'] = reviews.filter(is_flagged=True).count()
        
        avg_rating = reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        results['totals']['average_rating'] = round(avg_rating, 2)
        
        # Rating distribution
        results['totals']['rating_distribution'] = {}
        for i in range(1, 6):
            results['totals']['rating_distribution'][i] = reviews.filter(rating=i).count()
        
        # =====================================================================
        # ISSUE DETECTION
        # =====================================================================
        
        # Issue 1: Reviewers with abnormally low average
        results['issues']['abnormal_reviewers'] = []
        reviewer_stats = reviews.values('reviewer_id').annotate(
            count=Count('id'),
            avg_rating=Avg('rating')
        ).filter(count__gte=5)  # At least 5 reviews
        
        for stat in reviewer_stats:
            if stat['avg_rating'] and stat['avg_rating'] < 2.0:
                results['issues']['abnormal_reviewers'].append({
                    'reviewer_id': stat['reviewer_id'],
                    'review_count': stat['count'],
                    'average_rating': round(stat['avg_rating'], 2),
                    'reason': 'Average rating below 2.0 with 5+ reviews'
                })
        
        # Issue 2: Abuse logs in period
        abuse_logs = ReviewAbuseLog.objects.filter(created_at__gte=since)
        results['issues']['abuse_logs_count'] = abuse_logs.count()
        results['issues']['abuse_by_severity'] = {
            'LOW': abuse_logs.filter(severity='LOW').count(),
            'MEDIUM': abuse_logs.filter(severity='MEDIUM').count(),
            'HIGH': abuse_logs.filter(severity='HIGH').count(),
            'CRITICAL': abuse_logs.filter(severity='CRITICAL').count(),
        }
        
        # Issue 3: Potential revenge reviews
        results['issues']['potential_revenge'] = []
        for review in reviews.filter(rating__lte=2):
            # Check if target gave low review to reviewer recently
            reverse_review = Review.objects.filter(
                reviewer=review.target,
                target=review.reviewer,
                rating__lte=2,
                created_at__lt=review.created_at,
                created_at__gte=review.created_at - timedelta(days=7)
            ).first()
            
            if reverse_review:
                results['issues']['potential_revenge'].append({
                    'review_id': review.id,
                    'reviewer_id': review.reviewer_id,
                    'reverse_review_id': reverse_review.id,
                    'time_gap_hours': (review.created_at - reverse_review.created_at).total_seconds() / 3600
                })
        
        # Issue 4: Trust score inconsistencies
        results['issues']['trust_inconsistencies'] = []
        from trust.models import TrustProfile
        
        for profile in TrustProfile.objects.select_related('user').all():
            user_reviews = reviews.filter(target=profile.user, is_flagged=False)
            
            if user_reviews.count() >= 5:
                avg = user_reviews.aggregate(avg=Avg('rating'))['avg']
                
                # Check if trust score doesn't match review pattern
                if avg and avg <= 2.0 and profile.trust_score > 60:
                    results['issues']['trust_inconsistencies'].append({
                        'user_id': profile.user_id,
                        'trust_score': profile.trust_score,
                        'average_reviews': round(avg, 2),
                        'reason': 'High trust score despite low average reviews'
                    })
                elif avg and avg >= 4.5 and profile.trust_score < 40:
                    results['issues']['trust_inconsistencies'].append({
                        'user_id': profile.user_id,
                        'trust_score': profile.trust_score,
                        'average_reviews': round(avg, 2),
                        'reason': 'Low trust score despite excellent reviews'
                    })
        
        # =====================================================================
        # SUMMARY
        # =====================================================================
        total_issues = (
            len(results['issues']['abnormal_reviewers']) +
            results['issues']['abuse_logs_count'] +
            len(results['issues']['potential_revenge']) +
            len(results['issues']['trust_inconsistencies'])
        )
        
        results['summary'] = {
            'total_issues': total_issues,
            'status': 'CLEAN' if total_issues == 0 else 'ISSUES_DETECTED'
        }
        
        # =====================================================================
        # OUTPUT
        # =====================================================================
        if options['json']:
            self.stdout.write(json.dumps(results, indent=2, default=str))
            return
        
        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\n{'='*60}\n"
            f"TRANSPORTI V1 - REVIEW AUDIT\n"
            f"{'='*60}\n"
            f"Period: Last {days} days\n"
        ))
        
        # Totals
        self.stdout.write(self.style.HTTP_INFO("\n📊 TOTALS\n"))
        t = results['totals']
        self.stdout.write(f"  Total Reviews:     {t['total_reviews']}")
        self.stdout.write(f"    - Client:        {t['client_reviews']}")
        self.stdout.write(f"    - Transporter:   {t['transporter_reviews']}")
        self.stdout.write(f"  Average Rating:    {t['average_rating']}★")
        self.stdout.write(f"  Flagged Reviews:   {t['flagged_reviews']}")
        self.stdout.write(f"  Rating Distribution:")
        for r in range(5, 0, -1):
            bar = '█' * (t['rating_distribution'][r] // 5 + 1) if t['rating_distribution'][r] > 0 else ''
            self.stdout.write(f"    {r}★: {t['rating_distribution'][r]:4} {bar}")
        
        # Issues
        self.stdout.write(self.style.HTTP_INFO("\n⚠️  ISSUES\n"))
        i = results['issues']
        
        if i['abnormal_reviewers']:
            self.stdout.write(self.style.ERROR(
                f"  ❌ Abnormal Reviewers: {len(i['abnormal_reviewers'])}"
            ))
            if options['verbose']:
                for r in i['abnormal_reviewers']:
                    self.stdout.write(f"      - User {r['reviewer_id']}: {r['average_rating']}★ avg ({r['review_count']} reviews)")
        else:
            self.stdout.write(self.style.SUCCESS("  ✅ Abnormal Reviewers: 0"))
        
        if i['abuse_logs_count'] > 0:
            self.stdout.write(self.style.ERROR(
                f"  ❌ Abuse Logs: {i['abuse_logs_count']}"
            ))
            self.stdout.write(f"      HIGH/CRITICAL: {i['abuse_by_severity']['HIGH'] + i['abuse_by_severity']['CRITICAL']}")
        else:
            self.stdout.write(self.style.SUCCESS("  ✅ Abuse Logs: 0"))
        
        if i['potential_revenge']:
            self.stdout.write(self.style.WARNING(
                f"  ⚠️  Potential Revenge: {len(i['potential_revenge'])}"
            ))
        else:
            self.stdout.write(self.style.SUCCESS("  ✅ Potential Revenge: 0"))
        
        if i['trust_inconsistencies']:
            self.stdout.write(self.style.ERROR(
                f"  ❌ Trust Inconsistencies: {len(i['trust_inconsistencies'])}"
            ))
            if options['verbose']:
                for t in i['trust_inconsistencies']:
                    self.stdout.write(f"      - User {t['user_id']}: score={t['trust_score']}, reviews={t['average_reviews']}★")
        else:
            self.stdout.write(self.style.SUCCESS("  ✅ Trust Inconsistencies: 0"))
        
        # Summary
        self.stdout.write(self.style.HTTP_INFO("\n📋 SUMMARY\n"))
        s = results['summary']
        
        if s['status'] == 'CLEAN':
            self.stdout.write(self.style.SUCCESS(
                f"  ✅ STATUS: {s['status']}\n"
                f"  No review integrity issues detected.\n"
            ))
        else:
            self.stdout.write(self.style.ERROR(
                f"  ❌ STATUS: {s['status']}\n"
                f"  Total Issues: {s['total_issues']}\n"
                f"\n"
                f"  ⚠️  Manual review required. No automatic fixes applied.\n"
            ))
        
        self.stdout.write(f"\n{'='*60}\n")
