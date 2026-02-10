from rest_framework import serializers
from .models import Review, ReviewRole
from logistics.models import TransportJob
from django.contrib.auth import get_user_model

User = get_user_model()

class ReviewCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a review.
    """
    job_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Review
        fields = ['job_id', 'rating', 'comment', 'aspects']
        
    def validate(self, attrs):
        user = self.context['request'].user
        job_id = attrs.get('job_id')
        
        try:
            job = TransportJob.objects.get(id=job_id)
        except TransportJob.DoesNotExist:
            raise serializers.ValidationError({"job_id": "Job not found."})
            
        # Validate job status
        if job.status != TransportJob.Status.COMPLETED:
            raise serializers.ValidationError({"job_id": "Job must be COMPLETED to leave a review."})
            
        # Determine role and validate participation
        if job.owner == user:
            role = ReviewRole.CLIENT
            target = job.accepted_offer.transporter
        elif hasattr(job, 'accepted_offer') and job.accepted_offer.transporter == user:
            role = ReviewRole.TRANSPORTER
            target = job.owner
        else:
            raise serializers.ValidationError({"non_field_errors": "You are not a participant in this job."})
            
        # Check if review already exists
        if Review.objects.filter(job=job, role=role).exists():
            raise serializers.ValidationError({"non_field_errors": "You have already reviewed this job."})
            
        attrs['job'] = job
        attrs['role'] = role
        attrs['reviewer'] = user
        attrs['target'] = target
        
        return attrs
        
    def create(self, validated_data):
        job_id = validated_data.pop('job_id') # remove from data as we have 'job' object
        return Review.objects.create(**validated_data)


class ReviewListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing reviews publically.
    """
    reviewer_name = serializers.CharField(source='reviewer.first_name', read_only=True)
    reviewer_avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = Review
        fields = ['id', 'rating', 'comment', 'aspects', 'reviewer_name', 'reviewer_avatar', 'created_at']
        
    def get_reviewer_avatar(self, obj):
        if hasattr(obj.reviewer, 'profile') and obj.reviewer.profile.avatar_url:
            return obj.reviewer.profile.avatar_url
        return None
