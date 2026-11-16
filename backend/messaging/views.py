"""
Messaging Views - Transporti V1
Job-bound messaging endpoints with participant validation.
"""
import logging
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError, PermissionDenied
from rest_framework.exceptions import NotFound

from .models import Conversation, Message
from .serializers import MessageSerializer, MessageCreateSerializer, ConversationSerializer, ConversationListSerializer
from .services import (
    send_message, get_conversation_messages, 
    get_or_create_conversation, mark_messages_as_read,
    _is_job_participant, _is_moderator,
)
from logistics.models import TransportJob
from logistics.participants import get_job_client, get_job_transporter
from transporti_core.throttling import MessageRateThrottle

logger = logging.getLogger('transporti')

# Même réponse pour « mission inexistante » et « mission d'un autre » : un
# tiers ne doit pas pouvoir sonder quelles missions existent.
JOB_NOT_FOUND = 'Mission introuvable.'


def _load_job(job_id) -> TransportJob:
    job = TransportJob.objects.filter(id=job_id).first()
    if job is None:
        raise NotFound(JOB_NOT_FOUND)
    return job


def _deny(user, job_id, event: str):
    """Tiers (ni participant actuel, ni modérateur) : 404 neutre."""
    logger.warning(f"{event}: user={user.id}, job={job_id}")
    raise NotFound(JOB_NOT_FOUND)


def _current_participant_filter(user):
    """
    Conversations dont `user` est un participant ACTUEL de la mission
    (même règle que logistics/participants.is_job_participant, en SQL) :
    - propriétaire de la mission (client du canal classique, transporteur
      d'un trajet retour) ;
    - transporteur de l'offre ACCEPTED ;
    - client de la demande ACCEPTED d'un trajet retour.
    Exists plutôt que des jointures, pour ne pas fausser les Count().
    """
    from django.db.models import Exists, OuterRef, Q
    from logistics.models import Offer, ReturnTripRequest

    accepted_offer = Offer.objects.filter(
        job=OuterRef('job'), status='ACCEPTED', transporter=user)
    accepted_request = ReturnTripRequest.objects.filter(
        job=OuterRef('job'), status='ACCEPTED', client=user)
    return (
        Q(job__owner=user)
        | Q(Exists(accepted_offer))
        | (Q(job__is_return_trip=True) & Q(Exists(accepted_request)))
    )


