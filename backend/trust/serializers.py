from rest_framework import serializers
from django.utils import timezone
from django.conf import settings
from .models import TrustProfile, VerificationDocument, TrustVerificationRequest, DocumentType
import hashlib
import os
import secrets


# Allowed MIME types for verification documents
ALLOWED_MIME_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'application/pdf': '.pdf',
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_DOCUMENTS_PER_PROFILE = 5


class VerificationDocumentUploadSerializer(serializers.Serializer):
    """
    Serializer for uploading verification documents.
    Accepts a real file upload and maps to the secure VerificationDocument model.
    SQLite-compatible, PostgreSQL-ready.
    """
    document_type = serializers.ChoiceField(
        choices=VerificationDocument._meta.get_field('document_type').choices
    )
    document_file = serializers.FileField()

    def validate_document_file(self, value):
        """Validate file type, MIME, and size."""
        # Size check
        if value.size > MAX_FILE_SIZE:
            raise serializers.ValidationError(
                f"Fichier trop volumineux ({value.size // (1024*1024)}MB). Maximum autorisé : 5MB."
            )

        # MIME type check
        content_type = value.content_type
        if content_type not in ALLOWED_MIME_TYPES:
            raise serializers.ValidationError(
                f"Type de fichier non autorisé ({content_type}). "
                f"Formats acceptés : JPG, PNG, PDF."
            )

        # Extension check (double validation)
        ext = os.path.splitext(value.name)[1].lower()
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.pdf'}
        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"Extension de fichier non autorisée ({ext})."
            )

        return value

    def validate(self, attrs):
        user = self.context['request'].user
        trust_profile, _ = TrustProfile.objects.get_or_create(user=user)

        # Quota check: max documents per profile
        existing_count = VerificationDocument.objects.filter(profile=trust_profile).count()
        if existing_count >= MAX_DOCUMENTS_PER_PROFILE:
            raise serializers.ValidationError(
                f"Maximum {MAX_DOCUMENTS_PER_PROFILE} documents autorisés. "
                f"Supprimez un document avant d'en ajouter un nouveau."
            )

        attrs['_trust_profile'] = trust_profile
        return attrs

    def create(self, validated_data):
        trust_profile = validated_data['_trust_profile']
        document_type = validated_data['document_type']
        uploaded_file = validated_data['document_file']

        # 1. Compute file hash (SHA-256) for integrity
        hasher = hashlib.sha256()
        for chunk in uploaded_file.chunks():
            hasher.update(chunk)
        file_hash = hasher.hexdigest()

        # Reset file pointer after hashing
        uploaded_file.seek(0)

        # 2. Generate encryption IV placeholder (for future AES encryption)
        encryption_iv = secrets.token_hex(16)  # 32-char hex string

        # 3. Save file to local storage (MEDIA_ROOT/verification_docs/)
        user_id = trust_profile.user_id
        ext = os.path.splitext(uploaded_file.name)[1].lower()
        filename = f"{user_id}_{document_type}_{secrets.token_hex(8)}{ext}"
        relative_path = os.path.join('verification_docs', str(user_id), filename)

        # Ensure directory exists
        full_dir = os.path.join(settings.MEDIA_ROOT, 'verification_docs', str(user_id))
        os.makedirs(full_dir, exist_ok=True)

        # Write file
        full_path = os.path.join(settings.MEDIA_ROOT, relative_path)
        with open(full_path, 'wb+') as dest:
            for chunk in uploaded_file.chunks():
                dest.write(chunk)

        # 4. s3_key = local relative path (ready for S3 migration)
        s3_key = relative_path.replace('\\', '/')

        # 5. Create VerificationDocument record
        doc = VerificationDocument.objects.create(
            profile=trust_profile,
            document_type=document_type,
            s3_key=s3_key,
            encryption_iv=encryption_iv,
            file_hash=file_hash,
            is_valid=False,  # Admin must validate
        )

        return doc


class VerificationDocumentReadSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for listing uploaded documents.
    Exposes safe metadata only (no encryption details).
    """
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = VerificationDocument
        fields = ['id', 'document_type', 'file_url', 'is_valid', 'uploaded_at']
        read_only_fields = fields

    def get_file_url(self, obj) -> str:
        """Generate the media URL from s3_key."""
        if obj.s3_key:
            return f"{settings.MEDIA_URL}{obj.s3_key}"
        return ''



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


# Document type label mapping for frontend
DOCUMENT_TYPE_LABELS = {
    'CIN_FRONT': "Carte d'identité (Recto)",
    'CIN_BACK': "Carte d'identité (Verso)",
    'CARTE_GRISE': 'Carte grise',
    'INSURANCE': 'Assurance véhicule',
    'LICENSE': 'Licence professionnelle',
    'SELFIE': 'Selfie avec pièce d\'identité',
}


class AdminVerificationRequestSerializer(serializers.ModelSerializer):
    """
    Admin-facing serializer for TrustVerificationRequest.
    Maps to frontend VerificationRequest interface.
    """
    transporterName = serializers.SerializerMethodField()
    transporterEmail = serializers.SerializerMethodField()
    documentType = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    submittedAt = serializers.DateTimeField(source='submitted_at')
    reviewedAt = serializers.DateTimeField(source='reviewed_at', default=None)
    reviewerNote = serializers.CharField(source='review_notes', default='')
    documentUrl = serializers.SerializerMethodField()
    trustScore = serializers.SerializerMethodField()

    class Meta:
        model = TrustVerificationRequest
        fields = [
            'id', 'transporterName', 'transporterEmail',
            'documentType', 'status', 'submittedAt',
            'reviewedAt', 'reviewerNote', 'documentUrl', 'trustScore',
        ]
        read_only_fields = fields

    def get_transporterName(self, obj) -> str:
        user = obj.trust_profile.user
        name = f"{user.first_name} {user.last_name}".strip()
        return name or user.email

    def get_transporterEmail(self, obj) -> str:
        return obj.trust_profile.user.email

    def get_documentType(self, obj) -> str:
        return DOCUMENT_TYPE_LABELS.get(obj.document_type, obj.document_type)

    def get_status(self, obj) -> str:
        # Map backend status to frontend status
        mapping = {
            'PENDING': 'PENDING_REVIEW',
            'APPROVED': 'APPROVED',
            'REJECTED': 'REJECTED',
        }
        return mapping.get(obj.status, obj.status)

    def get_documentUrl(self, obj) -> str:
        if obj.document_file:
            return f"{settings.MEDIA_URL}{obj.document_file.name}"
        return ''

    def get_trustScore(self, obj) -> int:
        return obj.trust_profile.trust_score

