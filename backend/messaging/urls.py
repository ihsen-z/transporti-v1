from django.urls import path
from .views import JobMessagesView, JobConversationView, UserConversationsView

urlpatterns = [
    path('conversations/', UserConversationsView.as_view(), name='user_conversations'),
    path('jobs/<int:job_id>/messages/', JobMessagesView.as_view(), name='job_messages'),
    path('jobs/<int:job_id>/conversation/', JobConversationView.as_view(), name='job_conversation'),
]
