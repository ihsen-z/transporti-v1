"""Test: Client can view return trip detail."""
import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'transporti_core.settings'
django.setup()

from django.test import RequestFactory
from rest_framework.test import force_authenticate
from django.contrib.auth import get_user_model
from logistics.views import JobDetailView
from logistics.models import TransportJob

User = get_user_model()
factory = RequestFactory()

# Get client user
client_user = User.objects.get(email='client@test.tn')
print(f"Client: {client_user.email} (role: {client_user.role})")

# Get a published return trip
rt = TransportJob.objects.filter(is_return_trip=True, status='PUBLISHED').first()
if not rt:
    print("ERROR: No PUBLISHED return trip found!")
    exit(1)

print(f"Return trip ID: {rt.id}, owner: {rt.owner.email}, status: {rt.status}")

# Test the API
req = factory.get(f'/api/jobs/{rt.id}/')
force_authenticate(req, user=client_user)
resp = JobDetailView.as_view()(req, job_id=rt.id)

print(f"Response Status: {resp.status_code}")

if resp.status_code == 200:
    data = resp.data
    print(f"  is_return_trip: {data.get('is_return_trip')}")
    print(f"  available_capacity: {data.get('available_capacity')}")
    print(f"  pickup: {data.get('pickup_address')} -> {data.get('dropoff_address')}")
    print(f"  price: {data.get('price_tnd_min')} - {data.get('price_tnd_max')} TND")
    print("PASS: Client can view return trip details!")
else:
    print(f"FAIL: Got {resp.status_code} - {resp.data}")
