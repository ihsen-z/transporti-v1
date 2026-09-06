"""Test: BookReturnTripView — Client books a return trip directly."""
import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'transporti_core.settings'
django.setup()

from django.test import RequestFactory
from rest_framework.test import force_authenticate
from django.contrib.auth import get_user_model
from logistics.views import BookReturnTripView
from logistics.models import TransportJob, Offer

User = get_user_model()
factory = RequestFactory()

client_user = User.objects.get(email='client@test.tn')
print(f"Client: {client_user.email} (role: {client_user.role})")

# Find a PUBLISHED return trip not owned by client
rt = TransportJob.objects.filter(is_return_trip=True, status='PUBLISHED').exclude(owner=client_user).first()
if not rt:
    print("ERROR: No PUBLISHED return trip found!")
    exit(1)

print(f"Return trip: #{rt.id}, owner: {rt.owner.email}, price_min: {rt.price_tnd_min}")
print(f"Route: {rt.pickup_address} -> {rt.dropoff_address}")
print()

# === TEST 1: Successful booking ===
print("=" * 50)
print("TEST 1: Client books return trip with proposed price")
import json
req = factory.post(
    f'/api/jobs/{rt.id}/book-return/',
    data=json.dumps({'proposed_price': str(rt.price_tnd_min or 100), 'payment_method': 'DIGITAL'}),
    content_type='application/json'
)
force_authenticate(req, user=client_user)
resp = BookReturnTripView.as_view()(req, job_id=rt.id)

print(f"  Status: {resp.status_code}")
if resp.status_code == 201:
    data = resp.data
    print(f"  Message: {data.get('message')}")
    print(f"  Proposed price: {data.get('proposed_price')} TND")
    print(f"  Payment: {data.get('payment_method')}")
    print(f"  Job status: {data.get('job', {}).get('status')}")
    offer_data = data.get('accepted_offer', {})
    print(f"  Offer ID: {offer_data.get('id')}, status: {offer_data.get('status')}")
    print(f"  Net price: {offer_data.get('price_net')}, commission: {offer_data.get('commission_amount')}")
    print("  ✅ PASS")
else:
    print(f"  Error: {resp.data}")
    print("  ❌ FAIL")

# Refresh job
rt.refresh_from_db()
print(f"  Job status after booking: {rt.status}")

# Check offer was created
offer = Offer.objects.filter(job=rt, status='ACCEPTED').first()
if offer:
    print(f"  Offer found: #{offer.id}, transporter={offer.transporter.email}, price={offer.total_price}")
    print("  ✅ Offer correctly created")
else:
    print("  ❌ No accepted offer found!")

print()

# === TEST 2: Cannot book again (job not PUBLISHED anymore) ===
print("=" * 50)
print("TEST 2: Cannot book already-booked trip")
req2 = factory.post(
    f'/api/jobs/{rt.id}/book-return/',
    data=json.dumps({'proposed_price': '150', 'payment_method': 'DIGITAL'}),
    content_type='application/json'
)
force_authenticate(req2, user=client_user)
resp2 = BookReturnTripView.as_view()(req2, job_id=rt.id)
print(f"  Status: {resp2.status_code}")
if resp2.status_code == 400:
    print(f"  Error: {resp2.data.get('error')}")
    print("  ✅ PASS — Correctly rejected")
else:
    print(f"  Unexpected: {resp2.data}")
    print("  ❌ FAIL")

print()

# === TEST 3: Cannot book non-return-trip ===
print("=" * 50)
print("TEST 3: Cannot book a regular job via book-return")
regular_job = TransportJob.objects.filter(is_return_trip=False, status='PUBLISHED').first()
if regular_job:
    req3 = factory.post(
        f'/api/jobs/{regular_job.id}/book-return/',
        data=json.dumps({'proposed_price': '100', 'payment_method': 'DIGITAL'}),
        content_type='application/json'
    )
    force_authenticate(req3, user=client_user)
    resp3 = BookReturnTripView.as_view()(req3, job_id=regular_job.id)
    print(f"  Status: {resp3.status_code}")
    if resp3.status_code == 400:
        print("  ✅ PASS — Correctly rejected")
    else:
        print("  ❌ FAIL")
else:
    print("  ⚠️ No regular published job found to test")

print()

# === TEST 4: Missing price rejected ===
print("=" * 50)
print("TEST 4: Missing price rejected")
# Find another return trip
rt2 = TransportJob.objects.filter(is_return_trip=True, status='PUBLISHED').exclude(owner=client_user).first()
if rt2:
    req4 = factory.post(
        f'/api/jobs/{rt2.id}/book-return/',
        data=json.dumps({'payment_method': 'DIGITAL'}),
        content_type='application/json'
    )
    force_authenticate(req4, user=client_user)
    resp4 = BookReturnTripView.as_view()(req4, job_id=rt2.id)
    print(f"  Status: {resp4.status_code}")
    if resp4.status_code == 400:
        print("  ✅ PASS — Price required")
    else:
        print("  ❌ FAIL")
else:
    print("  ⚠️ No available return trip for this test (first one already booked)")

print()
print("=" * 50)
print("ALL TESTS COMPLETE")
