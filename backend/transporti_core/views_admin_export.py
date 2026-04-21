"""
Admin Export Views — Transporti V1
Sprint 3 R6: CSV export for users and jobs.
"""
import csv
from io import StringIO

from django.http import HttpResponse
from django.db.models import Q
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from users.models import User
from users.permissions import RequireRole
from logistics.models import TransportJob, Offer

import jwt


class QueryTokenAuthentication(BaseAuthentication):
    """Allow token via ?token= query parameter for file downloads."""
    def authenticate(self, request):
        token = request.query_params.get('token')
        if not token:
            return None
        try:
            jwt_auth = JWTAuthentication()
            validated = jwt_auth.get_validated_token(token)
            user = jwt_auth.get_user(validated)
            return (user, validated)
        except Exception:
            raise AuthenticationFailed('Invalid or expired token.')


class AdminExportUsersCSV(APIView):
    """
    GET /api/admin/users/export/
    Export users list as CSV file.
    Supports same filters as list: ?role=CLIENT&search=ahmed
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]
    authentication_classes = [JWTAuthentication, QueryTokenAuthentication]

    def get(self, request):
        queryset = User.objects.exclude(
            role__in=['ADMIN', 'MODERATOR']
        ).select_related('trust_profile').order_by('-date_joined')

        # Apply filters
        role = request.query_params.get('role')
        if role and role in ('CLIENT', 'TRANSPORTER'):
            queryset = queryset.filter(role=role)

        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )

        # Build CSV
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="transporti_users.csv"'
        response.write('\ufeff')  # UTF-8 BOM for Excel compatibility

        writer = csv.writer(response, delimiter=';')
        writer.writerow([
            'ID', 'Nom', 'Prénom', 'Email', 'Téléphone',
            'Rôle', 'Statut', 'Score Confiance',
            'Date Inscription', 'Dernière Activité',
        ])

        for user in queryset:
            status = 'Actif' if user.is_active else 'Suspendu'
            trust_score = 50
            try:
                trust_score = user.trust_profile.trust_score
            except Exception:
                pass

            writer.writerow([
                user.id,
                user.last_name or '',
                user.first_name or '',
                user.email,
                user.phone or '',
                user.get_role_display(),
                status,
                trust_score,
                user.date_joined.strftime('%d/%m/%Y %H:%M'),
                user.last_seen_at.strftime('%d/%m/%Y %H:%M') if user.last_seen_at else '-',
            ])

        # Audit trail
        try:
            from admin_audit.services import log_admin_action
            log_admin_action(
                request, 'USER_SUSPENDED', 'export', 0,
                target_label=f'Export CSV utilisateurs ({queryset.count()} lignes)',
            )
        except Exception:
            pass

        return response


class AdminExportJobsCSV(APIView):
    """
    GET /api/admin/jobs/export/
    Export jobs list as CSV file.
    Supports: ?status=PUBLISHED
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]
    authentication_classes = [JWTAuthentication, QueryTokenAuthentication]

    def get(self, request):
        queryset = TransportJob.objects.select_related('owner').order_by('-created_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="transporti_jobs.csv"'
        response.write('\ufeff')

        writer = csv.writer(response, delimiter=';')
        writer.writerow([
            'ID', 'Type', 'Statut', 'Client', 'Email Client',
            'Départ', 'Arrivée', 'Prix Min', 'Prix Max',
            'Transporteur', 'Date Création',
        ])

        for job in queryset:
            # Find accepted offer transporter
            transporter_name = ''
            accepted = Offer.objects.filter(job=job, status='ACCEPTED').select_related('transporter').first()
            if accepted:
                t = accepted.transporter
                transporter_name = f"{t.first_name} {t.last_name}".strip() or t.email

            writer.writerow([
                job.id,
                job.get_job_type_display(),
                job.get_status_display(),
                f"{job.owner.first_name} {job.owner.last_name}".strip() or job.owner.email,
                job.owner.email,
                job.pickup_address or '',
                job.dropoff_address or '',
                float(job.price_tnd_min) if job.price_tnd_min else '',
                float(job.price_tnd_max) if job.price_tnd_max else '',
                transporter_name,
                job.created_at.strftime('%d/%m/%Y %H:%M'),
            ])

        return response
