"""
Payments Module Tests — Sprint D Fondamentaux
Model-level tests for CommissionLedger, EscrowTransaction, and Booking.
Strictly additive: fills the empty tests.py stub.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import IntegrityError
from datetime import timedelta
from decimal import Decimal

from payments.models import (
    CommissionLedger, EscrowTransaction, Booking, RefundRequest,
)
from payments.services import (
    refund_escrow, split_escrow, get_escrow_eligible_for_auto_release,
)
from logistics.models import TransportJob, Offer
from support.models import Dispute

User = get_user_model()


class PaymentsTestBase(TestCase):
    """Shared setup for payment tests."""

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='pay_client',
            email='payclient@test.tn',
            password='SecurePass123!',
            role='CLIENT',
        )
        self.transporter_user = User.objects.create_user(
            username='pay_transporter',
            email='paytransporter@test.tn',
            password='SecurePass123!',
            role='TRANSPORTER',
        )
        self.job = TransportJob.objects.create(
            owner=self.client_user,
            status='PUBLISHED',
            job_type='TRANSPORT',
            pickup_address='Tunis Centre',
            pickup_lat=Decimal('36.8065'),
            pickup_lng=Decimal('10.1815'),
            dropoff_address='Sousse Ville',
            dropoff_lat=Decimal('35.8256'),
            dropoff_lng=Decimal('10.6369'),
            scheduled_time=timezone.now() + timedelta(days=1),
        )
        self.offer = Offer.objects.create(
            job=self.job,
            transporter=self.transporter_user,
            status='ACCEPTED',
            price_net=Decimal('80.00'),
            commission_amount=Decimal('20.00'),
            total_price=Decimal('100.00'),
            valid_until=timezone.now() + timedelta(days=3),
        )


class CommissionLedgerTests(PaymentsTestBase):
    """Tests for the CommissionLedger model."""

    def test_create_commission_entry(self):
        """Can create a commission ledger entry."""
        entry = CommissionLedger.objects.create(
            transporter=self.transporter_user,
            job_reference=self.job,
            amount=Decimal('20.00'),
        )
        self.assertFalse(entry.is_settled)
        self.assertEqual(entry.amount, Decimal('20.00'))
        self.assertIsNotNone(entry.created_at)
        self.assertIsNone(entry.settled_at)

    def test_commission_str(self):
        """CommissionLedger __str__ includes transporter and amount."""
        entry = CommissionLedger.objects.create(
            transporter=self.transporter_user,
            job_reference=self.job,
            amount=Decimal('15.50'),
        )
        self.assertIn('15.50', str(entry))

    def test_commission_settlement(self):
        """Can mark a commission as settled."""
        entry = CommissionLedger.objects.create(
            transporter=self.transporter_user,
            job_reference=self.job,
            amount=Decimal('20.00'),
        )
        entry.is_settled = True
        entry.settled_at = timezone.now()
        entry.save()
        entry.refresh_from_db()
        self.assertTrue(entry.is_settled)
        self.assertIsNotNone(entry.settled_at)

    def test_commission_one_per_job(self):
        """OneToOneField prevents duplicate commission per job."""
        CommissionLedger.objects.create(
            transporter=self.transporter_user,
            job_reference=self.job,
            amount=Decimal('20.00'),
        )
        with self.assertRaises(IntegrityError):
            CommissionLedger.objects.create(
                transporter=self.transporter_user,
                job_reference=self.job,
                amount=Decimal('10.00'),
            )


class EscrowTransactionTests(PaymentsTestBase):
    """Tests for the EscrowTransaction model state machine."""

    def test_create_escrow_default_initiated(self):
        """New escrow transaction defaults to INITIATED."""
        escrow = EscrowTransaction.objects.create(
            booking_reference=self.job,
            amount=Decimal('100.00'),
        )
        self.assertEqual(escrow.status, 'INITIATED')
        self.assertIsNotNone(escrow.created_at)

    def test_escrow_initiated_to_held(self):
        """INITIATED → HELD is a valid transition."""
        escrow = EscrowTransaction.objects.create(
            booking_reference=self.job,
            amount=Decimal('100.00'),
        )
        escrow.status = EscrowTransaction.Status.HELD
        escrow.save()
        escrow.refresh_from_db()
        self.assertEqual(escrow.status, 'HELD')

    def test_escrow_held_to_released(self):
        """HELD → RELEASED is a valid transition."""
        escrow = EscrowTransaction.objects.create(
            booking_reference=self.job,
            status='HELD',
            amount=Decimal('100.00'),
        )
        escrow.status = EscrowTransaction.Status.RELEASED
        escrow.save()
        escrow.refresh_from_db()
        self.assertEqual(escrow.status, 'RELEASED')

    def test_escrow_held_to_refunded(self):
        """HELD → REFUNDED is a valid transition."""
        escrow = EscrowTransaction.objects.create(
            booking_reference=self.job,
            status='HELD',
            amount=Decimal('100.00'),
        )
        escrow.status = EscrowTransaction.Status.REFUNDED
        escrow.save()
        escrow.refresh_from_db()
        self.assertEqual(escrow.status, 'REFUNDED')

    def test_escrow_str_includes_status_amount(self):
        """EscrowTransaction __str__ includes status and amount."""
        escrow = EscrowTransaction.objects.create(
            booking_reference=self.job,
            amount=Decimal('250.00'),
        )
        s = str(escrow)
        self.assertIn('INITIATED', s)
        self.assertIn('250.00', s)


class BookingTests(PaymentsTestBase):
    """Tests for the Booking model."""

    def test_create_booking_digital(self):
        """Can create a digital payment booking."""
        booking = Booking.objects.create(
            job=self.job,
            accepted_offer=self.offer,
            final_price=Decimal('100.00'),
            commission_rate=Decimal('0.1500'),
            payment_method='DIGITAL',
        )
        self.assertEqual(booking.payment_method, 'DIGITAL')
        self.assertEqual(booking.final_price, Decimal('100.00'))
        self.assertIsNotNone(booking.created_at)

    def test_create_booking_cod(self):
        """Can create a COD payment booking."""
        booking = Booking.objects.create(
            job=self.job,
            accepted_offer=self.offer,
            final_price=Decimal('80.00'),
            commission_rate=Decimal('0.2000'),
            payment_method='COD',
            cod_allowed=True,
        )
        self.assertEqual(booking.payment_method, 'COD')
        self.assertTrue(booking.cod_allowed)

    def test_booking_one_per_job(self):
        """OneToOneField prevents duplicate bookings per job."""
        Booking.objects.create(
            job=self.job,
            accepted_offer=self.offer,
            final_price=Decimal('100.00'),
            commission_rate=Decimal('0.1500'),
        )
        # Need a different offer for the second booking attempt
        offer2 = Offer.objects.create(
            job=self.job,
            transporter=self.transporter_user,
            status='PENDING',
            price_net=Decimal('90.00'),
            commission_amount=Decimal('10.00'),
            total_price=Decimal('100.00'),
            valid_until=timezone.now() + timedelta(days=3),
        )
        with self.assertRaises(IntegrityError):
            Booking.objects.create(
                job=self.job,
                accepted_offer=offer2,
                final_price=Decimal('100.00'),
                commission_rate=Decimal('0.1500'),
            )


class RefundEscrowTests(PaymentsTestBase):
    """
    K1/K2 — refund_escrow must move the money (gateway) AND record it in the
    back-office queue (RefundRequest), never leave a refund only in the DB.
    """

    def _held_escrow(self, amount='100.00'):
        return EscrowTransaction.objects.create(
            booking_reference=self.job,
            status=EscrowTransaction.Status.HELD,
            amount=Decimal(amount),
            gateway_reference='SANDBOX-REF-123',
        )

    def test_refund_escrow_marks_refunded(self):
        """HELD escrow becomes REFUNDED."""
        escrow = self._held_escrow()
        result = refund_escrow(self.job, reason='Client cancelled')
        self.assertIsNotNone(result)
        escrow.refresh_from_db()
        self.assertEqual(escrow.status, EscrowTransaction.Status.REFUNDED)

    def test_refund_escrow_creates_refund_request(self):
        """K2 — a RefundRequest is created for the client, matching the amount."""
        self._held_escrow(amount='100.00')
        refund_escrow(self.job, reason='Client cancelled')

        rr = RefundRequest.objects.get(job=self.job)
        self.assertEqual(rr.beneficiary, self.client_user)
        self.assertEqual(rr.beneficiary_type, RefundRequest.Beneficiary.CLIENT)
        self.assertEqual(rr.amount, Decimal('100.00'))
        self.assertEqual(rr.gateway_reference, 'SANDBOX-REF-123')

    def test_refund_escrow_sandbox_auto_paid(self):
        """K1 — SANDBOX gateway refunds automatically → row PAID + auto_executed."""
        self._held_escrow()
        refund_escrow(self.job)
        rr = RefundRequest.objects.get(job=self.job)
        self.assertTrue(rr.auto_executed)
        self.assertEqual(rr.status, RefundRequest.Status.PAID)
        self.assertIsNotNone(rr.processed_at)

    def test_refund_escrow_no_escrow_returns_none(self):
        """No refundable escrow → None, no RefundRequest."""
        result = refund_escrow(self.job)
        self.assertIsNone(result)
        self.assertEqual(RefundRequest.objects.count(), 0)

    def test_refund_escrow_ignores_released(self):
        """RELEASED escrow is immutable — not refundable."""
        EscrowTransaction.objects.create(
            booking_reference=self.job,
            status=EscrowTransaction.Status.RELEASED,
            amount=Decimal('100.00'),
        )
        result = refund_escrow(self.job)
        self.assertIsNone(result)


class SplitEscrowTests(PaymentsTestBase):
    """SPLIT outcome — escrow REFUNDED, both shares queued as disbursements."""

    def _held_escrow(self, amount='100.00'):
        return EscrowTransaction.objects.create(
            booking_reference=self.job,
            status=EscrowTransaction.Status.HELD,
            amount=Decimal(amount),
            gateway_reference='SANDBOX-SPLIT',
        )

    def test_split_refunds_and_pays(self):
        """Client gets refund_amount, transporter gets the remainder."""
        escrow = self._held_escrow('100.00')
        split_escrow(self.job, refund_amount=Decimal('60.00'), reason='Damaged partial')

        escrow.refresh_from_db()
        self.assertEqual(escrow.status, EscrowTransaction.Status.REFUNDED)

        client_rr = RefundRequest.objects.get(
            job=self.job, beneficiary_type=RefundRequest.Beneficiary.CLIENT)
        transporter_rr = RefundRequest.objects.get(
            job=self.job, beneficiary_type=RefundRequest.Beneficiary.TRANSPORTER)

        self.assertEqual(client_rr.amount, Decimal('60.00'))
        self.assertEqual(transporter_rr.amount, Decimal('40.00'))
        # Transporter share is always a manual bank payout.
        self.assertFalse(transporter_rr.auto_executed)
        self.assertEqual(transporter_rr.beneficiary, self.transporter_user)

    def test_split_rejects_out_of_range(self):
        """refund_amount must be strictly between 0 and the escrow amount."""
        self._held_escrow('100.00')
        with self.assertRaises(ValueError):
            split_escrow(self.job, refund_amount=Decimal('100.00'))
        with self.assertRaises(ValueError):
            split_escrow(self.job, refund_amount=Decimal('0'))

    def test_split_no_escrow_raises(self):
        """No refundable escrow → ValueError."""
        with self.assertRaises(ValueError):
            split_escrow(self.job, refund_amount=Decimal('10.00'))


class AutoReleaseDisputeGuardTests(PaymentsTestBase):
    """
    L2 — the 48h auto-release must not pay the transporter after a dispute that
    was NOT resolved with an explicit RELEASE_TRANSPORTER outcome.
    """

    def setUp(self):
        super().setUp()
        self.job.status = TransportJob.Status.COMPLETED
        self.job.save()
        self.escrow = EscrowTransaction.objects.create(
            booking_reference=self.job,
            status=EscrowTransaction.Status.HELD,
            amount=Decimal('100.00'),
        )
        # Force the escrow older than the 48h window (bypass auto_now_add).
        EscrowTransaction.objects.filter(pk=self.escrow.pk).update(
            created_at=timezone.now() - timedelta(hours=72)
        )

    def _dispute(self, status_val, outcome=Dispute.ResolutionOutcome.NONE):
        return Dispute.objects.create(
            job=self.job,
            opened_by=self.client_user,
            reason='DAMAGED_ITEMS',
            description='Damaged during transport.',
            status=status_val,
            resolution_outcome=outcome,
        )

    def test_eligible_without_dispute(self):
        """No dispute → eligible for auto-release."""
        eligible = get_escrow_eligible_for_auto_release()
        self.assertIn(self.escrow, eligible)

    def test_active_dispute_blocks(self):
        """OPEN/INVESTIGATING dispute blocks (pre-existing rule)."""
        self._dispute('INVESTIGATING')
        self.assertNotIn(self.escrow, get_escrow_eligible_for_auto_release())

    def test_resolved_refund_client_blocks(self):
        """L2 — resolved pro-client (REFUND_CLIENT) blocks auto-release."""
        self._dispute('RESOLVED', Dispute.ResolutionOutcome.REFUND_CLIENT)
        self.assertNotIn(self.escrow, get_escrow_eligible_for_auto_release())

    def test_resolved_split_blocks(self):
        """L2 — resolved SPLIT blocks auto-release."""
        self._dispute('RESOLVED', Dispute.ResolutionOutcome.SPLIT)
        self.assertNotIn(self.escrow, get_escrow_eligible_for_auto_release())

    def test_resolved_note_only_blocks(self):
        """L2 — resolved with NONE (no explicit release) also blocks."""
        self._dispute('RESOLVED', Dispute.ResolutionOutcome.NONE)
        self.assertNotIn(self.escrow, get_escrow_eligible_for_auto_release())

    def test_resolved_release_transporter_allows(self):
        """L2 — explicit RELEASE_TRANSPORTER keeps the job auto-releasable."""
        self._dispute('RESOLVED', Dispute.ResolutionOutcome.RELEASE_TRANSPORTER)
        self.assertIn(self.escrow, get_escrow_eligible_for_auto_release())

    def test_rejected_dispute_allows(self):
        """A REJECTED dispute (claim dismissed) does not block the transporter."""
        self._dispute('REJECTED')
        self.assertIn(self.escrow, get_escrow_eligible_for_auto_release())


class ClientWalletSummaryTests(PaymentsTestBase):
    """
    C5.1 — figures d'argent du CLIENT.

    L'audit du plan annonçait « `wallet/` existe, absent de la navigation
    client ». C'était faux : `TransporterWalletView` porte
    `RequireRole('TRANSPORTER')` et répond 403 à un client. Ces tests couvrent
    l'endpoint qui manquait.
    """

    def _escrow(self, statut, montant, job=None):
        return EscrowTransaction.objects.create(
            booking_reference=job or self.job,
            status=statut,
            amount=Decimal(montant),
        )

    def test_separe_seques_tre_verse_et_rembourse(self):
        from payments.services import get_client_wallet_summary

        self._escrow(EscrowTransaction.Status.HELD, '100.00')
        self._escrow(EscrowTransaction.Status.RELEASED, '60.00')
        self._escrow(EscrowTransaction.Status.REFUNDED, '25.00')

        resume = get_client_wallet_summary(self.client_user)

        self.assertEqual(resume['held'], Decimal('100.00'))
        self.assertEqual(resume['released'], Decimal('60.00'))
        self.assertEqual(resume['refunded'], Decimal('25.00'))

    def test_ne_renvoie_pas_de_total_depense(self):
        """
        Additionner un escrow détenu, un escrow versé et une dette en espèces
        donnerait un chiffre qui ne correspond à aucune réalité comptable.
        L'absence de ce total est donc voulue, et ce test la verrouille.
        """
        from payments.services import get_client_wallet_summary

        resume = get_client_wallet_summary(self.client_user)
        self.assertNotIn('total', resume)
        self.assertNotIn('total_spent', resume)

    def test_ignore_l_argent_des_autres_clients(self):
        from payments.services import get_client_wallet_summary

        autre = User.objects.create_user(
            username='pay_client2', email='payclient2@test.tn',
            password='SecurePass123!', role='CLIENT',
        )
        job_autre = TransportJob.objects.create(
            owner=autre, status='PUBLISHED', job_type='TRANSPORT',
            pickup_address='Sfax', dropoff_address='Gabes',
            scheduled_time=timezone.now() + timedelta(days=1),
        )
        self._escrow(EscrowTransaction.Status.HELD, '999.00', job=job_autre)

        resume = get_client_wallet_summary(self.client_user)
        self.assertEqual(resume['held'], Decimal('0'))

    def test_compte_le_cod_non_encore_livre(self):
        """
        La plateforme n'a jamais tenu cet argent, mais le client le devra à la
        livraison. L'omettre lui laisserait croire qu'il ne doit rien.
        """
        from payments.services import get_client_wallet_summary

        Booking.objects.create(
            job=self.job, accepted_offer=self.offer,
            final_price=Decimal('100.00'), commission_rate=Decimal('0.2000'),
            payment_method=Booking.PaymentMethod.COD,
        )

        resume = get_client_wallet_summary(self.client_user)
        self.assertEqual(resume['cod_pending'], Decimal('100.00'))

    def test_le_cod_livre_ne_compte_plus(self):
        from payments.services import get_client_wallet_summary

        Booking.objects.create(
            job=self.job, accepted_offer=self.offer,
            final_price=Decimal('100.00'), commission_rate=Decimal('0.2000'),
            payment_method=Booking.PaymentMethod.COD,
        )
        self.job.status = TransportJob.Status.COMPLETED
        self.job.save(update_fields=['status'])

        resume = get_client_wallet_summary(self.client_user)
        self.assertEqual(resume['cod_pending'], Decimal('0'))


class ClientWalletEndpointTests(PaymentsTestBase):
    """
    Bornes d'accès de `/api/client/wallet/`.

    Le standard du projet veut que tout endpoint passe par
    `RequireRole.for_roles(...)`. Ces tests le vérifient pour de bon plutôt que
    de faire confiance à la déclaration.
    """

    def setUp(self):
        super().setUp()
        from rest_framework.test import APIClient
        self.api = APIClient()

    def test_un_client_lit_son_portefeuille(self):
        self.api.force_authenticate(user=self.client_user)
        reponse = self.api.get('/api/client/wallet/')
        self.assertEqual(reponse.status_code, 200, reponse.data)
        for cle in ('held', 'released', 'refunded', 'cod_pending', 'history'):
            self.assertIn(cle, reponse.data)

    def test_un_transporteur_est_refuse(self):
        self.api.force_authenticate(user=self.transporter_user)
        reponse = self.api.get('/api/client/wallet/')
        self.assertEqual(reponse.status_code, 403)

    def test_anonyme_refuse(self):
        self.assertEqual(self.api.get('/api/client/wallet/').status_code, 401)

    def test_expose_aussi_sur_la_surface_v1(self):
        """
        Double surface API : tout endpoint doit exister sous /api/ ET /api/v1/,
        sous peine de desynchroniser le mobile.
        """
        self.api.force_authenticate(user=self.client_user)
        self.assertEqual(self.api.get('/api/v1/client/wallet/').status_code, 200)
