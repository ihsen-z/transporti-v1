"""
Notifications Serializers - Transporti V1
"""
from rest_framework import serializers
from .models import Notification, NotificationType, NotificationCategory


class NatureDuJobMixin:
    """
    Expose `job_is_return_trip` a cote de `metadata.job_id`.

    Pourquoi ne PAS l'ecrire dans `metadata` a la creation. `metadata` est un
    blob JSON figé au moment ou la notification est emise. Ajouter la nature du
    job a l'emission ne corrigerait que les notifications FUTURES : toutes
    celles deja en base resteraient sans le champ, et le front construirait
    pour elles une URL de job muettement fausse. On resout donc a la LECTURE.

    Cout : une requete supplementaire par page, pas une par notification. La
    carte est construite une seule fois pour toute la page et mise en cache
    dans le contexte du serialiseur.

    Renvoie `None` — pas `False` — quand la nature est inconnue (notification
    sans `job_id`, ou job supprime depuis). `False` signifierait « demande
    classique » et enverrait le lecteur sur la mauvaise route ; `None` dit au
    front qu'il ne sait pas, et le laisse passer par la route de resolution.
    """

    CLE_CACHE = '_natures_par_job'

    def get_job_is_return_trip(self, obj):
        job_id = (obj.metadata or {}).get('job_id')
        if job_id is None:
            return None
        # `.get` et non `[...]` : un job supprime depuis l'emission de la
        # notification est absent de la carte, et vaut alors None.
        return self._natures_par_job().get(job_id)

    def _natures_par_job(self) -> dict:
        contexte = self.context
        if self.CLE_CACHE in contexte:
            return contexte[self.CLE_CACHE]

        # En liste (`many=True`), c'est le ListSerializer parent qui porte la
        # page entiere ; en detail, l'objet est sur ce serialiseur.
        source = self.parent.instance if self.parent is not None else self.instance
        objets = source if isinstance(source, (list, tuple)) else (
            list(source) if hasattr(source, '__iter__') else [source]
        )

        ids = {
            (o.metadata or {}).get('job_id')
            for o in objets
            if (o.metadata or {}).get('job_id') is not None
        }

        carte = {}
        if ids:
            from logistics.models import TransportJob
            carte = dict(
                TransportJob.objects.filter(id__in=ids).values_list(
                    'id', 'is_return_trip'
                )
            )

        contexte[self.CLE_CACHE] = carte
        return carte


class NotificationSerializer(NatureDuJobMixin, serializers.ModelSerializer):
    """Serializer for user notifications."""
    
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    job_is_return_trip = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'category',
            'category_display',
            'type',
            'type_display',
            'title',
            'message',
            'is_read',
            'metadata',
            'job_is_return_trip',
            'created_at',
            'read_at',
        ]
        read_only_fields = fields


class NotificationListSerializer(NatureDuJobMixin, serializers.ModelSerializer):
    """Compact serializer for notification lists — includes message + metadata for frontend."""

    job_is_return_trip = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'category',
            'type',
            'title',
            'message',
            'is_read',
            'metadata',
            'job_is_return_trip',
            'created_at',
        ]
        read_only_fields = fields


class UnreadCountSerializer(serializers.Serializer):
    """Serializer for unread count response."""
    unread_count = serializers.IntegerField()


class CategoryCountSerializer(serializers.Serializer):
    """Serializer for category-based counts."""
    category = serializers.CharField()
    count = serializers.IntegerField()


# =============================================================================
# Device Token Serializers (Mobile Push Notifications)
# =============================================================================

class DeviceTokenRegisterSerializer(serializers.Serializer):
    """
    Validates device token registration from mobile clients.
    POST /api/v1/notifications/devices/register/
    """
    platform = serializers.ChoiceField(
        choices=[('ANDROID', 'Android'), ('IOS', 'iOS')],
        required=True,
    )
    token = serializers.CharField(
        max_length=500,
        required=True,
        # 4.3 audit finding: no format constraint ever existed here — an
        # Expo push token ("ExponentPushToken[...]", the only kind the mobile
        # app registers per the 4.1 decision) was already accepted as-is.
        # `platform` still matters (device bookkeeping), the token format does not.
        help_text="Expo push token (ExponentPushToken[...])",
    )
    device_name = serializers.CharField(
        max_length=100,
        required=False,
        default='',
        help_text="Human-readable device name",
    )


class DeviceTokenListSerializer(serializers.ModelSerializer):
    """Read-only serializer for listing user's registered devices."""
    
    class Meta:
        from .models import DeviceToken
        model = DeviceToken
        fields = ['id', 'platform', 'device_name', 'is_active', 'created_at', 'updated_at']
        read_only_fields = fields
