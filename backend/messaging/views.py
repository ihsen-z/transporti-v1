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

from .models import Conversation, Message
from .serializers import MessageSerializer, MessageCreateSerializer, ConversationSerializer, ConversationListSerializer
from .services import (
    send_message, get_conversation_messages, 
    get_or_create_conversation, mark_messages_as_read
)
from logistics.models import TransportJob
from transporti_core.throttling import MessageRateThrottle

logger = logging.getLogger('transporti')


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
            .filter(participants=self.request.user)
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
        job = get_object_or_404(TransportJob, id=job_id)
        
        try:
            # FIX #5: Auto-create conversation if job is active and user is participant
            conversation = None
            try:
                conversation = Conversation.objects.get(job=job)
            except Conversation.DoesNotExist:
                # Auto-create only if user is a participant in the job
                from logistics.models import Offer
                is_owner = job.owner_id == request.user.id
                is_transporter = Offer.objects.filter(
                    job=job, status='ACCEPTED', transporter=request.user
                ).exists()
                
                if is_owner or is_transporter:
                    conversation = get_or_create_conversation(job)
                else:
                    return Response(
                        {'error': 'Aucune conversation trouvée pour cette mission.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            messages = get_conversation_messages(
                user=request.user,
                job=job,
                limit=100
            )
            
            # Mark as read
            mark_messages_as_read(request.user, job)
            
            conv_data = ConversationSerializer(conversation).data if conversation else None
            
            # Build job info for the chat header
            job_info = {
                'id': job.id,
                'pickup_address': job.pickup_address,
                'dropoff_address': job.dropoff_address,
                'status': job.status,
                'job_type': job.job_type,
            }
            
            # Identify other party in the conversation
            other_party = None
            if conversation:
                for p in conversation.participants.all():
                    if p.id != request.user.id:
                        other_party = {
                            'id': p.id,
                            'name': f"{p.first_name} {p.last_name}".strip() or p.email,
                            'role': p.role,
                            'phone': p.phone if job.status in ('IN_PROGRESS', 'COMPLETED') else None,
                            'email': p.email if job.status in ('IN_PROGRESS', 'COMPLETED') else None,
                        }
                        break
            
            return Response({
                'conversation': conv_data,
                'messages': MessageSerializer(messages, many=True).data,
                'count': len(messages),
                'job': job_info,
                'other_party': other_party,
            })
        
        except PermissionDenied as e:
            logger.warning(f"MESSAGES_ACCESS_DENIED: user={request.user.id}, job={job_id}")
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
    
    def post(self, request, job_id):
        """Send a message in a job conversation."""
        job = get_object_or_404(TransportJob, id=job_id)
        
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
        
        except PermissionDenied as e:
            logger.warning(f"MESSAGE_SEND_DENIED: user={request.user.id}, job={job_id}")
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        
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
        job = get_object_or_404(TransportJob, id=job_id)
        
        # Use service to get or create
        return get_or_create_conversation(job)