class UserConversationsView(generics.ListAPIView):
    """
    GET /api/conversations/ - List all conversations the current user participates in.
    Returns conversations ordered by most recent activity.
    Optimized: uses Subquery to avoid N+1 queries on last_message, message_count, unread_count.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationListSerializer

    def get_queryset(self):
        from django.db.models import OuterRef, Subquery, Count, Q, IntegerField, TextField, DateTimeField
        from django.db.models.functions import Coalesce

        # Subquery for last message fields
        last_msg_qs = Message.objects.filter(
            conversation=OuterRef('pk')
        ).order_by('-created_at')

        return (
            Conversation.objects
            # Participation ACTUELLE, pas la liste stockée (périmée après une
            # annulation).
            .filter(_current_participant_filter(self.request.user))
            .select_related('job')
            .prefetch_related('participants')
            .annotate(
                # N+1 Fix #17: last_message fields via Subquery
                _last_message_id=Subquery(
                    last_msg_qs.values('id')[:1],
                    output_field=IntegerField()
                ),
                _last_message_content=Subquery(
                    last_msg_qs.values('content')[:1],
                    output_field=TextField()
                ),
                _last_message_sender_name=Subquery(
                    last_msg_qs.values('sender__first_name')[:1],
                    output_field=TextField()
                ),
                _last_message_is_system=Subquery(
                    last_msg_qs.values('is_system')[:1],
                ),
                _last_message_is_read=Subquery(
                    last_msg_qs.values('is_read')[:1],
                ),
                _last_message_created_at=Subquery(
                    last_msg_qs.values('created_at')[:1],
                    output_field=DateTimeField()
                ),
                _last_message_sender_id=Subquery(
                    last_msg_qs.values('sender_id')[:1],
                    output_field=IntegerField()
                ),
                # N+1 Fix #18: message_count via annotation
                _message_count=Count('messages'),
                # N+1 Fix #3: unread_count via annotation
                _unread_count=Count(
                    'messages',
                    filter=Q(
                        messages__is_read=False
                    ) & ~Q(
                        messages__sender=self.request.user
                    )
                ),
            )
            .order_by('-updated_at')
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class JobMessagesView(generics.GenericAPIView):
    """
    GET  /api/jobs/{job_id}/messages/ - List messages
    POST /api/jobs/{job_id}/messages/ - Send a message
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [MessageRateThrottle]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MessageCreateSerializer
        return MessageSerializer
    
    def get(self, request, job_id):
        """Get messages for a job conversation."""
        job = _load_job(job_id)
        user = request.user
        is_participant = _is_job_participant(user, job)
        if not is_participant and not _is_moderator(user):
            _deny(user, job_id, 'MESSAGES_ACCESS_DENIED')

        conversation = Conversation.objects.filter(job=job).first()
        if conversation is None:
            # Seul un participant actuel peut créer la conversation ;
            # un modérateur ne fait que lire.
            if not is_participant:
                return Response(
                    {'error': 'Aucune conversation trouvée pour cette mission.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            conversation = get_or_create_conversation(job)

        try:
            messages = get_conversation_messages(user=user, job=job, limit=100)
        except PermissionDenied:
            _deny(user, job_id, 'MESSAGES_ACCESS_DENIED')

        # 5.3 : `limit=100` est une troncature dure, pas une pagination —
        # sans le total réel, le mobile ne peut pas savoir qu'il en manque.
        total_count = conversation.messages.count()

        # Lu/non lu : seul un participant marque comme lu. Un modérateur
        # qui consulte ne doit rien changer (ni recevoir 403).
        if is_participant:
            mark_messages_as_read(user, job)

        conv_data = ConversationSerializer(conversation).data

        # Build job info for the chat header
        job_info = {
            'id': job.id,
            'pickup_address': job.pickup_address,
            'dropoff_address': job.dropoff_address,
            'status': job.status,
            'job_type': job.job_type,
        }

        return Response({
            'conversation': conv_data,
            'messages': MessageSerializer(messages, many=True).data,
            'count': len(messages),
            'total_count': total_count,
            'job': job_info,
            'other_party': _other_party(user, job) if is_participant else None,
        })

    def post(self, request, job_id):
        """Send a message in a job conversation."""
        job = _load_job(job_id)
        if not _is_job_participant(request.user, job):
            if _is_moderator(request.user):
                # Le modérateur connaît la mission : refus explicite.
                return Response(
                    {'error': 'Les modérateurs lisent la conversation sans y écrire.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            _deny(request.user, job_id, 'MESSAGE_SEND_DENIED')

        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        content = serializer.validated_data['content']
        
        try:
            message = send_message(
                user=request.user,
                job=job,
                content=content,
                is_system=False
            )
            
            return Response({
                'message': 'Message sent.',
                'data': MessageSerializer(message).data
            }, status=status.HTTP_201_CREATED)
        
        except PermissionDenied:
            _deny(request.user, job_id, 'MESSAGE_SEND_DENIED')
        
        except ValidationError as e:
            logger.warning(f"MESSAGE_SEND_FAILED: user={request.user.id}, job={job_id}, error={str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class JobConversationView(generics.RetrieveAPIView):
    """
    GET /api/jobs/{job_id}/conversation/ - Get conversation info
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer
    
    def get_object(self):
        job_id = self.kwargs['job_id']
        job = _load_job(job_id)
        user = self.request.user

        # Un participant peut ouvrir (et donc créer) la conversation.
        if _is_job_participant(user, job):
            return get_or_create_conversation(job)

        # Un modérateur/admin lit une conversation existante, sans en créer.
        if _is_moderator(user):
            return get_object_or_404(Conversation, job=job)

        # Tiers : même réponse qu'une mission inexistante (pas de fuite).
        _deny(user, job_id, 'CONVERSATION_ACCESS_DENIED')


def _other_party(user, job):
    """L'autre partie ACTUELLE de la mission (pas la liste stockée)."""
    transporter = get_job_transporter(job)
    client = get_job_client(job)
    if transporter is not None and transporter.id == user.id:
        other = client
    else:
        other = transporter
    if other is None or other.id == user.id:
        return None
    visible = job.status in ('IN_PROGRESS', 'COMPLETED')
    return {
        'id': other.id,
        'name': f"{other.first_name} {other.last_name}".strip() or other.email,
        'role': other.role,
        'phone': other.phone if visible else None,
        'email': other.email if visible else None,
    }
