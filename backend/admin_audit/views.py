"""
Admin Audit Trail Views — Transporti V1
Sprint 2 R8: API endpoint for viewing the audit log.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta

from users.permissions import RequireRole
from .models import AdminAuditLog


class AdminAuditLogView(APIView):
    """
    GET /api/admin/audit-log/
    Returns paginated audit log entries.
    Query params: ?action=USER_SUSPENDED&days=7&limit=50
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]

    def get(self, request):
        queryset = AdminAuditLog.objects.select_related('admin_user').all()

        # Filter by action type
        action_filter = request.query_params.get('action')
        if action_filter:
            queryset = queryset.filter(action=action_filter)

        # Filter by target type
        target_filter = request.query_params.get('target')
        if target_filter:
            queryset = queryset.filter(target_type=target_filter)

        # Filter by date range
        days = request.query_params.get('days')
        if days:
            try:
                days_int = int(days)
                queryset = queryset.filter(
                    created_at__gte=timezone.now() - timedelta(days=days_int)
                )
            except ValueError:
                pass

        # Limit results
        limit = min(int(request.query_params.get('limit', 100)), 500)
        entries = queryset[:limit]

        data = [
            {
                'id': entry.id,
                'adminName': (
                    f"{entry.admin_user.first_name} {entry.admin_user.last_name}".strip()
                    or entry.admin_user.email
                ) if entry.admin_user else 'Système',
                'adminEmail': entry.admin_user.email if entry.admin_user else '',
                'action': entry.action,
                'actionLabel': entry.get_action_display(),
                'targetType': entry.target_type,
                'targetId': entry.target_id,
                'targetLabel': entry.target_label,
                'details': entry.details,
                'ipAddress': entry.ip_address or '',
                'createdAt': entry.created_at.isoformat(),
            }
            for entry in entries
        ]

        # Stats summary
        total_count = AdminAuditLog.objects.count()
        today_count = AdminAuditLog.objects.filter(
            created_at__date=timezone.now().date()
        ).count()

        return Response({
            'entries': data,
            'totalCount': total_count,
            'todayCount': today_count,
            'availableActions': [
                {'value': c[0], 'label': c[1]}
                for c in AdminAuditLog.Action.choices
            ],
        })
