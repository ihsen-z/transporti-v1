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
from transporti_core.throttling import BookingRateThrottle

logger = logging.getLogger('transporti')


class UserConversationsView(generics.ListAPIView):
    """
    GET /api/conversations/ - List all conversations the current user participates in.
    Returns conversations ordered by most recent activity.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationListSerializer

    def get_queryset(self):
        return (
            Conversation.objects
            .filter(participants=self.request.user)
            .select_related('job')
            .prefetch_related('participants', 'messages')
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
    throttle_classes = [BookingRateThrottle]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MessageCreateSerializer
        return MessageSerializer
    
    def get(self, request, job_id):
        """Get messages for a job conversation."""
        job = get_object_or_404(TransportJob, id=job_id)
        
        try:
            messages = get_conversation_messages(
                user=request.user,
                job=job,
                limit=100
            )
            
            # Mark as read
            mark_messages_as_read(request.user, job)
            
            # Get conversation info
            try:
                conversation = Conversation.objects.get(job=job)
                conv_data = ConversationSerializer(conversation).data
            except Conversation.DoesNotExist:
                conv_data = None
            
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
        is_system = serializer.validated_data.get('is_system', False)
        
        try:
            message = send_message(
                user=request.user,
                job=job,
                content=content,
                is_system=is_system
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
