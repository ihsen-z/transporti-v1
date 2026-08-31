"""
C5.9 — sérialiseurs du carnet d'adresses.

Fichier séparé de `logistics/serializers.py`, qui dépasse déjà 1 100 lignes :
la règle du projet est de découper par responsabilité plutôt que d'ajouter à
un fichier déjà long.
"""
from rest_framework import serializers

from .models import SavedAddress


class SavedAddressSerializer(serializers.ModelSerializer):
    """
    Lecture et écriture d'une adresse du carnet.

    `user` n'est JAMAIS accepté depuis la requête : il vient du jeton, comme
    `company_id` côté MCP. L'accepter en paramètre laisserait écrire dans le
    carnet d'un autre utilisateur.
    """

    class Meta:
        model = SavedAddress
        fields = [
            'id', 'label', 'address', 'governorate',
            'lat', 'lng', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_label(self, valeur: str) -> str:
        valeur = valeur.strip()
        if not valeur:
            raise serializers.ValidationError(
                "Le nom de l'adresse ne peut pas être vide."
            )
        return valeur

    def validate_address(self, valeur: str) -> str:
        valeur = valeur.strip()
        if not valeur:
            raise serializers.ValidationError("L'adresse ne peut pas être vide.")
        return valeur

    def validate_governorate(self, valeur: str) -> str:
        valeur = valeur.strip()
        if not valeur:
            raise serializers.ValidationError("Le gouvernorat est obligatoire.")
        return valeur

    def validate(self, attrs: dict) -> dict:
        utilisateur = self.context['request'].user

        # --- Plafond du carnet ---------------------------------------------
        # Uniquement à la CRÉATION : une modification ne fait pas grossir le
        # carnet, et refuser un renommage parce que le carnet est plein serait
        # incompréhensible.
        if self.instance is None:
            existantes = SavedAddress.objects.filter(user=utilisateur).count()
            if existantes >= SavedAddress.MAXIMUM_PAR_UTILISATEUR:
                raise serializers.ValidationError(
                    f"Votre carnet contient déjà "
                    f"{SavedAddress.MAXIMUM_PAR_UTILISATEUR} adresses. "
                    f"Supprimez-en une avant d'en ajouter une nouvelle."
                )

        # --- Unicité du nom -------------------------------------------------
        # La contrainte de base de données existe ; sans ce contrôle, elle
        # remonterait en erreur 500 au lieu d'un message utilisable.
        label = attrs.get('label', getattr(self.instance, 'label', None))
        if label is not None:
            doublons = SavedAddress.objects.filter(user=utilisateur, label=label)
            if self.instance is not None:
                doublons = doublons.exclude(pk=self.instance.pk)
            if doublons.exists():
                raise serializers.ValidationError(
                    {'label': f"Vous avez déjà une adresse nommée « {label} »."}
                )

        # --- Coordonnées : les deux, ou aucune -------------------------------
        # Une latitude sans longitude ne situe rien. Elle passerait pourtant
        # sans bruit, et l'estimation de prix retomberait silencieusement sur
        # le centroïde du gouvernorat en croyant utiliser un point précis.
        lat = attrs.get('lat', getattr(self.instance, 'lat', None))
        lng = attrs.get('lng', getattr(self.instance, 'lng', None))
        if (lat is None) != (lng is None):
            raise serializers.ValidationError(
                "Latitude et longitude vont ensemble : fournissez les deux, "
                "ou aucune des deux."
            )

        return attrs
