"""
Support Module Tests — Sprint D Fondamentaux
Model-level tests for Dispute lifecycle and AuditLog.
Strictly additive: fills the empty tests.py stub.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from support.models import Dispute, AuditLog
from support.services import resolve_dispute
from logistics.models import TransportJob, Offer
from payments.models import EscrowTransaction, RefundRequest

User = get_user_model()


class SupportTestBase(TestCase):
    """Shared setup for support tests."""

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='dispute_client',
            email='disputeclient@test.tn',
            password='SecurePass123!',
            role='CLIENT',
        )
        self.admin_user = User.objects.create_user(
            username='dispute_admin',
            email='disputeadmin@test.tn',
            password='SecurePass123!',
            role='ADMIN',
        )
        self.job = TransportJob.objects.create(
            owner=self.client_user,
            status='IN_PROGRESS',
            job_type='TRANSPORT',
            pickup_address='Tunis Centre',
            pickup_lat=Decimal('36.8065'),
            pickup_lng=Decimal('10.1815'),
            dropoff_address='Sousse Ville',
            dropoff_lat=Decimal('35.8256'),
            dropoff_lng=Decimal('10.6369'),
            scheduled_time=timezone.now() + timedelta(days=1),
        )

    def _create_dispute(self, status_val='OPEN'):
        return Dispute.objects.create(
            job=self.job,
            opened_by=self.client_user,
            reason='DAMAGED_ITEMS',
            description='Items were damaged during transport.',
            status=status_val,
        )


class DisputeLifecycleTests(SupportTestBase):
    """Tests for the Dispute state machine transitions."""

    def test_create_dispute_defaults_open(self):
        """New dispute defaults to OPEN status."""
        dispute = self._create_dispute()
        self.assertEqual(dispute.status, 'OPEN')
        self.assertTrue(dispute.is_active)
        self.assertFalse(dispute.is_terminal)
        self.assertIsNotNone(dispute.created_at)

    def test_open_to_investigating(self):
        """OPEN → INVESTIGATING is a valid transition."""
        dispute = self._create_dispute()
        dispute.start_investigation()
        dispute.refresh_from_db()
        self.assertEqual(dispute.status, 'INVESTIGATING')
        self.assertTrue(dispute.is_active)

    def test_investigating_to_resolved(self):
        """INVESTIGATING → RESOLVED is a valid transition."""
        dispute = self._create_dispute('INVESTIGATING')
        dispute.resolve(
            resolved_by=self.admin_user,
            resolution_notes='Issue resolved: refund processed.',
        )
        dispute.refresh_from_db()
        self.assertEqual(dispute.status, 'RESOLVED')
        self.assertFalse(dispute.is_active)
        self.assertTrue(dispute.is_terminal)
        self.assertIsNotNone(dispute.resolved_at)
        self.assertEqual(dispute.resolved_by, self.admin_user)

    def test_investigating_to_rejected(self):
        """INVESTIGATING → REJECTED is a valid transition."""
        dispute = self._create_dispute('INVESTIGATING')
        dispute.reject(
            resolved_by=self.admin_user,
            resolution_notes='Claim not substantiated.',
        )
        dispute.refresh_from_db()
        self.assertEqual(dispute.status, 'REJECTED')
        self.assertTrue(dispute.is_terminal)

    def test_full_lifecycle_open_to_resolved(self):
        """Full lifecycle: OPEN → INVESTIGATING → RESOLVED."""
        dispute = self._create_dispute()
        self.assertEqual(dispute.status, 'OPEN')

        dispute.start_investigation()
        dispute.refresh_from_db()
        self.assertEqual(dispute.status, 'INVESTIGATING')

        dispute.resolve(
            resolved_by=self.admin_user,
            resolution_notes='Resolved after investigation.',
        )
        dispute.refresh_from_db()
        self.assertEqual(dispute.status, 'RESOLVED')


class DisputeInvalidTransitionTests(SupportTestBase):
    """Tests for invalid state transitions (should raise ValidationError)."""

    def test_open_to_resolved_invalid(self):
        """OPEN → RESOLVED is NOT allowed (must go through INVESTIGATING)."""
        dispute = self._create_dispute()
        with self.assertRaises(ValidationError):
            dispute.transition_to('RESOLVED', resolved_by=self.admin_user, resolution_notes='Skip')

    def test_open_to_rejected_invalid(self):
        """OPEN → REJECTED is NOT allowed."""
        dispute = self._create_dispute()
        with self.assertRaises(ValidationError):
            dispute.transition_to('REJECTED', resolved_by=self.admin_user, resolution_notes='Skip')

    def test_resolved_to_anything_invalid(self):
        """RESOLVED is a terminal state — no further transitions allowed."""
        dispute = self._create_dispute('INVESTIGATING')
        dispute.resolve(
            resolved_by=self.admin_user,
            resolution_notes='Done.',
        )
        with self.assertRaises(ValidationError):
            dispute.transition_to('OPEN')

    def test_rejected_to_anything_invalid(self):
        """REJECTED is a terminal state — no further transitions allowed."""
        dispute = self._create_dispute('INVESTIGATING')
        dispute.reject(
            resolved_by=self.admin_user,
            resolution_notes='Rejected.',
        )
        with self.assertRaises(ValidationError):
            dispute.transition_to('INVESTIGATING')

    def test_resolve_requires_resolved_by(self):
        """Transitioning to RESOLVED without resolved_by raises ValidationError."""
        dispute = self._create_dispute('INVESTIGATING')
        with self.assertRaises(ValidationError):
            dispute.transition_to('RESOLVED', resolution_notes='Missing resolver')


class DisputeConstraintTests(SupportTestBase):
    """Tests for Dispute data constraints."""

    def test_duplicate_active_dispute_blocked(self):
        """Cannot have two active disputes on the same job (clean() + DB constraint)."""
        self._create_dispute()  # First dispute — OPEN
        dispute2 = Dispute(
            job=self.job,
            opened_by=self.client_user,
            reason='NO_SHOW',
            description='Driver did not show up.',
        )
        with self.assertRaises(ValidationError):
            dispute2.clean()

    def test_new_dispute_after_resolution(self):
        """Can create a new dispute after the previous one is resolved."""
        dispute1 = self._create_dispute()
        dispute1.start_investigation()
        dispute1.resolve(
            resolved_by=self.admin_user,
            resolution_notes='Resolved.',
        )
        # Now a new dispute should be allowed
        dispute2 = Dispute.objects.create(
            job=self.job,
            opened_by=self.client_user,
            reason='PAYMENT_ISSUE',
            description='Payment was not received.',
        )
        self.assertEqual(dispute2.status, 'OPEN')

    def test_dispute_str_includes_job_and_status(self):
        """Dispute __str__ includes job ID and status."""
        dispute = self._create_dispute()
        s = str(dispute)
        self.assertIn(str(self.job.id), s)
        self.assertIn('OPEN', s)


class AuditLogTests(SupportTestBase):
    """Tests for the AuditLog model."""

    def test_create_audit_log(self):
        """Can create an audit log entry."""
        log = AuditLog.objects.create(
            actor=self.admin_user,
            action='DISPUTE_RESOLVED',
            target_entity=f'Dispute #{self.job.id}',
            changes={'status': {'from': 'INVESTIGATING', 'to': 'RESOLVED'}},
            reason='Refund processed.',
        )
        self.assertEqual(log.action, 'DISPUTE_RESOLVED')
        self.assertIsNotNone(log.timestamp)

    def test_audit_log_str(self):
        """AuditLog __str__ includes actor and action."""
        log = AuditLog.objects.create(
            actor=self.admin_user,
            action='USER_BANNED',
            target_entity='User #123',
        )
        s = str(log)
        self.assertIn('USER_BANNED', s)


class ResolveDisputeOutcomeTests(SupportTestBase):
    """
    L1 — resolving a dispute with a structured financial outcome triggers the
    matching escrow movement in the same transaction.
    """

    def setUp(self):
        super().setUp()
        self.transporter = User.objects.create_user(
            username='dispute_transporter',
            email='disputetransporter@test.tn',
            password='SecurePass123!',
            role='TRANSPORTER',
        )
        self.offer = Offer.objects.create(
            job=self.job,
            transporter=self.transporter,
            status='ACCEPTED',
            price_net=Decimal('80.00'),
            commission_amount=Decimal('20.00'),
            total_price=Decimal('100.00'),
            valid_until=timezone.now() + timedelta(days=3),
        )
        self.escrow = EscrowTransaction.objects.create(
            booking_reference=self.job,
            status=EscrowTransaction.Status.HELD,
            amount=Decimal('100.00'),
            gateway_reference='SANDBOX-DISPUTE',
        )

    def _investigating_dispute(self):
        return Dispute.objects.create(
            job=self.job,
            opened_by=self.client_user,
            reason='DAMAGED_ITEMS',
            description='Items were damaged during transport.',
            status='INVESTIGATING',
        )

    def test_resolve_refund_client(self):
        """REFUND_CLIENT → escrow REFUNDED + client RefundRequest + outcome stored."""
        dispute = self._investigating_dispute()
        resolve_dispute(
            dispute, self.admin_user,
            resolution_notes='Marchandise endommagée, remboursement.',
            resolution_outcome=Dispute.ResolutionOutcome.REFUND_CLIENT,
        )
        self.escrow.refresh_from_db()
        dispute.refresh_from_db()
        self.assertEqual(self.escrow.status, EscrowTransaction.Status.REFUNDED)
        self.assertEqual(dispute.resolution_outcome, Dispute.ResolutionOutcome.REFUND_CLIENT)
        self.assertTrue(RefundRequest.objects.filter(job=self.job).exists())

    def test_resolve_release_transporter(self):
        """RELEASE_TRANSPORTER → escrow RELEASED, no refund."""
        dispute = self._investigating_dispute()
        resolve_dispute(
            dispute, self.admin_user,
            resolution_notes='Litige non fondé, versement transporteur.',
            resolution_outcome=Dispute.ResolutionOutcome.RELEASE_TRANSPORTER,
        )
        self.escrow.refresh_from_db()
        self.assertEqual(self.escrow.status, EscrowTransaction.Status.RELEASED)
        self.assertFalse(RefundRequest.objects.filter(job=self.job).exists())

    def test_resolve_split(self):
        """SPLIT → escrow REFUNDED + two RefundRequests (client + transporter)."""
        dispute = self._investigating_dispute()
        resolve_dispute(
            dispute, self.admin_user,
            resolution_notes='Responsabilité partagée, partage 50/50.',
            resolution_outcome=Dispute.ResolutionOutcome.SPLIT,
            refund_amount=Decimal('50.00'),
        )
        self.escrow.refresh_from_db()
        self.assertEqual(self.escrow.status, EscrowTransaction.Status.REFUNDED)
        self.assertEqual(RefundRequest.objects.filter(job=self.job).count(), 2)

    def test_resolve_split_requires_amount(self):
        """SPLIT without refund_amount → ValidationError, escrow untouched."""
        dispute = self._investigating_dispute()
        with self.assertRaises(ValidationError):
            resolve_dispute(
                dispute, self.admin_user,
                resolution_notes='Partage sans montant.',
                resolution_outcome=Dispute.ResolutionOutcome.SPLIT,
            )
        self.escrow.refresh_from_db()
        self.assertEqual(self.escrow.status, EscrowTransaction.Status.HELD)

    def test_resolve_note_only_leaves_escrow(self):
        """NONE (default) → note only, escrow untouched (historical behaviour)."""
        dispute = self._investigating_dispute()
        resolve_dispute(
            dispute, self.admin_user,
            resolution_notes='Résolu à l\'amiable, aucun mouvement.',
        )
        self.escrow.refresh_from_db()
        dispute.refresh_from_db()
        self.assertEqual(self.escrow.status, EscrowTransaction.Status.HELD)
        self.assertEqual(dispute.resolution_outcome, Dispute.ResolutionOutcome.NONE)
        self.assertFalse(RefundRequest.objects.filter(job=self.job).exists())

    def test_resolve_invalid_outcome(self):
        """An unknown outcome is rejected."""
        dispute = self._investigating_dispute()
        with self.assertRaises(ValidationError):
            resolve_dispute(
                dispute, self.admin_user,
                resolution_notes='Issue inconnue.',
                resolution_outcome='BOGUS',
            )
