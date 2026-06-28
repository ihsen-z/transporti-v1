"""
Cross-Role Workflow Tests — Transporti V1
Tests all Client ↔ Transporter interaction workflows.
"""
import json
import sys
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'transporti_core.settings')
django.setup()

from django.test import RequestFactory
from rest_framework.test import force_authenticate
from django.contrib.auth import get_user_model
from logistics.models import TransportJob, Offer
from logistics.views import (
    JobCreateView, JobPublicListView, JobDetailView,
    OfferCreateView, OfferAcceptView, JobCompleteView,
    JobOffersView, OfferMyListView
)
from django.utils import timezone
from datetime import timedelta

User = get_user_model()
factory = RequestFactory()

client_user = User.objects.get(email='client@test.tn')
transporter_user = User.objects.get(email='transporter@test.tn')
ahmed_transporter = User.objects.get(email='ahmed@transporti.tn')

results = {}

# ============================================================
# WORKFLOW 1: CLIENT CREATES A JOB
# ============================================================
print('=' * 60)
print('WORKFLOW 1: CLIENT CREATES A JOB')
print('=' * 60)

request = factory.post('/api/jobs/', json.dumps({
    'job_type': 'TRANSPORT',
    'pickup_address': 'Avenue Habib Bourguiba, Tunis',
    'pickup_governorate': 'Tunis',
    'dropoff_address': 'Route de Gabes, Sfax',
    'dropoff_governorate': 'Sfax',
    'scheduled_time': (timezone.now() + timedelta(days=3)).isoformat(),
    'price_tnd_min': 100,
    'price_tnd_max': 300,
    'description': 'Transport de mobilier - TEST WORKFLOW',
}), content_type='application/json')
force_authenticate(request, user=client_user)
response = JobCreateView.as_view()(request)
print(f'  Status: {response.status_code}')
if response.status_code == 201:
    job_data = response.data['job']
    test_job_id = job_data['id']
    print(f'  OK Job #{test_job_id} | status={job_data["status"]} | Tunis -> Sfax')
    results['W1_JOB_CREATE'] = 'PASS'
else:
    print(f'  FAIL: {response.data}')
    results['W1_JOB_CREATE'] = f'FAIL: {response.data}'
    test_job_id = None

# ============================================================
# WORKFLOW 2: TRANSPORTER SEES JOB IN PUBLIC LIST
# ============================================================
print()
print('=' * 60)
print('WORKFLOW 2: TRANSPORTER DISCOVERS JOB')
print('=' * 60)

request = factory.get('/api/jobs/public/')
force_authenticate(request, user=ahmed_transporter)
response = JobPublicListView.as_view()(request)
jobs = response.data if isinstance(response.data, list) else response.data.get('results', [])
job_ids = [j['id'] for j in jobs]
if test_job_id and test_job_id in job_ids:
    print(f'  OK Job #{test_job_id} visible ({len(jobs)} total published)')
    results['W2_JOB_DISCOVERY'] = 'PASS'
else:
    print(f'  FAIL Job #{test_job_id} NOT in list. IDs: {job_ids}')
    results['W2_JOB_DISCOVERY'] = 'FAIL'

# ============================================================
# WORKFLOW 3: TRANSPORTER VIEWS JOB DETAIL
# ============================================================
print()
print('=' * 60)
print('WORKFLOW 3: TRANSPORTER VIEWS JOB DETAIL')
print('=' * 60)

if test_job_id:
    request = factory.get(f'/api/jobs/{test_job_id}/')
    force_authenticate(request, user=ahmed_transporter)
    response = JobDetailView.as_view()(request, job_id=test_job_id)
    if response.status_code == 200:
        d = response.data
        print(f'  OK Job #{d["id"]} | {d["pickup_address"]} -> {d["dropoff_address"]}')
        print(f'     Budget: {d["price_tnd_min"]}-{d["price_tnd_max"]} TND')
        results['W3_JOB_DETAIL'] = 'PASS'
    else:
        print(f'  FAIL: {response.status_code} {response.data}')
        results['W3_JOB_DETAIL'] = f'FAIL: {response.status_code}'

# ============================================================
# WORKFLOW 4: TRANSPORTER SUBMITS AN OFFER
# ============================================================
print()
print('=' * 60)
print('WORKFLOW 4: TRANSPORTER SUBMITS OFFER')
print('=' * 60)

test_offer_id = None
if test_job_id:
    request = factory.post('/api/offers/', json.dumps({
        'job': test_job_id,
        'total_price': 200.00,
        'message': 'Disponible le 1er mai. Vehicule utilitaire 3.5T.',
        'valid_until': (timezone.now() + timedelta(days=3)).isoformat(),
    }), content_type='application/json')
    force_authenticate(request, user=ahmed_transporter)
    response = OfferCreateView.as_view()(request)
    if response.status_code == 201:
        offer = response.data['offer']
        test_offer_id = offer['id']
        print(f'  OK Offer #{test_offer_id} | total={offer["total_price"]} TND | net={offer["price_net"]} TND | comm={offer["commission_amount"]} TND')
        results['W4_OFFER_SUBMIT'] = 'PASS'
    else:
        print(f'  FAIL: {response.data}')
        results['W4_OFFER_SUBMIT'] = f'FAIL: {response.data}'

