"""
Transporti V1 — Database Seed Script
Creates test users, jobs, offers, and conversations for testing.
Run: python manage.py shell < seed_data.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'transporti_core.settings')
django.setup()

from django.contrib.auth import get_user_model
from logistics.models import TransportJob, Offer
from messaging.services import send_message, send_system_message

User = get_user_model()

print("🌱 Seeding Transporti V1 database...")

# ── Users ──────────────────────────────────────────────────
users_data = [
    {'email': 'leila.benamor@test.transporti.tn', 'username': 'leila', 'first_name': 'Leilaa', 'last_name': 'Ben Amor', 'role': 'CLIENT', 'phone': '+21650111001', 'password': 'Test1234!'},
    {'email': 'ahmed.trabelsi@test.transporti.tn', 'username': 'ahmed', 'first_name': 'Ahmed', 'last_name': 'Trabelsi', 'role': 'CLIENT', 'phone': '+21650111002', 'password': 'Test1234!'},
    {'email': 'mehdi.khelifi@test.transporti.tn', 'username': 'mehdi', 'first_name': 'Mehdi', 'last_name': 'Khelifi', 'role': 'TRANSPORTER', 'phone': '+21650222001', 'password': 'Test1234!'},
    {'email': 'sami.gharbi@test.transporti.tn', 'username': 'sami', 'first_name': 'Sami', 'last_name': 'Gharbi', 'role': 'TRANSPORTER', 'phone': '+21650222002', 'password': 'Test1234!'},
    {'email': 'fatma.rejeb@admin.transporti.tn', 'username': 'fatma', 'first_name': 'Fatma', 'last_name': 'Rejeb', 'role': 'MODERATOR', 'phone': '+21650333001', 'password': 'Test1234!'},
    {'email': 'karim.bouzid@admin.transporti.tn', 'username': 'karim', 'first_name': 'Karim', 'last_name': 'Bouzid', 'role': 'ADMIN', 'phone': '+21650333002', 'password': 'Admin1234!'},
]

created_users = []
for u in users_data:
    pwd = u.pop('password')
    user, created = User.objects.get_or_create(email=u['email'], defaults=u)
    if created:
        user.set_password(pwd)
        user.save()
        print(f"  ✅ Created user: {user.email} ({user.role})")
    else:
        print(f"  ⏭️  User exists: {user.email}")
    created_users.append(user)

leila, ahmed, mehdi, sami, fatma, karim = created_users

from django.utils import timezone
from datetime import timedelta

jobs_data = [
    {
        'owner': leila, 'pickup_address': 'Rue de Marseille, La Marsa',
        'dropoff_address': 'Rue du Lac Léman, Lac 2', 'status': 'COMPLETED',
        'job_type': 'MOVING', 'description': 'Déménagement complet 3 pièces',
        'scheduled_time': timezone.now() - timedelta(days=7),
    },
    {
        'owner': ahmed, 'pickup_address': 'Avenue Habib Bourguiba, Tunis',
        'dropoff_address': 'Boulevard du 14 Janvier, Sousse', 'status': 'IN_PROGRESS',
        'job_type': 'DELIVERY', 'description': 'Livraison de mobilier de bureau',
        'scheduled_time': timezone.now() + timedelta(days=2),
    },
    {
        'owner': leila, 'pickup_address': 'Rue de Palestine, Ariana',
        'dropoff_address': 'Rue de France, La Marsa', 'status': 'PUBLISHED',
        'job_type': 'MOVING', 'description': 'Déménagement studio étudiant',
        'scheduled_time': timezone.now() + timedelta(days=7),
    },
    {
        'owner': leila, 'pickup_address': 'Route de la Marsa, Tunis',
        'dropoff_address': 'Sousse Centre', 'status': 'PUBLISHED',
        'job_type': 'DELIVERY', 'description': 'Transport de cartons',
        'scheduled_time': timezone.now() + timedelta(days=12),
    },
]

created_jobs = []
for jd in jobs_data:
    owner = jd.pop('owner')
    job, created = TransportJob.objects.get_or_create(
        owner=owner,
        pickup_address=jd['pickup_address'],
        defaults=jd,
    )
    if created:
        print(f"  ✅ Created job: #{job.id} {job.pickup_address} → {job.dropoff_address} [{job.status}]")
    else:
        print(f"  ⏭️  Job exists: #{job.id}")
    created_jobs.append(job)

job1, job2, job3, job4 = created_jobs

# ── Offers ─────────────────────────────────────────────────
offers_data = [
    {'job': job1, 'transporter': mehdi, 'price_net': 350.0, 'commission_amount': 35.0, 'total_price': 385.0, 'status': 'ACCEPTED', 'message': 'Je suis disponible avec un camion 20m³', 'valid_until': timezone.now() + timedelta(days=30)},
    {'job': job2, 'transporter': mehdi, 'price_net': 200.0, 'commission_amount': 20.0, 'total_price': 220.0, 'status': 'ACCEPTED', 'message': 'Livraison express disponible', 'valid_until': timezone.now() + timedelta(days=30)},
    {'job': job3, 'transporter': sami, 'price_net': 180.0, 'commission_amount': 18.0, 'total_price': 198.0, 'status': 'PENDING', 'message': 'Je peux être là samedi matin', 'valid_until': timezone.now() + timedelta(days=14)},
]

for od in offers_data:
    job = od.pop('job')
    transporter = od.pop('transporter')
    offer, created = Offer.objects.get_or_create(
        job=job, transporter=transporter,
        defaults=od,
    )
    if created:
        print(f"  ✅ Created offer: #{offer.id} by {offer.transporter.first_name} for job #{offer.job.id} [{offer.status}]")
    else:
        print(f"  ⏭️  Offer exists: #{offer.id}")

# ── Messages ───────────────────────────────────────────────
print("\n📨 Seeding messages...")

# Job 1 (COMPLETED) — Leila ↔ Mehdi
try:
    send_message(leila, job1, 'Bonjour Mehdi, merci pour le déménagement !')
    send_message(mehdi, job1, 'De rien Leila ! Tout s\'est bien passé, bonne installation.')
    send_system_message(job1, 'Mission terminée avec succès.')
    print("  ✅ Messages seeded for job #1 (COMPLETED)")
except Exception as e:
    print(f"  ⚠️  Job #1 messages: {e}")

# Job 2 (IN_PROGRESS) — Ahmed ↔ Mehdi
try:
    send_message(ahmed, job2, 'Bonjour, à quelle heure arrivez-vous ?')
    send_message(mehdi, job2, 'Je serai là vers 10h. L\'accès est-il facile ?')
    send_message(ahmed, job2, 'Oui, parking gratuit devant le bâtiment.')
    print("  ✅ Messages seeded for job #2 (IN_PROGRESS)")
except Exception as e:
    print(f"  ⚠️  Job #2 messages: {e}")

print("\n🎉 Seed complete!")
