"""
Photo Upload API — POST /api/upload/photo/
Handles multipart file uploads with validation, compression, and UUID storage.
"""
import uuid
import logging

from django.urls import reverse
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from transporti_core.images import InvalidImage, UnsupportedImageFormat, reencode


logger = logging.getLogger('transporti')

# Formats et dimensions maximales : transporti_core/images.py
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_DIMENSION = 2000  # Resize to max 2000px on longest side


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

        # --- Validation + ré-encodage : module partagé transporti_core/images.py
        # (formats JPEG/PNG/WebP, refus des bombes de décompression avant tout
        # décodage complet, orientation EXIF, JPEG neuf sans métadonnées).
        try:
            result = reencode(file, MAX_DIMENSION, identify_any_format=True)
        except UnsupportedImageFormat as e:
            return Response(
                {'error': f'Format non supporté: {e.image_format}. Formats acceptés: JPEG, PNG, WebP.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except InvalidImage as e:
            logger.warning(f"Photo upload: invalid image file from user {request.user.id}: {e}")
            return Response(
                {'error': 'Le fichier n\'est pas une image valide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        compressed_content = result.content.read()

        # --- Storage with UUID filename ---
        filename = f"{uuid.uuid4().hex}.jpg"
        upload_path = f"uploads/photos/{filename}"

        try:
            # Save using Django's default storage
            saved_path = default_storage.save(upload_path, ContentFile(compressed_content))

            # URL stable servie par /media/, qui lit le stockage configuré
            # (disque ou B2). Elle est enregistrée en base (TransportJob.photos) :
            # une URL signée du bucket expirerait au bout d'une heure.
            photo_url = request.build_absolute_uri(
                reverse('media-public', kwargs={'chemin': saved_path})
            )

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
            'dimensions': [result.width, result.height],
        }, status=status.HTTP_201_CREATED)
