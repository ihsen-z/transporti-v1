from rest_framework import serializers
from django.utils import timezone
from .models import TrustProfile, VerificationDocument

class VerificationDocumentSerializer(serializers.ModelSerializer):
    """
    Serializer for uploading verification documents.
    """
    class Meta:
        model = VerificationDocument
        fields = ['id', 'document_type', 'file_url', 'status', 'rejection_reason', 'uploaded_at']
        read_only_fields = ['id', 'status', 'rejection_reason', 'uploaded_at']

    def create(self, validated_data):
        user = self.context['request'].user
        # Ensure TrustProfile exists
        trust_profile, _ = TrustProfile.objects.get_or_create(user=user)
        validated_data['trust_profile'] = trust_profile
        return super().create(validated_data)


class TrustProfileSubmissionSerializer(serializers.ModelSerializer):
    """
    Serializer for submitting the profile for verification.
    Also allows updating vehicle details.
    """
    class Meta:
        model = TrustProfile
        fields = [
            'vehicle_type', 'vehicle_capacity_kg', 'vehicle_plate', 
            'vehicle_photos', 'service_areas', 'specializations',
            'verification_status'
        ]
        read_only_fields = ['verification_status']

    def update(self, instance, validated_data):
        # Update fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Trigger verification logic (e.g. change status to PENDING if not already)
        if instance.verification_status == 'UNVERIFIED' or instance.verification_status == 'REJECTED':
            instance.verification_status = 'PENDING'
            instance.last_submitted_at = serializers.DateTimeField().to_internal_value(serializers.DateTimeField().to_representation(timezone.now()))
            
        instance.save()
        return instance
