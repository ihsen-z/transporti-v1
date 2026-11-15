"""
Ré-encodage d'images envoyées par les utilisateurs — Transporti V1.

Pourquoi ré-encoder : un fichier « image/jpeg » déclaré par le client peut
contenir n'importe quoi (HTML, SVG avec script, polyglotte). En le relisant
avec Pillow puis en le réécrivant en JPEG neuf sous un nom aléatoire, on ne
stocke que des pixels : ni le contenu d'origine, ni son nom, ni ses
métadonnées (EXIF, position GPS) ne survivent.

Module unique : avatars (users/views.py) et photos d'annonce
(logistics/upload_views.py) passent tous deux par ici.

Bombe de décompression : un PNG de 420 Ko peut annoncer 12 000 × 12 000 px et
coûter plus d'un gigaoctet au décodage. D'après la doc Pillow, Image.open est
paresseux (il ne lit que l'en-tête) et `size` est connu dès ce moment : on
refuse donc au-delà de MAX_PIXELS AVANT verify() et load(). En plus, l'alerte
DecompressionBombWarning de Pillow est traitée comme une erreur.
"""
import uuid
import warnings
from dataclasses import dataclass
from io import BytesIO

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

# Lecteurs Pillow essayés à l'ouverture (détection sur le contenu, pas sur
# l'en-tête HTTP). Le lecteur JPEG reconnaît aussi les MPO (JPEG multi-vues
# de certains appareils photo), d'où le format « MPO » accepté ci-dessous.
OPEN_FORMATS = ('JPEG', 'PNG', 'WEBP')
ALLOWED_INPUT_FORMATS = ('JPEG', 'PNG', 'WEBP', 'MPO')
JPEG_QUALITY = 85

# 40 mégapixels : au-delà de tout appareil photo de téléphone courant.
MAX_PIXELS = 40_000_000


class InvalidImage(Exception):
    """Le fichier n'est pas une image lisible d'un format autorisé."""


class UnsupportedImageFormat(InvalidImage):
    """Image reconnue, mais d'un format refusé (GIF, BMP…)."""

    def __init__(self, image_format: str):
        self.image_format = image_format
        super().__init__(f'format refusé : {image_format}')


@dataclass
class ReencodedImage:
    content: ContentFile
    width: int
    height: int


def _open_checked(uploaded_file, identify_any_format: bool):
    """
    Ouvre l'image en refusant bombes, fichiers corrompus et formats refusés.
    Renvoie une image entièrement décodée.
    """
    formats = None if identify_any_format else OPEN_FORMATS
    with warnings.catch_warnings():
        # L'alerte de Pillow (au-delà de MAX_IMAGE_PIXELS) devient une erreur.
        warnings.simplefilter('error', Image.DecompressionBombWarning)
        try:
            # 1) En-tête seulement : dimensions et format, sans décoder.
            probe = Image.open(uploaded_file, formats=formats)
            width, height = probe.size
            if width * height > MAX_PIXELS:
                raise InvalidImage(f'image trop grande ({width}x{height})')
            image_format = probe.format
            if image_format not in ALLOWED_INPUT_FORMATS:
                raise UnsupportedImageFormat(image_format or 'inconnu')
            # 2) Contrôle d'intégrité ; l'objet est inutilisable ensuite.
            probe.verify()
            # 3) Réouverture puis décodage complet, taille déjà bornée.
            uploaded_file.seek(0)
            img = Image.open(uploaded_file, formats=OPEN_FORMATS)
            img.load()
        except InvalidImage:
            raise
        except (Image.DecompressionBombError, Image.DecompressionBombWarning,
                OSError, SyntaxError, ValueError) as exc:
            # UnidentifiedImageError hérite d'OSError.
            raise InvalidImage(str(exc)) from exc
    return img


def reencode(uploaded_file, max_dimension: int, identify_any_format: bool = False) -> ReencodedImage:
    """
    Lit `uploaded_file`, vérifie que c'est une vraie image d'un format
    autorisé, la redimensionne (côté le plus long ≤ max_dimension) et la
    réécrit en JPEG nommé `<uuid>.jpg`.

    `identify_any_format=True` laisse Pillow reconnaître tout format, pour
    nommer un format refusé (UnsupportedImageFormat) au lieu de « illisible ».
    Lève InvalidImage sinon.
    """
    img = _open_checked(uploaded_file, identify_any_format)

    try:
        img = ImageOps.exif_transpose(img)
        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')
        img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

        buffer = BytesIO()
        # Pas de paramètre exif= : les métadonnées d'origine sont abandonnées.
        img.save(buffer, format='JPEG', quality=JPEG_QUALITY, optimize=True)
    except (OSError, ValueError) as exc:
        raise InvalidImage(str(exc)) from exc

    content = ContentFile(buffer.getvalue(), name=f"{uuid.uuid4().hex}.jpg")
    return ReencodedImage(content=content, width=img.size[0], height=img.size[1])


def reencode_as_jpeg(uploaded_file, max_dimension: int) -> ContentFile:
    """Raccourci historique (avatars) : seul le fichier JPEG est renvoyé."""
    return reencode(uploaded_file, max_dimension).content
