"""
Admin API Views — Transporti V1
Sprint 2: Aggregation endpoints for admin dashboard.
All views require ADMIN role.
"""
import logging
from django.db.models import Sum, Avg, Count, Q, Prefetch
from django.utils import timezone
from datetime import timedelta
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from users.models import User
from users.permissions import RequireRole
from logistics.models import TransportJob, Offer
from payments.models import EscrowTransaction, CommissionLedger
from support.models import Dispute, AuditLog
from trust.models import TrustProfile
from .serializers_admin import AdminJobSerializer, AdminUserSerializer

logger = logging.getLogger('transporti')


class AdminStatsView(APIView):
    """
    GET /api/admin/stats/
    Dashboard KPIs aggregated from real data.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]

    def get(self, request):
        # Users
        total_users = User.objects.exclude(role__in=['ADMIN', 'MODERATOR']).count()
        active_users = User.objects.exclude(role__in=['ADMIN', 'MODERATOR']).filter(
            is_active=True
        ).count()
        total_transporters = User.objects.filter(role='TRANSPORTER').count()

        # Verified transporters
        verified_transporters = TrustProfile.objects.filter(
            verification_status='VERIFIED',
            user__role='TRANSPORTER'
        ).count()

        # Jobs
        active_statuses = ['PUBLISHED', 'MATCHED', 'IN_PROGRESS']
        active_jobs = TransportJob.objects.filter(status__in=active_statuses).count()
        completed_jobs = TransportJob.objects.filter(status='COMPLETED').count()
        pending_jobs = TransportJob.objects.filter(status='DRAFT').count()
        cancelled_jobs = TransportJob.objects.filter(status='CANCELLED').count()

        # Escrow
        escrow_agg = EscrowTransaction.objects.aggregate(
            total=Sum('amount'),
            pending=Sum('amount', filter=Q(status='HELD')),
            blocked=Sum('amount', filter=Q(status='FAILED')),
            released=Sum('amount', filter=Q(status='RELEASED')),
        )
        total_escrow = float(escrow_agg['total'] or 0)
        pending_escrow = float(escrow_agg['pending'] or 0)
        blocked_escrow = float(escrow_agg['blocked'] or 0)
        released_escrow = float(escrow_agg['released'] or 0)

        # Revenue (10% commission on released)
        platform_revenue = released_escrow * 0.10

        # Disputes
        active_disputes = Dispute.objects.filter(
            status__in=Dispute.ACTIVE_STATUSES
        ).count()

        # Trust
        avg_trust = TrustProfile.objects.aggregate(
            avg=Avg('trust_score')
        )['avg'] or 0

        return Response({
            'totalUsers': total_users,
            'activeUsers': active_users,
            'totalTransporters': total_transporters,
            'verifiedTransporters': verified_transporters,
            'activeJobs': active_jobs,
            'completedJobs': completed_jobs,
            'pendingJobs': pending_jobs,
            'cancelledJobs': cancelled_jobs,
            'totalEscrow': total_escrow,
            'pendingEscrow': pending_escrow,
            'blockedEscrow': blocked_escrow,
            'releasedEscrow': released_escrow,
            'platformRevenue': round(platform_revenue, 2),
            'activeDisputes': active_disputes,
            'avgTrustScore': round(float(avg_trust)),
        })


class AdminJobCancelView(APIView):
    """
    POST /api/admin/jobs/<id>/cancel/
    Admin cancels a job with mandatory reason.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]

    def post(self, request, pk):
        from rest_framework import status as drf_status
        job = TransportJob.objects.filter(pk=pk).first()
        if not job:
            return Response({'error': 'Job introuvable.'}, status=drf_status.HTTP_404_NOT_FOUND)

        if job.status == 'CANCELLED':
            return Response({'error': 'Ce job est déjà annulé.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        if job.status == 'COMPLETED':
            return Response({'error': 'Impossible d\'annuler un job terminé.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'error': 'La raison est obligatoire.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        old_status = job.status
        job.status = 'CANCELLED'
        job.save(update_fields=['status', 'updated_at'])

        # Audit trail
        try:
            from admin_audit.services import log_admin_action
            log_admin_action(
                request, 'JOB_CANCELLED', 'job', job.id,
                target_label=f'Job #{job.id} annulé ({old_status} → CANCELLED)',
                details={'reason': reason, 'old_status': old_status},
            )
        except Exception:
            pass

        return Response({
            'message': f'Job #{job.id} annulé avec succès.',
            'status': 'CANCELLED',
        })


class AdminJobForceStatusView(APIView):
    """
    PATCH /api/admin/jobs/<id>/status/
    Admin forces a status change with mandatory reason.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]

    ALLOWED_TRANSITIONS = {
        'DRAFT', 'PUBLISHED', 'MATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED',
    }

    def patch(self, request, pk):
        from rest_framework import status as drf_status
        job = TransportJob.objects.filter(pk=pk).first()
        if not job:
            return Response({'error': 'Job introuvable.'}, status=drf_status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status', '').strip().upper()
        reason = request.data.get('reason', '').strip()

        if not new_status or new_status not in self.ALLOWED_TRANSITIONS:
            return Response(
                {'error': f'Statut invalide. Valeurs autorisées: {", ".join(sorted(self.ALLOWED_TRANSITIONS))}'},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        if not reason:
            return Response({'error': 'La raison est obligatoire.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        if job.status == new_status:
            return Response({'error': f'Le job est déjà en statut {new_status}.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        old_status = job.status
        job.status = new_status
        job.save(update_fields=['status', 'updated_at'])

        # Audit trail
        try:
            from admin_audit.services import log_admin_action
            log_admin_action(
                request, 'JOB_STATUS_FORCED', 'job', job.id,
                target_label=f'Job #{job.id} : {old_status} → {new_status}',
                details={'reason': reason, 'old_status': old_status, 'new_status': new_status},
            )
        except Exception:
            pass

        return Response({
            'message': f'Job #{job.id} mis à jour : {old_status} → {new_status}.',
            'status': new_status,
        })


class AdminJobListView(generics.ListAPIView):
    """
    GET /api/admin/jobs/
    All jobs with client/transporter details.
    Prefetches offers to eliminate N+1 queries.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]
    serializer_class = AdminJobSerializer

    def get_queryset(self):
        return TransportJob.objects.select_related('owner').prefetch_related(
            Prefetch(
                'offers',
                queryset=Offer.objects.select_related('transporter')
            )
        ).order_by('-created_at')


class AdminJobDetailView(APIView):
    """
    GET /api/admin/jobs/<id>/
    Detailed view of a single job for admin panel.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]

    def get(self, request, pk):
        from logistics.serializers import TransportJobDetailSerializer, OfferDetailSerializer

        job = TransportJob.objects.select_related('owner').prefetch_related(
            Prefetch('offers', queryset=Offer.objects.select_related('transporter').order_by('-created_at'))
        ).filter(pk=pk).first()

        if not job:
            return Response({'error': 'Job not found'}, status=404)

        # Base job data
        job_data = AdminJobSerializer(job).data

        # All offers
        offers = [
            {
                'id': o.id,
                'transporter': f"{o.transporter.first_name} {o.transporter.last_name}".strip() or o.transporter.email,
                'transporterEmail': o.transporter.email,
                'totalPrice': float(o.total_price),
                'priceNet': float(o.price_net) if o.price_net else None,
                'commission': float(o.commission_amount) if o.commission_amount else None,
                'status': o.status,
                'message': o.message or '',
                'createdAt': o.created_at.isoformat(),
            }
            for o in job.offers.all()
        ]

        # Escrow info
        escrow_data = None
        try:
            from payments.models import EscrowTransaction
            escrow = EscrowTransaction.objects.filter(booking_reference=job).first()
            if escrow:
                escrow_data = {
                    'id': escrow.id,
                    'amount': float(escrow.amount),
                    'status': escrow.status,
                    'createdAt': escrow.created_at.isoformat(),
                }
        except Exception:
            pass

        # Conversation info
        conversation_data = None
        try:
            from messaging.models import Conversation, Message
            conv = Conversation.objects.filter(job=job).first()
            if conv:
                msg_count = Message.objects.filter(conversation=conv).count()
                conversation_data = {
                    'id': conv.id,
                    'isLocked': conv.is_locked,
                    'messageCount': msg_count,
                }
        except Exception:
            pass

        # Disputes
        disputes_data = []
        try:
            for d in Dispute.objects.filter(job=job).order_by('-created_at'):
                disputes_data.append({
                    'id': d.id,
                    'reason': d.get_reason_display() if hasattr(d, 'get_reason_display') else d.reason,
                    'status': d.status,
                    'openedBy': d.opened_by.email,
                    'createdAt': d.created_at.isoformat(),
                })
        except Exception:
            pass

        return Response({
            **job_data,
            'offers': offers,
            'escrow': escrow_data,
            'conversation': conversation_data,
            'disputes': disputes_data,
        })


class AdminUserListView(APIView):
    """
    GET /api/admin/users/
    All non-admin users with trust/activity info.
    Supports: ?page=1&page_size=20&role=CLIENT&search=ahmed
    Sprint 3 R7: Server-side pagination + R6: search/filter.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]

    def get(self, request):
        queryset = User.objects.exclude(
            role__in=['ADMIN', 'MODERATOR']
        ).select_related('trust_profile').order_by('-date_joined')

        # Filter by role
        role = request.query_params.get('role')
        if role and role in ('CLIENT', 'TRANSPORTER'):
            queryset = queryset.filter(role=role)

        # Search by name, email, or ID
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(id__icontains=search) if search.isdigit() else
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )

        total_count = queryset.count()

        # Pagination
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = min(100, max(1, int(request.query_params.get('page_size', 50))))
        start = (page - 1) * page_size
        end = start + page_size

        users = queryset[start:end]
        serializer = AdminUserSerializer(users, many=True)

        import math
        return Response({
            'results': serializer.data,
            'count': total_count,
            'page': page,
            'pageSize': page_size,
            'totalPages': math.ceil(total_count / page_size) if total_count > 0 else 1,
        })


class AdminActivityView(APIView):
    """
    GET /api/admin/activity/
    Recent platform activity from AuditLog + computed events.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]

    def get(self, request):
        activities = []
        now = timezone.now()

        # Recent jobs created (last 7 days)
        recent_jobs = TransportJob.objects.filter(
            created_at__gte=now - timedelta(days=7)
        ).select_related('owner').order_by('-created_at')[:10]

        for job in recent_jobs:
            owner_name = f"{job.owner.first_name} {job.owner.last_name}".strip() or job.owner.email
            activities.append({
                'id': f"job_{job.id}",
                'type': 'JOB_CREATED',
                'message': f"Nouveau job créé: {job.description[:40] if job.description else f'Job #{job.id}'}",
                'userId': job.owner.id,
                'userName': owner_name,
                'timestamp': job.created_at.isoformat(),
                'severity': 'INFO',
            })

        # Recent disputes
        recent_disputes = Dispute.objects.filter(
            created_at__gte=now - timedelta(days=14)
        ).select_related('opened_by').order_by('-created_at')[:5]

        for dispute in recent_disputes:
            user_name = f"{dispute.opened_by.first_name} {dispute.opened_by.last_name}".strip()
            activities.append({
                'id': f"dispute_{dispute.id}",
                'type': 'DISPUTE_OPENED',
                'message': f"Litige ouvert sur job #{dispute.job_id}: {dispute.get_reason_display()}",
                'userId': dispute.opened_by.id,
                'userName': user_name or dispute.opened_by.email,
                'timestamp': dispute.created_at.isoformat(),
                'severity': 'WARNING',
            })

        # Recent completed jobs
        completed = TransportJob.objects.filter(
            status='COMPLETED',
            updated_at__gte=now - timedelta(days=7)
        ).select_related('owner').order_by('-updated_at')[:5]

        for job in completed:
            activities.append({
                'id': f"completed_{job.id}",
                'type': 'JOB_COMPLETED',
                'message': f"Job terminé: #{job.id}",
                'userId': job.owner.id,
                'userName': f"{job.owner.first_name} {job.owner.last_name}".strip() or job.owner.email,
                'timestamp': job.updated_at.isoformat(),
                'severity': 'INFO',
            })

        # Recent user registrations
        new_users = User.objects.filter(
            date_joined__gte=now - timedelta(days=7)
        ).exclude(role__in=['ADMIN', 'MODERATOR']).order_by('-date_joined')[:5]

        for user in new_users:
            activities.append({
                'id': f"user_{user.id}",
                'type': 'USER_REGISTERED',
                'message': f"Nouvel utilisateur inscrit ({user.get_role_display()})",
                'userId': user.id,
                'userName': f"{user.first_name} {user.last_name}".strip() or user.email,
                'timestamp': user.date_joined.isoformat(),
                'severity': 'INFO',
            })

        # Sort all by timestamp descending
        activities.sort(key=lambda x: x['timestamp'], reverse=True)

        return Response(activities[:20])


class AdminAlertsView(APIView):
    """
    GET /api/admin/alerts/
    Dynamically computed system alerts.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]

    def get(self, request):
        alerts = []
        alert_id = 1

        # Stuck escrows (HELD for > 7 days)
        stuck_escrows = EscrowTransaction.objects.filter(
            status='HELD',
            created_at__lt=timezone.now() - timedelta(days=7)
        )
        for escrow in stuck_escrows:
            alerts.append({
                'id': alert_id,
                'type': 'STUCK_ESCROW',
                'title': f"Escrow bloqué depuis {(timezone.now() - escrow.created_at).days} jours",
                'description': f"Job #{escrow.booking_reference_id} - {float(escrow.amount)} TND en attente",
                'severity': 'HIGH',
                'createdAt': escrow.created_at.isoformat(),
                'isRead': False,
            })
            alert_id += 1

        # Active disputes older than 3 days
        old_disputes = Dispute.objects.filter(
            status__in=Dispute.ACTIVE_STATUSES,
            created_at__lt=timezone.now() - timedelta(days=3)
        )
        if old_disputes.count() > 0:
            alerts.append({
                'id': alert_id,
                'type': 'HIGH_DISPUTE_RATE',
                'title': f"{old_disputes.count()} litige(s) non résolu(s) depuis + de 3 jours",
                'description': f"IDs: {', '.join(str(d.id) for d in old_disputes[:5])}",
                'severity': 'MEDIUM',
                'createdAt': timezone.now().isoformat(),
                'isRead': False,
            })
            alert_id += 1

        # Low trust users (TRANSPORTER with score < 40)
        low_trust = TrustProfile.objects.filter(
            trust_score__lt=40,
            user__role='TRANSPORTER',
            user__is_active=True
        ).select_related('user')
        for tp in low_trust:
            alerts.append({
                'id': alert_id,
                'type': 'LOW_TRUST_USER',
                'title': f"Transporteur à risque",
                'description': f"{tp.user.first_name} {tp.user.last_name} - Score: {tp.trust_score}/100",
                'severity': 'MEDIUM',
                'createdAt': tp.updated_at.isoformat() if hasattr(tp, 'updated_at') else timezone.now().isoformat(),
                'isRead': True,
            })
            alert_id += 1

        # Pending verifications
        pending_verifs = TrustProfile.objects.filter(
            verification_status='PENDING'
        ).count()
        if pending_verifs > 0:
            alerts.append({
                'id': alert_id,
                'type': 'SYSTEM_WARNING',
                'title': f"{pending_verifs} vérification(s) en attente",
                'description': "Des transporteurs attendent la validation de leurs documents",
                'severity': 'LOW',
                'createdAt': timezone.now().isoformat(),
                'isRead': False,
            })
            alert_id += 1

        return Response(alerts)
