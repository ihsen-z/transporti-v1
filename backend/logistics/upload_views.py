"""
Photo Upload API — POST /api/upload/photo/
Handles multipart file uploads with validation, compression, and UUID storage.
"""
import uuid
import os
from PIL import Image
from io import BytesIO

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser


# Allowed MIME types (validated by magic bytes via Pillow)
ALLOWED_FORMATS = {'JPEG', 'PNG', 'WEBP'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_DIMENSION = 2000  # Resize to max 2000px on longest side
JPEG_QUALITY = 85


class PhotoUploadView(APIView):
    """
    POST /api/upload/photo/
    Accepts a single image file, validates, compresses, and stores it.
    Returns the public URL of the uploaded photo.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('photo')
        if not file:
            return Response(
                {'error': 'Aucun fichier fourni. Envoyez un champ "photo".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- Validation: size ---
        if file.size > MAX_FILE_SIZE:
            return Response(
                {'error': f'Le fichier dépasse la taille maximale de {MAX_FILE_SIZE // (1024*1024)} MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- Validation: image type via Pillow (magic bytes) ---
        try:
            img = Image.open(file)
            img.verify()  # Verify it's a real image
            file.seek(0)  # Reset after verify
            img = Image.open(file)  # Re-open for processing
        except Exception:
            return Response(
                {'error': 'Le fichier n\'est pas une image valide.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if img.format not in ALLOWED_FORMATS:
            return Response(
                {'error': f'Format non supporté: {img.format}. Formats acceptés: JPEG, PNG, WebP.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- Compression & Resize ---
        try:
            # Convert RGBA to RGB for JPEG compatibility
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')

            # Resize if too large (preserve aspect ratio)
            w, h = img.size
            if max(w, h) > MAX_DIMENSION:
                ratio = MAX_DIMENSION / max(w, h)
                new_size = (int(w * ratio), int(h * ratio))
                img = img.resize(new_size, Image.LANCZOS)

            # Save to buffer as JPEG (best compression for photos)
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=JPEG_QUALITY, optimize=True)
            buffer.seek(0)
            compressed_content = buffer.read()

        except Exception as e:
            return Response(
                {'error': f'Erreur lors du traitement de l\'image: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # --- Storage with UUID filename ---
        filename = f"{uuid.uuid4().hex}.jpg"
        upload_path = os.path.join('uploads', 'photos', filename)

        # Save using Django's default storage
        saved_path = default_storage.save(upload_path, ContentFile(compressed_content))

        # Build the public URL
        photo_url = request.build_absolute_uri(f'{settings.MEDIA_URL}{saved_path}')

        return Response({
            'url': photo_url,
            'filename': filename,
            'size': len(compressed_content),
            'dimensions': list(img.size),
        }, status=status.HTTP_201_CREATED)
