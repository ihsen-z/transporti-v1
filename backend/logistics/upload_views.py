"""
Photo Upload API — POST /api/upload/photo/
Handles multipart file uploads with validation, compression, and UUID storage.
"""
import uuid
import os
import logging
from PIL import Image, ExifTags
from io import BytesIO

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser


logger = logging.getLogger('transporti')

# Allowed MIME types (validated by magic bytes via Pillow)
ALLOWED_FORMATS = {'JPEG', 'PNG', 'WEBP', 'MPO'}  # MPO = JPEG variant from some cameras
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_DIMENSION = 2000  # Resize to max 2000px on longest side
JPEG_QUALITY = 85


def _fix_orientation(img):
    """
    Fix image orientation based on EXIF data.
    Many camera/phone images are rotated via EXIF — Pillow doesn't auto-rotate.
    """
    try:
        exif = img._getexif()
        if exif is None:
            return img

        orientation_key = None
        for key, val in ExifTags.TAGS.items():
            if val == 'Orientation':
                orientation_key = key
                break

        if orientation_key is None or orientation_key not in exif:
            return img

        orientation = exif[orientation_key]

        if orientation == 2:
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        elif orientation == 3:
            img = img.rotate(180, expand=True)
        elif orientation == 4:
            img = img.transpose(Image.FLIP_TOP_BOTTOM)
        elif orientation == 5:
            img = img.rotate(-90, expand=True).transpose(Image.FLIP_LEFT_RIGHT)
        elif orientation == 6:
            img = img.rotate(-90, expand=True)
        elif orientation == 7:
            img = img.rotate(90, expand=True).transpose(Image.FLIP_LEFT_RIGHT)
        elif orientation == 8:
            img = img.rotate(90, expand=True)

    except (AttributeError, KeyError, IndexError, TypeError):
        # No EXIF data or no orientation tag — no-op
        pass

    return img


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
            detected_format = img.format  # Capture format BEFORE verify destroys it
            img.verify()  # Verify it's a real image
            file.seek(0)  # Reset after verify
            img = Image.open(file)  # Re-open for processing
        except Exception as e:
            logger.warning(f"Photo upload: invalid image file from user {request.user.id}: {e}")
            return Response(
                {'error': 'Le fichier n\'est pas une image valide.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Use the format captured before verify, fallback to re-detected
        image_format = detected_format or img.format or 'UNKNOWN'

        if image_format not in ALLOWED_FORMATS:
            return Response(
                {'error': f'Format non supporté: {image_format}. Formats acceptés: JPEG, PNG, WebP.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- Compression & Resize ---
        try:
            # Fix EXIF orientation (phones often store rotated images)
            img = _fix_orientation(img)

            # Convert RGBA/P/LA/CMYK to RGB for JPEG compatibility
            if img.mode not in ('RGB', 'L'):
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
            logger.error(f"Photo upload: processing error for user {request.user.id}: {e}", exc_info=True)
            return Response(
                {'error': 'Erreur lors du traitement de l\'image. Veuillez réessayer avec un autre fichier.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- Storage with UUID filename ---
        filename = f"{uuid.uuid4().hex}.jpg"
        upload_path = f"uploads/photos/{filename}"

        try:
            # Save using Django's default storage
            saved_path = default_storage.save(upload_path, ContentFile(compressed_content))

            # Build the public URL
            photo_url = request.build_absolute_uri(f'{settings.MEDIA_URL}{saved_path}')

        except Exception as e:
            logger.error(f"Photo upload: storage error for user {request.user.id}: {e}", exc_info=True)
            return Response(
                {'error': 'Erreur lors de la sauvegarde. Veuillez réessayer.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'url': photo_url,
            'filename': filename,
            'size': len(compressed_content),
            'dimensions': list(img.size),
        }, status=status.HTTP_201_CREATED)
