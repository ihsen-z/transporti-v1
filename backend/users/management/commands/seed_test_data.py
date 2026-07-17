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
from messaging.models import Conversation, Message
from notifications.models import Notification


class Command(BaseCommand):
    help = 'Seeds test data for Transporti V1 workflow simulation'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing test data before seeding',
        )
        parser.add_argument(
            '--jobs',
            type=int,
            default=0,
            help='Also create N extra PUBLISHED jobs for volumetry testing (REC-L1)',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.clear_test_data()

        with transaction.atomic():
            self.seed_users()
            self.seed_jobs()
            self.seed_return_trips()
            self.seed_offers()
            self.seed_payments()
            self.seed_disputes()
            self.seed_conversations()
            self.seed_notifications()
            if options['jobs']:
                self.seed_volumetry(options['jobs'])

        self.stdout.write(self.style.SUCCESS('✅ Test data seeded successfully!'))
        self.stdout.write('\n📊 Summary:')
        self.stdout.write(f'   Users: {User.objects.filter(email__endswith="@test.transporti.tn").count()}')
        self.stdout.write(f'   Jobs: {TransportJob.objects.count()} (dont trajets retour: {TransportJob.objects.filter(is_return_trip=True).count()})')
        self.stdout.write(f'   Offers: {Offer.objects.count()}')
        self.stdout.write(f'   Escrow: {EscrowTransaction.objects.count()}')
        self.stdout.write(f'   Commission Ledger: {CommissionLedger.objects.count()}')
        self.stdout.write(f'   Disputes: {Dispute.objects.count()}')
        self.stdout.write(f'   Conversations: {Conversation.objects.count()} / Messages: {Message.objects.count()}')
        self.stdout.write(f'   Notifications: {Notification.objects.count()}')

    def clear_test_data(self):
        """Remove all test data (entities linked to test accounts)."""
        self.stdout.write('🧹 Clearing existing test data...')

        # Clear in reverse dependency order
        Notification.objects.all().delete()
        Message.objects.all().delete()
        Conversation.objects.all().delete()
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
        
        # Create VERIFIED TrustProfile — with a structured vehicle (REC-H2)
        TrustProfile.objects.get_or_create(
            user=self.transporter_1,
            defaults={
                'verification_status': VerificationStatus.VERIFIED,
                'verified_at': timezone.now() - timedelta(days=30),
                'vehicle_type': 'Camionnette',
                'vehicle_capacity_kg': Decimal('2000'),
                'vehicle_plate': '123 TU 4567',
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
        
        # Job 5: DRAFT (client is still writing it)
        self.job_5, _ = TransportJob.objects.get_or_create(
            id=5,
            defaults={
                'owner': self.client_2,
                'job_type': 'TRANSPORT',
                'status': 'DRAFT',
                'pickup_address': 'Avenue de la Liberté, Tunis',
                'pickup_governorate': 'Tunis',
                'dropoff_address': 'Centre Ville, Bizerte',
                'dropoff_governorate': 'Bizerte',
                'scheduled_time': timezone.now() + timedelta(days=7),
                'specifications': {'items': ['Washing machine'], 'weight_kg': 70},
            }
        )

        # Job 6: CANCELLED (client cancelled before assignment)
        self.job_6, _ = TransportJob.objects.get_or_create(
            id=6,
            defaults={
                'owner': self.client_1,
                'job_type': 'TRANSPORT',
                'status': 'CANCELLED',
                'pickup_address': 'Rue Farhat Hached, Nabeul',
                'pickup_governorate': 'Nabeul',
                'dropoff_address': 'Avenue Bourguiba, Hammamet',
                'dropoff_governorate': 'Nabeul',
                'scheduled_time': timezone.now() + timedelta(days=1),
                'specifications': {'items': ['Boxes'], 'weight_kg': 30},
            }
        )

        # Job 7: MATCHED (offer accepted, payment being set up — D3 flow)
        self.job_7, _ = TransportJob.objects.get_or_create(
            id=7,
            defaults={
                'owner': self.client_2,
                'job_type': 'TRANSPORT',
                'status': 'MATCHED',
                'pickup_address': 'Route de Tunis, Kairouan',
                'pickup_governorate': 'Kairouan',
                'dropoff_address': 'Avenue de la République, Monastir',
                'dropoff_governorate': 'Monastir',
                'scheduled_time': timezone.now() + timedelta(days=4),
                'specifications': {'items': ['Motorbike'], 'weight_kg': 150},
            }
        )

        self.stdout.write(self.style.SUCCESS('   ✓ 7 jobs created (COMPLETED, IN_PROGRESS, PUBLISHED, DISPUTED, DRAFT, CANCELLED, MATCHED)'))

    def seed_return_trips(self):
        """Return trips published by the verified transporter (REC-F*)."""
        self.stdout.write('🔄 Seeding return trips...')

        # Return trip 1: PUBLISHED, future date
        self.return_trip_1, _ = TransportJob.objects.get_or_create(
            id=8,
            defaults={
                'owner': self.transporter_1,
                'job_type': 'TRANSPORT',
                'status': 'PUBLISHED',
                'is_return_trip': True,
                'available_capacity': '2 tonnes, 8 m³ libres',
                'pickup_address': 'Centre Ville, Sousse',
                'pickup_governorate': 'Sousse',
                'dropoff_address': 'Centre Ville, Tunis',
                'dropoff_governorate': 'Tunis',
                'scheduled_time': timezone.now() + timedelta(days=2),
                'price_tnd_min': Decimal('100.00'),
                'price_tnd_max': Decimal('140.00'),
                'description': 'Retour à vide après une livraison. Chargement possible dès 14h.',
            }
        )

        # Return trip 2: date passed (expiration scenario, REC-F5)
        self.return_trip_2, _ = TransportJob.objects.get_or_create(
            id=9,
            defaults={
                'owner': self.transporter_1,
                'job_type': 'TRANSPORT',
                'status': 'PUBLISHED',
                'is_return_trip': True,
                'available_capacity': '500 kg, fourgon couvert',
                'pickup_address': 'Zone Industrielle, Sfax',
                'pickup_governorate': 'Sfax',
                'dropoff_address': 'Centre Ville, Gabès',
                'dropoff_governorate': 'Gabès',
                'scheduled_time': timezone.now() - timedelta(days=2),
                'price_tnd_min': Decimal('60.00'),
                'description': 'Trajet retour passé — scénario expiration.',
            }
        )

        self.stdout.write(self.style.SUCCESS('   ✓ 2 return trips created'))

    def seed_offers(self):
        """Create offers linked to jobs.

        All amounts follow the D1 net-guaranteed convention:
        commission = price_net × rate (12% TRANSPORT / 15% MOVING),
        total_price = price_net + commission.
        """
        self.stdout.write('🏷️ Seeding offers...')

        # Offer 1: ACCEPTED (for Job 1 - completed) — TRANSPORT 12%
        Offer.objects.get_or_create(
            id=1,
            defaults={
                'job': self.job_1,
                'transporter': self.transporter_1,
                'status': 'ACCEPTED',
                'price_net': Decimal('100.00'),
                'commission_amount': Decimal('12.00'),
                'total_price': Decimal('112.00'),
                'message': 'Available immediately. Professional service.',
                'valid_until': timezone.now() - timedelta(days=4),
            }
        )

        # Offer 2: ACCEPTED (for Job 2 - in progress) — MOVING 15%
        Offer.objects.get_or_create(
            id=2,
            defaults={
                'job': self.job_2,
                'transporter': self.transporter_1,
                'status': 'ACCEPTED',
                'price_net': Decimal('400.00'),
                'commission_amount': Decimal('60.00'),
                'total_price': Decimal('460.00'),
                'message': 'Experienced with full apartment moves. Team of 3.',
                'valid_until': timezone.now() + timedelta(days=1),
            }
        )

        # Offer 3: PENDING (for Job 3 - published) — mehdi
        Offer.objects.get_or_create(
            id=3,
            defaults={
                'job': self.job_3,
                'transporter': self.transporter_1,
                'status': 'PENDING',
                'price_net': Decimal('50.00'),
                'commission_amount': Decimal('6.00'),
                'total_price': Decimal('56.00'),
                'message': 'Can do this afternoon.',
                'valid_until': timezone.now() + timedelta(hours=48),
            }
        )

        # Offer 4: PENDING concurrent (job 3, sami) — acceptance race scenario
        Offer.objects.get_or_create(
            id=4,
            defaults={
                'job': self.job_3,
                'transporter': self.transporter_2,
                'status': 'PENDING',
                'price_net': Decimal('55.00'),
                'commission_amount': Decimal('6.60'),
                'total_price': Decimal('61.60'),
                'message': 'Disponible demain matin.',
                'valid_until': timezone.now() + timedelta(hours=36),
            }
        )

        # Offer 5: ACCEPTED historically (job 4 - disputed)
        Offer.objects.get_or_create(
            id=5,
            defaults={
                'job': self.job_4,
                'transporter': self.transporter_1,
                'status': 'ACCEPTED',
                'price_net': Decimal('150.00'),
                'commission_amount': Decimal('18.00'),
                'total_price': Decimal('168.00'),
                'message': 'Emballage soigné pour objets fragiles.',
                'valid_until': timezone.now() - timedelta(days=3),
            }
        )

        # Offer 6: REJECTED (job 2, sami — lost against mehdi)
        Offer.objects.get_or_create(
            id=6,
            defaults={
                'job': self.job_2,
                'transporter': self.transporter_2,
                'status': 'REJECTED',
                'price_net': Decimal('350.00'),
                'commission_amount': Decimal('52.50'),
                'total_price': Decimal('402.50'),
                'message': 'Camion 3.5T disponible.',
                'valid_until': timezone.now() - timedelta(days=1),
            }
        )

        # Offer 7: EXPIRED (job 6, mehdi — deadline passed)
        Offer.objects.get_or_create(
            id=7,
            defaults={
                'job': self.job_6,
                'transporter': self.transporter_1,
                'status': 'EXPIRED',
                'price_net': Decimal('40.00'),
                'commission_amount': Decimal('4.80'),
                'total_price': Decimal('44.80'),
                'message': 'Passage prévu par Hammamet.',
                'valid_until': timezone.now() - timedelta(days=2),
            }
        )

        # Offer 8: WITHDRAWN (job 7, mehdi — withdrew before acceptance)
        Offer.objects.get_or_create(
            id=8,
            defaults={
                'job': self.job_7,
                'transporter': self.transporter_1,
                'status': 'WITHDRAWN',
                'price_net': Decimal('130.00'),
                'commission_amount': Decimal('15.60'),
                'total_price': Decimal('145.60'),
                'message': 'Finalement indisponible ce jour-là.',
                'valid_until': timezone.now() + timedelta(days=2),
            }
        )

        # Offer 9: ACCEPTED (job 7 MATCHED, sami — payment being set up)
        Offer.objects.get_or_create(
            id=9,
            defaults={
                'job': self.job_7,
                'transporter': self.transporter_2,
                'status': 'ACCEPTED',
                'price_net': Decimal('120.00'),
                'commission_amount': Decimal('14.40'),
                'total_price': Decimal('134.40'),
                'message': 'Remorque adaptée pour moto.',
                'valid_until': timezone.now() + timedelta(days=2),
            }
        )

        self.stdout.write(self.style.SUCCESS('   ✓ 9 offers created (PENDING×2, ACCEPTED×3, REJECTED, EXPIRED, WITHDRAWN + concurrentes)'))

    def seed_payments(self):
        """Create escrow and commission ledger entries."""
        self.stdout.write('💰 Seeding payment data...')
        
        # Escrow 1: RELEASED (Job 1 - completed)
        EscrowTransaction.objects.get_or_create(
            id=1,
            defaults={
                'booking_reference': self.job_1,
                'status': 'RELEASED',
                'amount': Decimal('112.00'),
                'gateway_reference': 'PAY-TN-TEST-001',
            }
        )

        # Escrow 2: HELD (Job 2 - in progress, awaiting 48h)
        EscrowTransaction.objects.get_or_create(
            id=2,
            defaults={
                'booking_reference': self.job_2,
                'status': 'HELD',
                'amount': Decimal('460.00'),
                'gateway_reference': 'PAY-TN-TEST-002',
            }
        )

        # Escrow 3: REFUNDED (Job 6 - cancelled by client)
        EscrowTransaction.objects.get_or_create(
            id=3,
            defaults={
                'booking_reference': self.job_6,
                'status': 'REFUNDED',
                'amount': Decimal('44.80'),
                'gateway_reference': 'PAY-TN-TEST-003',
            }
        )

        # Bookings (D3 — payment contracts)
        from payments.models import Booking
        from logistics.models import Offer as OfferModel
        offer_2 = OfferModel.objects.filter(id=2).first()
        if offer_2:
            Booking.objects.get_or_create(
                job=self.job_2,
                defaults={
                    'accepted_offer': offer_2,
                    'final_price': Decimal('460.00'),
                    'commission_rate': Decimal('0.1500'),
                    'payment_method': 'DIGITAL',
                    'cod_allowed': False,
                }
            )
        offer_9 = OfferModel.objects.filter(id=9).first()
        if offer_9:
            # Job 7 MATCHED + COD → scénario « confirmer le démarrage » (D3)
            Booking.objects.get_or_create(
                job=self.job_7,
                defaults={
                    'accepted_offer': offer_9,
                    'final_price': Decimal('134.40'),
                    'commission_rate': Decimal('0.1200'),
                    'payment_method': 'COD',
                    'cod_allowed': True,
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
                'amount': Decimal('60.00'),
                'is_settled': False,
            }
        )

        self.stdout.write(self.style.SUCCESS('   ✓ 3 escrow + 2 commission entries created'))

    def seed_disputes(self):
        """Create dispute and audit log entries."""
        self.stdout.write('⚖️ Seeding dispute data...')
        
        # Dispute on Job 4
        dispute, created = Dispute.objects.get_or_create(
            job=self.job_4,
            defaults={
                'opened_by': self.client_1,
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

    def seed_conversations(self):
        """Conversations + messages for the active and completed jobs (REC-E1, REC-I*)."""
        self.stdout.write('💬 Seeding conversations...')

        from messaging.services import get_or_create_conversation

        def add_message(conversation, sender, content, is_system=False):
            Message.objects.get_or_create(
                conversation=conversation,
                sender=sender,
                content=content,
                defaults={'is_system': is_system},
            )

        # Conversation on job 2 (in progress) — realistic exchange
        conv_2 = get_or_create_conversation(self.job_2)
        add_message(conv_2, self.client_2, "Bonjour, à quelle heure arrivez-vous ?")
        add_message(conv_2, self.transporter_1, "Je serai là vers 10h. L'accès est-il facile ?")
        add_message(conv_2, self.client_2, "Oui, parking gratuit devant le bâtiment.")

        # Conversation on job 1 (completed) — with a system closure message
        conv_1 = get_or_create_conversation(self.job_1)
        add_message(conv_1, self.transporter_1, "Livraison effectuée, merci !")
        add_message(conv_1, self.client_1, "Parfait, tout est arrivé en bon état.")
        add_message(conv_1, self.client_1, "Statut : mission terminée.", is_system=True)

        self.stdout.write(self.style.SUCCESS('   ✓ 2 conversations + 6 messages created'))

    def seed_notifications(self):
        """Baseline notifications so the bell/page are not empty (REC-E*)."""
        self.stdout.write('🔔 Seeding notifications...')

        def add_notification(user, notif_type, title, message, metadata=None):
            if not Notification.objects.filter(user=user, title=title).exists():
                Notification.objects.create(
                    user=user, type=notif_type, title=title,
                    message=message, metadata=metadata or {},
                )

        add_notification(
            self.transporter_1,
            'OFFER_ACCEPTED',
            "Offre acceptée",
            "Ahmed T. a accepté votre offre de 460,00 TND pour le déménagement Tunis → Sousse.",
            {'job_id': 2, 'offer_id': 2},
        )
        add_notification(
            self.transporter_1,
            'ESCROW_RELEASED',
            "Paiement libéré",
            "Le paiement de 100,00 TND (net) de la mission #1 a été libéré.",
            {'job_id': 1},
        )
        add_notification(
            self.client_2,
            'OFFER_RECEIVED',
            "Nouvelle offre reçue",
            "Mehdi K. a soumis une offre sur votre demande de déménagement.",
            {'job_id': 2, 'offer_id': 2},
        )

        self.stdout.write(self.style.SUCCESS('   ✓ 3 notifications created'))

    def seed_volumetry(self, count):
        """Create N extra PUBLISHED jobs for volumetry testing (REC-L1). Idempotent."""
        self.stdout.write(f'📈 Seeding volumetry ({count} extra published jobs)...')

        MARKER = 'SEED_VOLUMETRIE'
        governorates = ['Tunis', 'Sfax', 'Sousse', 'Nabeul', 'Bizerte', 'Gabès', 'Kairouan', 'Monastir']
        existing = TransportJob.objects.filter(description=MARKER).count()

        for i in range(existing, count):
            gov_from = governorates[i % len(governorates)]
            gov_to = governorates[(i + 3) % len(governorates)]
            TransportJob.objects.create(
                owner=self.client_1 if i % 2 == 0 else self.client_2,
                job_type='TRANSPORT' if i % 3 else 'MOVING',
                status='PUBLISHED',
                is_return_trip=False,
                pickup_address=f'Adresse départ {i + 1}, {gov_from}',
                pickup_governorate=gov_from,
                dropoff_address=f'Adresse arrivée {i + 1}, {gov_to}',
                dropoff_governorate=gov_to,
                scheduled_time=timezone.now() + timedelta(days=1 + (i % 14)),
                price_tnd_min=Decimal(50 + (i % 10) * 10),
                price_tnd_max=Decimal(150 + (i % 10) * 20),
                description=MARKER,
                specifications={'items': ['Colis'], 'weight_kg': 20 + (i % 5) * 10},
            )

        created = max(0, count - existing)
        self.stdout.write(self.style.SUCCESS(f'   ✓ {created} volumetry jobs created ({existing} already present)'))
