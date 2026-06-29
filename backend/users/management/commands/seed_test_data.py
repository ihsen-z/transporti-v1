"""
Seed command for Transporti V1 test data.
Creates all approved test personas and linked entities for workflow simulation.

Usage:
    python manage.py seed_test_data          # Seed data
    python manage.py seed_test_data --clear  # Clear existing test data first
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from decimal import Decimal

from users.models import User
from trust.models import TrustProfile, VerificationStatus
from logistics.models import TransportJob, Offer
from payments.models import CommissionLedger, EscrowTransaction
from support.models import AuditLog, Dispute


class Command(BaseCommand):
    help = 'Seeds test data for Transporti V1 workflow simulation'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing test data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.clear_test_data()
        
        with transaction.atomic():
            self.seed_users()
            self.seed_jobs()
            self.seed_offers()
            self.seed_payments()
            self.seed_disputes()
        
        self.stdout.write(self.style.SUCCESS('✅ Test data seeded successfully!'))
        self.stdout.write('\n📊 Summary:')
        self.stdout.write(f'   Users: {User.objects.filter(email__endswith="@test.transporti.tn").count()}')
        self.stdout.write(f'   Jobs: {TransportJob.objects.count()}')
        self.stdout.write(f'   Offers: {Offer.objects.count()}')
        self.stdout.write(f'   Escrow: {EscrowTransaction.objects.count()}')
        self.stdout.write(f'   Commission Ledger: {CommissionLedger.objects.count()}')
        self.stdout.write(f'   Disputes: {Dispute.objects.count()}')

    def clear_test_data(self):
        """Remove all test data (entities linked to test accounts)."""
        self.stdout.write('🧹 Clearing existing test data...')
        
        # Clear in reverse dependency order
        AuditLog.objects.filter(actor__email__endswith='@test.transporti.tn').delete()
        AuditLog.objects.filter(actor__email__endswith='@admin.transporti.tn').delete()
        Dispute.objects.all().delete()
        CommissionLedger.objects.all().delete()
        EscrowTransaction.objects.all().delete()
        Offer.objects.all().delete()
        TransportJob.objects.all().delete()
        TrustProfile.objects.all().delete()
        User.objects.filter(email__endswith='@test.transporti.tn').delete()
        User.objects.filter(email__endswith='@admin.transporti.tn').delete()
        
        self.stdout.write(self.style.WARNING('   Test data cleared.'))

    def seed_users(self):
        """Create all 6 test personas."""
        self.stdout.write('👥 Seeding users...')
        
        # A. CLIENT_VERIFIED - Leila
        self.client_1, _ = User.objects.get_or_create(
            email='leila.benamor@test.transporti.tn',
            defaults={
                'username': 'leila_client',
                'first_name': 'Leila',
                'last_name': 'Ben Amor',
                'phone': '+21620111001',
                'role': 'CLIENT',
                'is_phone_verified': True,
            }
        )
        self.client_1.set_password('Test@123!')
        self.client_1.save()
        
        # B. CLIENT_MOVING - Ahmed
        self.client_2, _ = User.objects.get_or_create(
            email='ahmed.trabelsi@test.transporti.tn',
            defaults={
                'username': 'ahmed_client',
                'first_name': 'Ahmed',
                'last_name': 'Trabelsi',
                'phone': '+21620111002',
                'role': 'CLIENT',
                'is_phone_verified': True,
            }
        )
        self.client_2.set_password('Test@123!')
        self.client_2.save()
        
        # C. TRANSPORTER_VERIFIED - Mehdi
        self.transporter_1, _ = User.objects.get_or_create(
            email='mehdi.khelifi@test.transporti.tn',
            defaults={
                'username': 'mehdi_transporter',
                'first_name': 'Mehdi',
                'last_name': 'Khelifi',
                'phone': '+21650222001',
                'role': 'TRANSPORTER',
                'is_phone_verified': True,
            }
        )
        self.transporter_1.set_password('Test@123!')
        self.transporter_1.save()
        
        # Create VERIFIED TrustProfile
        TrustProfile.objects.get_or_create(
            user=self.transporter_1,
            defaults={
                'verification_status': VerificationStatus.VERIFIED,
                'verified_at': timezone.now() - timedelta(days=30),
            }
        )
        
        # D. TRANSPORTER_UNVERIFIED - Sami
        self.transporter_2, _ = User.objects.get_or_create(
            email='sami.gharbi@test.transporti.tn',
            defaults={
                'username': 'sami_transporter',
                'first_name': 'Sami',
                'last_name': 'Gharbi',
                'phone': '+21650222002',
                'role': 'TRANSPORTER',
                'is_phone_verified': True,
            }
        )
        self.transporter_2.set_password('Test@123!')
        self.transporter_2.save()
        
        # Create PENDING TrustProfile
        TrustProfile.objects.get_or_create(
            user=self.transporter_2,
            defaults={
                'verification_status': VerificationStatus.PENDING,
                'last_submitted_at': timezone.now() - timedelta(hours=12),
            }
        )
        
        # E. MODERATOR - Fatma
        self.moderator, _ = User.objects.get_or_create(
            email='fatma.rejeb@admin.transporti.tn',
            defaults={
                'username': 'fatma_mod',
                'first_name': 'Fatma',
                'last_name': 'Rejeb',
                'phone': '+21670333001',
                'role': 'MODERATOR',
                'is_phone_verified': True,
                'is_staff': True,
            }
        )
        self.moderator.set_password('Admin@123!')
        self.moderator.save()
        
        # F. ADMIN - Karim
        self.admin, _ = User.objects.get_or_create(
            email='karim.bouzid@admin.transporti.tn',
            defaults={
                'username': 'karim_admin',
                'first_name': 'Karim',
                'last_name': 'Bouzid',
                'phone': '+21670333002',
                'role': 'ADMIN',
                'is_phone_verified': True,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        self.admin.set_password('Admin@123!')
        self.admin.save()
        
        self.stdout.write(self.style.SUCCESS('   ✓ 6 users created'))

    def seed_jobs(self):
        """Create test jobs in various states."""
        self.stdout.write('📦 Seeding jobs...')
        
        # Job 1: COMPLETED (Transport - Fridge)
        self.job_1, _ = TransportJob.objects.get_or_create(
            id=1,
            defaults={
                'owner': self.client_1,
                'job_type': 'TRANSPORT',
                'status': 'COMPLETED',
                'pickup_address': 'Rue de Marseille, La Marsa',
                'pickup_lat': Decimal('36.8892'),
                'pickup_lng': Decimal('10.3228'),
                'dropoff_address': 'Rue du Lac Léman, Lac 2',
                'dropoff_lat': Decimal('36.8374'),
                'dropoff_lng': Decimal('10.2331'),
                'scheduled_time': timezone.now() - timedelta(days=5),
                'specifications': {'items': ['Fridge'], 'weight_kg': 80},
            }
        )
        
        # Job 2: IN_PROGRESS (Moving - Full apartment)
        self.job_2, _ = TransportJob.objects.get_or_create(
            id=2,
            defaults={
                'owner': self.client_2,
                'job_type': 'MOVING',
                'status': 'IN_PROGRESS',
                'pickup_address': 'Avenue Habib Bourguiba, Tunis',
                'pickup_lat': Decimal('36.8008'),
                'pickup_lng': Decimal('10.1860'),
                'dropoff_address': 'Boulevard du 14 Janvier, Sousse',
                'dropoff_lat': Decimal('35.8256'),
                'dropoff_lng': Decimal('10.6084'),
                'scheduled_time': timezone.now() + timedelta(days=2),
                'specifications': {
                    'rooms': 3, 
                    'floor': 3, 
                    'elevator': False, 
                    'fragile': True,
                    'notes': 'Full S+2 apartment'
                },
            }
        )
        
        # Job 3: PUBLISHED (Transport - Awaiting offers)
        self.job_3, _ = TransportJob.objects.get_or_create(
            id=3,
            defaults={
                'owner': self.client_1,
                'job_type': 'TRANSPORT',
                'status': 'PUBLISHED',
                'pickup_address': 'Rue de Palestine, Ariana',
                'pickup_lat': Decimal('36.8625'),
                'pickup_lng': Decimal('10.1956'),
                'dropoff_address': 'Rue de France, La Marsa',
                'dropoff_lat': Decimal('36.8780'),
                'dropoff_lng': Decimal('10.3244'),
                'scheduled_time': timezone.now() + timedelta(days=3),
                'specifications': {'items': ['Sofa', '2 Boxes'], 'weight_kg': 60},
            }
        )
        
        # Job 4: DISPUTED (Transport - Damaged items)
        self.job_4, _ = TransportJob.objects.get_or_create(
            id=4,
            defaults={
                'owner': self.client_1,
                'job_type': 'TRANSPORT',
                'status': 'DISPUTED',
                'pickup_address': 'Rue Ibn Khaldoun, Tunis',
                'pickup_lat': Decimal('36.8065'),
                'pickup_lng': Decimal('10.1815'),
                'dropoff_address': 'Rue de Carthage, Carthage',
                'dropoff_lat': Decimal('36.8528'),
                'dropoff_lng': Decimal('10.3308'),
                'scheduled_time': timezone.now() - timedelta(days=2),
                'specifications': {'items': ['Glass Table', 'Mirror'], 'weight_kg': 40, 'fragile': True},
            }
        )
        
        self.stdout.write(self.style.SUCCESS('   ✓ 4 jobs created'))

    def seed_offers(self):
        """Create offers linked to jobs."""
        self.stdout.write('🏷️ Seeding offers...')
        
        # Offer 1: ACCEPTED (for Job 1 - completed)
        Offer.objects.get_or_create(
            id=1,
            defaults={
                'job': self.job_1,
                'transporter': self.transporter_1,
                'status': 'ACCEPTED',
                'price_net': Decimal('68.00'),
                'commission_amount': Decimal('12.00'),
                'total_price': Decimal('80.00'),
                'message': 'Available immediately. Professional service.',
                'valid_until': timezone.now() - timedelta(days=4),
            }
        )
        
        # Offer 2: ACCEPTED (for Job 2 - in progress)
        Offer.objects.get_or_create(
            id=2,
            defaults={
                'job': self.job_2,
                'transporter': self.transporter_1,
                'status': 'ACCEPTED',
                'price_net': Decimal('382.50'),
                'commission_amount': Decimal('67.50'),
                'total_price': Decimal('450.00'),
                'message': 'Experienced with full apartment moves. Team of 3.',
                'valid_until': timezone.now() + timedelta(days=1),
            }
        )
        
        # Offer 3: PENDING (for Job 3 - published)
        Offer.objects.get_or_create(
            id=3,
            defaults={
                'job': self.job_3,
                'transporter': self.transporter_1,
                'status': 'PENDING',
                'price_net': Decimal('51.00'),
                'commission_amount': Decimal('9.00'),
                'total_price': Decimal('60.00'),
                'message': 'Can do this afternoon.',
                'valid_until': timezone.now() + timedelta(hours=48),
            }
        )
        
        self.stdout.write(self.style.SUCCESS('   ✓ 3 offers created'))

    def seed_payments(self):
        """Create escrow and commission ledger entries."""
        self.stdout.write('💰 Seeding payment data...')
        
        # Escrow 1: RELEASED (Job 1 - completed)
        EscrowTransaction.objects.get_or_create(
            id=1,
            defaults={
                'booking_reference': self.job_1,
                'status': 'RELEASED',
                'amount': Decimal('80.00'),
                'gateway_reference': 'PAY-TN-TEST-001',
            }
        )
        
        # Escrow 2: HELD (Job 2 - in progress, awaiting 48h)
        EscrowTransaction.objects.get_or_create(
            id=2,
            defaults={
                'booking_reference': self.job_2,
                'status': 'HELD',
                'amount': Decimal('450.00'),
                'gateway_reference': 'PAY-TN-TEST-002',
            }
        )
        
        # Commission Ledger 1: SETTLED (Job 1)
        CommissionLedger.objects.get_or_create(
            job_reference=self.job_1,
            defaults={
                'transporter': self.transporter_1,
                'amount': Decimal('12.00'),
                'is_settled': True,
                'settled_at': timezone.now() - timedelta(days=3),
            }
        )
        
        # Commission Ledger 2: UNSETTLED (Job 2 - COD pending)
        CommissionLedger.objects.get_or_create(
            job_reference=self.job_2,
            defaults={
                'transporter': self.transporter_1,
                'amount': Decimal('67.50'),
                'is_settled': False,
            }
        )
        
        self.stdout.write(self.style.SUCCESS('   ✓ 2 escrow + 2 commission entries created'))

    def seed_disputes(self):
        """Create dispute and audit log entries."""
        self.stdout.write('⚖️ Seeding dispute data...')
        
        # Dispute on Job 4
        dispute, created = Dispute.objects.get_or_create(
            job=self.job_4,
            defaults={
                'initiator': self.client_1,
                'reason': 'DAMAGED_ITEMS',
                'description': 'Glass table was cracked during transport. Mirror has scratches.',
                'status': 'INVESTIGATING',
            }
        )
        
        # Audit log for dispute assignment
        if created:
            AuditLog.objects.create(
                actor=self.moderator,
                action='DISPUTE_ASSIGNED',
                target_entity=f'Dispute:{dispute.id}',
                changes={'old': 'OPEN', 'new': 'INVESTIGATING'},
                reason='Initial triage - escalated for investigation',
            )
        
        self.stdout.write(self.style.SUCCESS('   ✓ 1 dispute + 1 audit log created'))