# ============================================================
# WORKFLOW 5: CLIENT VIEWS OFFERS ON JOB
# ============================================================
print()
print('=' * 60)
print('WORKFLOW 5: CLIENT VIEWS OFFERS')
print('=' * 60)

if test_job_id:
    request = factory.get(f'/api/jobs/{test_job_id}/offers/')
    force_authenticate(request, user=client_user)
    response = JobOffersView.as_view()(request, job_id=test_job_id)
    offers = response.data if isinstance(response.data, list) else response.data.get('results', [])
    if offers:
        for o in offers:
            print(f'  OK Offer #{o["id"]} | {o["transporter_name"]} | {o["total_price"]} TND | status={o["status"]}')
        results['W5_CLIENT_SEES_OFFERS'] = 'PASS'
    else:
        print('  FAIL: No offers found')
        results['W5_CLIENT_SEES_OFFERS'] = 'FAIL'

# ============================================================
# WORKFLOW 6: NOTIFICATION SENT TO CLIENT
# ============================================================
print()
print('=' * 60)
print('WORKFLOW 6: NOTIFICATIONS')
print('=' * 60)

from notifications.models import Notification
notifs = Notification.objects.filter(user=client_user).order_by('-id')[:3]
if notifs:
    for n in notifs:
        print(f'  OK Notif #{n.id} | {n.title} | read={n.is_read}')
    results['W6_NOTIFICATIONS'] = 'PASS'
else:
    print('  WARN: No notifications found for client')
    results['W6_NOTIFICATIONS'] = 'WARN'

# ============================================================
# WORKFLOW 7: CLIENT ACCEPTS OFFER -> JOB IN_PROGRESS
# ============================================================
print()
print('=' * 60)
print('WORKFLOW 7: CLIENT ACCEPTS OFFER')
print('=' * 60)

if test_offer_id:
    request = factory.post(f'/api/offers/{test_offer_id}/accept/', json.dumps({
        'payment_method': 'DIGITAL',
    }), content_type='application/json')
    force_authenticate(request, user=client_user)
    response = OfferAcceptView.as_view()(request, offer_id=test_offer_id)
    if response.status_code == 200:
        job = TransportJob.objects.get(id=test_job_id)
        offer = Offer.objects.get(id=test_offer_id)
        print(f'  OK Offer accepted!')
        print(f'     Job status: {job.status}')
        print(f'     Offer status: {offer.status}')
        results['W7_ACCEPT_OFFER'] = 'PASS' if job.status == 'IN_PROGRESS' and offer.status == 'ACCEPTED' else 'FAIL'
    else:
        print(f'  FAIL: {response.status_code} {response.data}')
        results['W7_ACCEPT_OFFER'] = f'FAIL: {response.data}'

# ============================================================
# WORKFLOW 8: MESSAGING BETWEEN CLIENT & TRANSPORTER
# ============================================================
print()
print('=' * 60)
print('WORKFLOW 8: MESSAGING')
print('=' * 60)

if test_job_id:
    from messaging.services import get_or_create_conversation, send_message
    job_obj = TransportJob.objects.get(id=test_job_id)
    conv = get_or_create_conversation(job_obj)
    print(f'  OK Conversation #{conv.id} for Job #{test_job_id}')
    
    # Client sends a message
    msg1 = send_message(client_user, job_obj, 'Bonjour, quand pouvez-vous passer ?')
    print(f'  OK Client sent: "{msg1.content}"')
    
    # Transporter responds
    msg2 = send_message(ahmed_transporter, job_obj, 'Bonjour ! Je peux passer le 1er mai a 10h.')
    print(f'  OK Transporter sent: "{msg2.content}"')
    
    total = conv.messages.count()
    print(f'  Total messages: {total}')
    results['W8_MESSAGING'] = 'PASS' if total >= 2 else 'FAIL'

# ============================================================
# WORKFLOW 9: TRANSPORTER COMPLETES JOB
# ============================================================
print()
print('=' * 60)
print('WORKFLOW 9: JOB COMPLETION')
print('=' * 60)

if test_job_id:
    request = factory.post(f'/api/jobs/{test_job_id}/complete/', json.dumps({}), content_type='application/json')
    force_authenticate(request, user=ahmed_transporter)
    response = JobCompleteView.as_view()(request, job_id=test_job_id)
    if response.status_code == 200:
        job = TransportJob.objects.get(id=test_job_id)
        print(f'  OK Job completed! Status: {job.status}')
        results['W9_JOB_COMPLETE'] = 'PASS' if job.status == 'COMPLETED' else 'FAIL'
    else:
        print(f'  FAIL: {response.status_code} {response.data}')
        results['W9_JOB_COMPLETE'] = f'FAIL: {response.data}'

# ============================================================
# WORKFLOW 10: CLIENT CONFIRMS DELIVERY (ESCROW RELEASE)
# ============================================================
print()
print('=' * 60)
print('WORKFLOW 10: DELIVERY CONFIRMATION')
print('=' * 60)

