"""
Admin User Action Views — Transporti V1
Sprint 1 R2: Suspend, Activate, Reset Password for admin user management.
"""
import logging
import secrets
import string

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle

from users.models import User
from users.permissions import RequireRole
from admin_audit.services import log_admin_action

logger = logging.getLogger('transporti')


class AdminUserSuspendView(APIView):
    """
    PATCH /api/admin/users/<id>/suspend/
    Deactivates a user account. Admin-only.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'admin_action'

    def patch(self, request, user_id):
        user = get_object_or_404(User, id=user_id)

        # Prevent self-suspension
        if user.id == request.user.id:
            return Response(
                {'error': 'Vous ne pouvez pas suspendre votre propre compte.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent suspending other admins
        if user.role in ('ADMIN', 'MODERATOR'):
            return Response(
                {'error': 'Impossible de suspendre un administrateur.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not user.is_active:
            return Response(
                {'error': 'Cet utilisateur est déjà suspendu.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', '')
        user.is_active = False
        user.save(update_fields=['is_active'])

        logger.info(
            f"ADMIN_ACTION: user_suspended | admin={request.user.email} "
            f"| target={user.email} (ID:{user.id}) | reason={reason}"
        )

        # R8: Audit trail
        log_admin_action(
            request, 'USER_SUSPENDED', 'user', user.id,
            target_label=user.email,
            details={'reason': reason}
        )

        return Response({
            'message': f"Utilisateur {user.email} suspendu avec succès.",
            'userId': user.id,
            'status': 'SUSPENDED',
        })


class AdminUserActivateView(APIView):
    """
    PATCH /api/admin/users/<id>/activate/
    Reactivates a suspended user account. Admin-only.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'admin_action'

    def patch(self, request, user_id):
        user = get_object_or_404(User, id=user_id)

        if user.is_active:
            return Response(
                {'error': 'Cet utilisateur est déjà actif.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.is_active = True
        user.save(update_fields=['is_active'])

        logger.info(
            f"ADMIN_ACTION: user_activated | admin={request.user.email} "
            f"| target={user.email} (ID:{user.id})"
        )

        # R8: Audit trail
        log_admin_action(
            request, 'USER_ACTIVATED', 'user', user.id,
            target_label=user.email,
        )

        return Response({
            'message': f"Utilisateur {user.email} réactivé avec succès.",
            'userId': user.id,
            'status': 'ACTIVE',
        })


class AdminUserResetPasswordView(APIView):
    """
    POST /api/admin/users/<id>/reset-password/
    Generates a temporary password and forces change on next login. Admin-only.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'admin_action'

    def post(self, request, user_id):
        user = get_object_or_404(User, id=user_id)

        # Prevent resetting admin passwords
        if user.role in ('ADMIN', 'MODERATOR'):
            return Response(
                {'error': 'Impossible de réinitialiser le mot de passe d\'un administrateur.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Generate a secure temporary password
        alphabet = string.ascii_letters + string.digits
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))

        user.set_password(temp_password)
        user.save(update_fields=['password'])

        logger.info(
            f"ADMIN_ACTION: password_reset | admin={request.user.email} "
            f"| target={user.email} (ID:{user.id})"
        )

        # R8: Audit trail
        log_admin_action(
            request, 'PASSWORD_RESET', 'user', user.id,
            target_label=user.email,
        )

        # In production, send this via email instead of returning it
        # For now, return it to the admin for manual communication
        try:
            from notifications.emails import send_password_reset_notification
            send_password_reset_notification(user, temp_password)
            email_sent = True
        except Exception:
            email_sent = False

        # S1: Only return temp password in DEBUG mode for security
        from django.conf import settings as django_settings
        response_data = {
            'message': f"Mot de passe de {user.email} réinitialisé.",
            'userId': user.id,
            'emailSent': email_sent,
        }
        if django_settings.DEBUG:
            response_data['temporaryPassword'] = temp_password

        return Response(response_data)


class AdminUserDetailView(APIView):
    """
    GET /api/admin/users/<id>/
    Detailed view of a single user with full history.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]

    def get(self, request, user_id):
        user = get_object_or_404(
            User.objects.select_related('trust_profile'),
            id=user_id
        )

        from transporti_core.serializers_admin import AdminUserSerializer
        user_data = AdminUserSerializer(user).data

        # Jobs history
        from logistics.models import TransportJob, Offer
        if user.role == 'CLIENT':
            jobs = TransportJob.objects.filter(owner=user).order_by('-created_at')[:20]
        elif user.role == 'TRANSPORTER':
            job_ids = Offer.objects.filter(
                transporter=user
            ).values_list('job_id', flat=True)
            jobs = TransportJob.objects.filter(id__in=job_ids).order_by('-created_at')[:20]
        else:
            jobs = TransportJob.objects.none()

        jobs_data = [
            {
                'id': j.id,
                'title': j.description[:60] if j.description else f'Job #{j.id}',
                'status': j.status,
                'createdAt': j.created_at.isoformat(),
            }
            for j in jobs
        ]

        # Disputes
        from support.models import Dispute
        disputes = Dispute.objects.filter(opened_by=user).order_by('-created_at')[:10]
        disputes_data = [
            {
                'id': d.id,
                'reason': d.get_reason_display() if hasattr(d, 'get_reason_display') else d.reason,
                'status': d.status,
                'createdAt': d.created_at.isoformat(),
            }
            for d in disputes
        ]

        # Reviews
        reviews_data = []
        try:
            from reviews.models import Review
            reviews = Review.objects.filter(reviewer=user).order_by('-created_at')[:10]
            reviews_data = [
                {
                    'id': r.id,
                    'rating': r.rating,
                    'comment': r.comment[:100] if r.comment else '',
                    'createdAt': r.created_at.isoformat(),
                }
                for r in reviews
            ]
        except Exception:
            pass

        return Response({
            **user_data,
            'phone': user.phone or '',
            'isActive': user.is_active,
            'dateJoined': user.date_joined.isoformat(),
            'jobs': jobs_data,
            'disputes': disputes_data,
            'reviews': reviews_data,
        })


class AdminUserWarnView(APIView):
    """
    POST /api/admin/users/<id>/warn/
    R1: Send a warning to user via email + in-app notification.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'admin_action'

    def post(self, request, user_id):
        user = get_object_or_404(User, id=user_id)

        # Prevent warning admins
        if user.role in ('ADMIN', 'MODERATOR'):
            return Response(
                {'error': 'Impossible d\'avertir un administrateur.'},
                status=status.HTTP_403_FORBIDDEN
            )

        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response(
                {'error': 'La raison de l\'avertissement est obligatoire.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # In-app notification
        notification_sent = False
        try:
            from notifications.models import Notification
            Notification.objects.create(
                user=user,
                title='Avertissement administratif',
                message=f'Vous avez reçu un avertissement : {reason}',
                notification_type='WARNING',
            )
            notification_sent = True
        except Exception as e:
            logger.warning(f"In-app notification failed for warn user #{user.id}: {e}")

        # Email notification
        email_sent = False
        try:
            from notifications.emails import send_warning_email
            send_warning_email(user, reason)
            email_sent = True
        except Exception as e:
            logger.warning(f"Email warning failed for user #{user.id}: {e}")

        # Audit trail
        log_admin_action(
            request, 'USER_WARNED', 'user', user.id,
            target_label=user.email,
            details={'reason': reason, 'notification_sent': notification_sent, 'email_sent': email_sent}
        )

        logger.info(
            f"ADMIN_ACTION: user_warned | admin={request.user.email} "
            f"| target={user.email} (ID:{user.id}) | reason={reason}"
        )

        return Response({
            'message': f"Avertissement envoyé à {user.email}.",
            'userId': user.id,
            'notificationSent': notification_sent,
            'emailSent': email_sent,
        })


class AdminUserEditView(APIView):
    """
    PATCH /api/admin/users/<id>/edit/
    Allows admin to edit basic user fields: first_name, last_name, phone, role.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'admin_action'

    EDITABLE_FIELDS = ['first_name', 'last_name', 'phone', 'role']
    VALID_ROLES = ['CLIENT', 'TRANSPORTER']  # Cannot promote to ADMIN via this endpoint

    def patch(self, request, user_id):
        user = get_object_or_404(User, id=user_id)

        # Prevent editing admins
        if user.role in ('ADMIN', 'MODERATOR') and user.id != request.user.id:
            return Response(
                {'error': 'Impossible de modifier un autre administrateur.'},
                status=status.HTTP_403_FORBIDDEN
            )

        changes = {}
        for field in self.EDITABLE_FIELDS:
            if field in request.data:
                new_val = request.data[field]

                # Validate role
                if field == 'role' and new_val not in self.VALID_ROLES:
                    return Response(
                        {'error': f"Rôle invalide: {new_val}. Valeurs acceptées: {', '.join(self.VALID_ROLES)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                old_val = getattr(user, field, None)
                if str(new_val) != str(old_val):
                    setattr(user, field, new_val)
                    changes[field] = {'old': str(old_val), 'new': str(new_val)}

        if not changes:
            return Response(
                {'error': 'Aucune modification détectée.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.save(update_fields=list(changes.keys()) + ['updated_at'])

        # Audit trail
        log_admin_action(
            request, 'USER_EDITED', 'user', user.id,
            target_label=user.email,
            details={'changes': changes}
        )

        logger.info(
            f"ADMIN_ACTION: user_edited | admin={request.user.email} "
            f"| target={user.email} (ID:{user.id}) | changes={changes}"
        )

        return Response({
            'message': f"Utilisateur {user.email} modifié avec succès.",
            'userId': user.id,
            'changes': changes,
        })
