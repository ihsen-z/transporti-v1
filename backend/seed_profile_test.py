"""
Seed script to create test data for the transporter profile page.
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'transporti_core.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta

User = get_user_model()

from trust.models import TrustProfile
from reviews.models import Review
from logistics.models import TransportJob

# ── Client 1 ───────────────────────────────────────────────────
client, created = User.objects.get_or_create(
    email='client@test.tn',
    defaults={
        'username': 'client_test',
        'first_name': 'Ahmed',
        'last_name': 'Ben Ali',
        'phone': '22334455',
        'role': 'CLIENT',
    }
)
if created:
    client.set_password('Test1234!')
    client.save()
print(f'Client: {client.email} (ID: {client.id})')

# ── Client 2 ───────────────────────────────────────────────────
client2, created = User.objects.get_or_create(
    email='fatma@test.tn',
    defaults={
        'username': 'fatma_test',
        'first_name': 'Fatma',
        'last_name': 'Khelifi',
        'phone': '99887766',
        'role': 'CLIENT',
    }
)
if created:
    client2.set_password('Test1234!')
    client2.save()
print(f'Client2: {client2.email} (ID: {client2.id})')

# ── Transporter ────────────────────────────────────────────────
transporter, created = User.objects.get_or_create(
    email='transporter@test.tn',
    defaults={
        'username': 'transporter_test',
        'first_name': 'Mohamed',
        'last_name': 'Trabelsi',
        'phone': '55667788',
        'role': 'TRANSPORTER',
    }
)
if created:
    transporter.set_password('Test1234!')
    transporter.save()
print(f'Transporter: {transporter.email} (ID: {transporter.id})')

# ── TrustProfile ───────────────────────────────────────────────
trust, tp_created = TrustProfile.objects.get_or_create(user=transporter)
trust.verification_status = 'VERIFIED'
trust.trust_score = 92
trust.verified_at = timezone.now()
trust.vehicle_type = 'Camion bache - Hyundai HD65'
trust.vehicle_capacity_kg = 3500
trust.service_areas = ['Tunis', 'Sousse', 'Sfax']
trust.specializations = ['Meubles', 'Electromenager', 'Fragile', 'Construction']
trust.completion_rate = 96.50
trust.total_jobs_completed = 23
trust.response_time_avg_minutes = 22
trust.insurance_valid_until = date(2026, 12, 31)
trust.save()
print(f'TrustProfile OK (verified={trust.is_verified})')

# ── Transport Jobs for reviews ─────────────────────────────────
job1, _ = TransportJob.objects.get_or_create(
    owner=client,
    status='COMPLETED',
    pickup_address='10 Rue de la Liberte, Tunis',
    pickup_governorate='Tunis',
    dropoff_address='25 Avenue Bourguiba, Sousse',
    dropoff_governorate='Sousse',
    defaults={
        'job_type': 'TRANSPORT',
        'scheduled_time': timezone.now() - timedelta(days=30),
    }
)
print(f'Job1 ID: {job1.id}')

job2, _ = TransportJob.objects.get_or_create(
    owner=client2,
    status='COMPLETED',
    pickup_address='5 Rue de Marseille, Tunis',
    pickup_governorate='Tunis',
    dropoff_address='12 Rue El Jazira, Sfax',
    dropoff_governorate='Sfax',
    defaults={
        'job_type': 'TRANSPORT',
        'scheduled_time': timezone.now() - timedelta(days=10),
    }
)
print(f'Job2 ID: {job2.id}')

# ── Reviews ────────────────────────────────────────────────────
if Review.objects.filter(target=transporter).count() == 0:
    Review.objects.create(
        job=job1,
        reviewer=client,
        target=transporter,
        role='CLIENT',
        rating=5,
        comment='Excellent transporteur ! Ponctuel, soigneux avec les meubles, et tres professionnel.',
        aspects={'punctuality': 3, 'communication': 5, 'care': 5},
    )
    Review.objects.create(
        job=job2,
        reviewer=client2,
        target=transporter,
        role='CLIENT',
        rating=4,
        comment='Bon service. Un leger retard mais la livraison a ete faite correctement.',
        aspects={'punctuality': 3, 'communication': 4, 'care': 5},
    )
    print('2 reviews created')
else:
    print('Reviews already exist')

print('')
print(f'=== DONE ===')
print(f'TRANSPORTER USER ID: {transporter.id}')
print(f'Profile URL: /profile/{transporter.id}')
print(f'Login as client: client@test.tn / Test1234!')