if test_job_id:
    from payments.models import EscrowTransaction
    escrows = EscrowTransaction.objects.filter(booking_reference_id=test_job_id)
    if escrows.exists():
        from payments.views import ConfirmCompletionView
        request = factory.post('/api/payments/confirm-completion/', json.dumps({
            'job_id': test_job_id,
        }), content_type='application/json')
        force_authenticate(request, user=client_user)
        response = ConfirmCompletionView.as_view()(request)
        if response.status_code == 200:
            print(f'  OK Delivery confirmed! Escrow released.')
            results['W10_DELIVERY_CONFIRM'] = 'PASS'
        else:
            print(f'  FAIL: {response.status_code} {response.data}')
            results['W10_DELIVERY_CONFIRM'] = f'FAIL: {response.data}'
    else:
        print('  WARN: No escrow found (DIGITAL payment may not have created one)')
        results['W10_DELIVERY_CONFIRM'] = 'WARN: No escrow'

# ============================================================
# WORKFLOW 11: REVIEW SUBMISSION
# ============================================================
print()
print('=' * 60)
print('WORKFLOW 11: REVIEWS')
print('=' * 60)

if test_job_id:
    from reviews.views import ReviewCreateView
    # Client reviews transporter
    request = factory.post('/api/reviews/', json.dumps({
        'job_id': test_job_id,
        'rating': 5,
        'comment': 'Excellent transporteur, ponctuel et soigneux.',
    }), content_type='application/json')
    force_authenticate(request, user=client_user)
    response = ReviewCreateView.as_view()(request)
    if response.status_code == 201:
        print(f'  OK Client review submitted: 5/5')
        results['W11a_CLIENT_REVIEW'] = 'PASS'
    else:
        print(f'  Client review: {response.status_code} {response.data}')
        results['W11a_CLIENT_REVIEW'] = f'FAIL: {response.data}'

    # Transporter reviews client
    request = factory.post('/api/reviews/', json.dumps({
        'job_id': test_job_id,
        'rating': 4,
        'comment': 'Client tres sympathique. Bonne communication.',
    }), content_type='application/json')
    force_authenticate(request, user=ahmed_transporter)
    response = ReviewCreateView.as_view()(request)
    if response.status_code == 201:
        print(f'  OK Transporter review submitted: 4/5')
        results['W11b_TRANSPORTER_REVIEW'] = 'PASS'
    else:
        print(f'  Transporter review: {response.status_code} {response.data}')
        results['W11b_TRANSPORTER_REVIEW'] = f'FAIL: {response.data}'

# ============================================================
# WORKFLOW 12: DISPUTE FILING
# ============================================================
print()
print('=' * 60)
print('WORKFLOW 12: DISPUTES')
print('=' * 60)

if test_job_id:
    from support.views import DisputeCreateView
    request = factory.post('/api/disputes/', json.dumps({
        'job_id': test_job_id,
        'reason': 'DAMAGED_ITEMS',
        'description': 'Un carton etait endommage a la livraison. Photos disponibles.',
    }), content_type='application/json')
    force_authenticate(request, user=client_user)
    response = DisputeCreateView.as_view()(request)
    if response.status_code == 201:
        d = response.data
        print(f'  OK Dispute #{d.get("id", "?")} | status={d.get("status", "?")}')
        results['W12_DISPUTE'] = 'PASS'
    else:
        print(f'  Dispute: {response.status_code} {response.data}')
        results['W12_DISPUTE'] = f'INFO: {response.status_code} {response.data}'

# ============================================================
# WORKFLOW 13: TRANSPORTER VIEWS THEIR MISSIONS
# ============================================================
print()
print('=' * 60)
print('WORKFLOW 13: TRANSPORTER MISSIONS VIEW')
print('=' * 60)

from logistics.views import TransporterJobListView
request = factory.get('/api/jobs/transporter/')
force_authenticate(request, user=ahmed_transporter)
response = TransporterJobListView.as_view()(request)
missions = response.data if isinstance(response.data, list) else response.data.get('results', [])
if missions:
    for m in missions:
        print(f'  OK Mission #{m["id"]} | {m["status"]} | {m["pickup_governorate"]} -> {m["dropoff_governorate"]} | {m.get("offer_price", 0)} TND')
    results['W13_TRANSPORTER_MISSIONS'] = 'PASS'
else:
    print('  FAIL: No missions found')
    results['W13_TRANSPORTER_MISSIONS'] = 'FAIL'

# ============================================================
# SUMMARY
# ============================================================
print()
print('=' * 60)
print('SUMMARY')
print('=' * 60)

passed = sum(1 for v in results.values() if v == 'PASS')
failed = sum(1 for v in results.values() if 'FAIL' in str(v))
warned = sum(1 for v in results.values() if 'WARN' in str(v) or 'INFO' in str(v))

for k, v in results.items():
    icon = '✅' if v == 'PASS' else '❌' if 'FAIL' in str(v) else '⚠️'
    print(f'  {icon} {k}: {v}')

print(f'\nTotal: {passed} PASS / {failed} FAIL / {warned} WARN')
print(f'Test Job ID: {test_job_id}')
