"""
Sprint 2 — D3 (escrow strict), portefeuille (D4) et stats canoniques (B2).

Couvre :
- acceptation d'offre → MATCHED + Booking créé (plus d'IN_PROGRESS direct)
- initiation de paiement au statut MATCHED, verify → escrow HELD → IN_PROGRESS
- COD : confirm-start par le transporteur assigné uniquement
- refund_escrow (annulation transporteur)
- GET /api/wallet/ + demande de retrait (bornes)
- GET /api/transporter/stats/ (cohérence K1/K2/K4)
"""
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from logistics.models import TransportJob, Offer
from trust.models import TrustProfile, VerificationStatus
from payments.models import Booking, EscrowTransaction, WithdrawalRequest

User = get_user_model()


@override_settings(
    REST_FRAMEWORK={'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}},
    PAYMENT_GATEWAY='SANDBOX',
)
class PaymentLockTestBase(APITestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(
            username='lock_client', email='lockclient@test.tn',
            password='SecurePass123!', role='CLIENT',
            first_name='Client', last_name='Test',
        )
        self.transporter = User.objects.create_user(
            username='lock_transporter', email='locktransporter@test.tn',
            password='SecurePass123!', role='TRANSPORTER',
            first_name='Trans', last_name='Porter',
        )
        TrustProfile.objects.create(
            user=self.transporter,
            verification_status=VerificationStatus.VERIFIED,
            verified_at=timezone.now(),
        )

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _job(self, job_type='TRANSPORT', total=None):
        return TransportJob.objects.create(
            owner=self.client_user, status='PUBLISHED', job_type=job_type,
            pickup_address='Tunis', pickup_lat=Decimal('36.8'), pickup_lng=Decimal('10.1'),
            dropoff_address='Sfax', dropoff_lat=Decimal('34.7'), dropoff_lng=Decimal('10.7'),
            scheduled_time=timezone.now() + timedelta(days=2),
        )

    def _offer(self, job, net='100.00'):
        self._auth(self.transporter)
        resp = self.client.post('/api/offers/', {
            'job': job.id, 'price_net': net, 'message': 't',
            'valid_until': (timezone.now() + timedelta(days=3)).isoformat(),
        }, format='json')
        assert resp.status_code == 201, resp.data
        return Offer.objects.get(job=job)

    def _accept(self, offer, payment_method='DIGITAL'):
        self._auth(self.client_user)
        return self.client.post(
            f'/api/offers/{offer.id}/accept/',
            {'payment_method': payment_method}, format='json',
        )


class EscrowStrictFlowTests(PaymentLockTestBase):
    def test_accept_creates_matched_and_booking(self):
        job = self._job()
        offer = self._offer(job)
        resp = self._accept(offer, 'DIGITAL')
        self.assertEqual(resp.status_code, 200, resp.data)

        job.refresh_from_db()
        self.assertEqual(job.status, 'MATCHED')
        booking = Booking.objects.get(job=job)
        self.assertEqual(booking.payment_method, 'DIGITAL')
        self.assertEqual(booking.final_price, Decimal('112.00'))
        self.assertEqual(booking.commission_rate, Decimal('0.12'))

    def test_digital_payment_flow_starts_job(self):
        job = self._job()
        offer = self._offer(job)
        self._accept(offer, 'DIGITAL')

        # Initiate payment (MATCHED required)
        self._auth(self.client_user)
        resp = self.client.post('/api/payments/initiate/', {'job_id': job.id}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        gateway_ref = resp.data['gateway_ref']

        escrow = EscrowTransaction.objects.get(gateway_reference=gateway_ref)
        self.assertEqual(escrow.status, 'INITIATED')
        job.refresh_from_db()
        self.assertEqual(job.status, 'MATCHED')  # pas encore démarré

        # Verify (sandbox → completed) : escrow HELD + job IN_PROGRESS
        resp = self.client.post('/api/payments/verify/', {'gateway_ref': gateway_ref}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['status'], 'HELD')
        self.assertEqual(resp.data['job_status'], 'IN_PROGRESS')

    def test_initiate_rejected_when_not_matched(self):
        job = self._job()
        offer = self._offer(job)
        self._accept(offer, 'COD')
        # COD booking → initiation refusée
        self._auth(self.client_user)
        resp = self.client.post('/api/payments/initiate/', {'job_id': job.id}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_cod_confirm_start_by_assigned_transporter(self):
        job = self._job()
        offer = self._offer(job)
        self._accept(offer, 'COD')

        # Le client ne peut pas confirmer (rôle transporteur requis)
        self._auth(self.client_user)
        resp = self.client.post(f'/api/jobs/{job.id}/confirm-start/', {}, format='json')
        self.assertEqual(resp.status_code, 403)

        # Le transporteur assigné confirme
        self._auth(self.transporter)
        resp = self.client.post(f'/api/jobs/{job.id}/confirm-start/', {}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        job.refresh_from_db()
        self.assertEqual(job.status, 'IN_PROGRESS')

    def test_confirm_start_rejected_for_digital(self):
        job = self._job()
        offer = self._offer(job)
        self._accept(offer, 'DIGITAL')
        self._auth(self.transporter)
        resp = self.client.post(f'/api/jobs/{job.id}/confirm-start/', {}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_transporter_cancel_refunds_escrow(self):
        job = self._job()
        offer = self._offer(job)
        self._accept(offer, 'DIGITAL')
        # Paiement complet
        self._auth(self.client_user)
        ref = self.client.post('/api/payments/initiate/', {'job_id': job.id}, format='json').data['gateway_ref']
        self.client.post('/api/payments/verify/', {'gateway_ref': ref}, format='json')

        # Annulation transporteur → escrow REFUNDED, job re-PUBLISHED, booking purgé
        self._auth(self.transporter)
        resp = self.client.post(
            f'/api/jobs/{job.id}/transporter-cancel/',
            {'reason': 'panne'}, format='json',
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        escrow = EscrowTransaction.objects.get(gateway_reference=ref)
        self.assertEqual(escrow.status, 'REFUNDED')
        job.refresh_from_db()
        self.assertEqual(job.status, 'PUBLISHED')
        self.assertFalse(Booking.objects.filter(job=job).exists())


class WalletTests(PaymentLockTestBase):
    def _completed_paid_job(self, net='100.00'):
        """Mission payée, livrée, escrow libéré."""
        job = self._job()
        offer = self._offer(job, net)
        self._accept(offer, 'DIGITAL')
        self._auth(self.client_user)
        ref = self.client.post('/api/payments/initiate/', {'job_id': job.id}, format='json').data['gateway_ref']
        self.client.post('/api/payments/verify/', {'gateway_ref': ref}, format='json')
        # Livraison + libération
        self._auth(self.transporter)
        self.client.post(f'/api/jobs/{job.id}/complete/', {}, format='json')
        self._auth(self.client_user)
        resp = self.client.post('/api/payments/confirm-completion/', {'job_id': job.id}, format='json')
        assert resp.status_code == 200, resp.data
        return job

    def test_wallet_balance_after_release(self):
        self._completed_paid_job('100.00')
        self._auth(self.transporter)
        resp = self.client.get('/api/wallet/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['released_net'], 100.0)
        self.assertEqual(resp.data['available'], 100.0)
        self.assertEqual(resp.data['pending_net'], 0.0)
        kinds = {h['kind'] for h in resp.data['history']}
        self.assertIn('ESCROW', kinds)

    def test_withdrawal_bounds(self):
        self._completed_paid_job('100.00')
        self._auth(self.transporter)
        # Trop grand
        resp = self.client.post('/api/wallet/withdrawals/', {
            'amount': '150.00', 'bank_details': 'RIB 123'}, format='json')
        self.assertEqual(resp.status_code, 400)
        # Trop petit
        resp = self.client.post('/api/wallet/withdrawals/', {
            'amount': '5.00', 'bank_details': 'RIB 123'}, format='json')
        self.assertEqual(resp.status_code, 400)
        # OK
        resp = self.client.post('/api/wallet/withdrawals/', {
            'amount': '60.00', 'bank_details': 'RIB 123'}, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        # Solde décrémenté
        wallet = self.client.get('/api/wallet/').data
        self.assertEqual(wallet['available'], 40.0)
        self.assertEqual(wallet['withdrawals_total'], 60.0)

    def test_wallet_forbidden_for_client(self):
        self._auth(self.client_user)
        resp = self.client.get('/api/wallet/')
        self.assertEqual(resp.status_code, 403)


class TransporterStatsTests(PaymentLockTestBase):
    def test_stats_consistency(self):
        # 2 missions publiées visibles + 1 offre en attente
        job_a, job_b = self._job(), self._job()
        self._offer(job_a, '50.00')

        self._auth(self.transporter)
        resp = self.client.get('/api/transporter/stats/')
        self.assertEqual(resp.status_code, 200)
        s = resp.data
        # K1 = exactement la liste browse (2 publiées, non-retour, futures)
        self.assertEqual(s['available_missions'], 2)
        # K2/K3 : 1 pending non expirée
        self.assertEqual(s['pending_offers'], 1)
        self.assertEqual(s['active_offers'], 1)
        # K4 : rien de libéré
        self.assertEqual(s['earnings_confirmed'], 0.0)
        # K7/K8 : pas de données → None (jamais un faux 100 %)
        self.assertIsNone(s['completion_rate'])
        self.assertIsNone(s['average_rating'])

    def test_stats_after_completed_mission(self):
        WalletTests._completed_paid_job(self)  # réutilise le flux complet
        self._auth(self.transporter)
        s = self.client.get('/api/transporter/stats/').data
        self.assertEqual(s['completed_missions'], 1)
        self.assertEqual(s['earnings_confirmed'], 100.0)
        self.assertEqual(s['completion_rate'], 100.0)
