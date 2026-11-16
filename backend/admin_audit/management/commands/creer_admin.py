"""
python manage.py creer_admin — crée le premier compte administrateur.

Pourquoi : `createsuperuser` crée un compte de rôle CLIENT, que le back-office
refuse (POST /api/auth/admin/login/ → 403). Et l'offre gratuite de Render n'a
pas de terminal : la commande est lancée à chaque démarrage par entrypoint.sh,
et lit ses valeurs dans l'environnement.

Règles :
- ADMIN_EMAIL et ADMIN_PASSWORD absents (l'un ou l'autre) → ne fait rien ;
- adresse libre → création avec role=ADMIN, is_staff, is_superuser, e-mail en
  minuscules, mot de passe passé à validate_password ; mot de passe refusé
  → avertissement (messages du validateur), aucun compte, démarrage poursuivi
  (avec `set -e` dans entrypoint.sh, une erreur arrêterait toute l'API) ;
- adresse déjà prise → la commande NE MODIFIE RIEN :
  * compte déjà ADMIN : rien (ni mot de passe, ni droits : un admin rétrogradé
    par un autre admin ne doit pas être re-promu à chaque redémarrage) ;
  * compte non ADMIN : avertissement dans les journaux, aucune promotion.
    Sinon, quiconque s'inscrit avec cette adresse avant le premier déploiement
    prendrait le back-office avec SON mot de passe. On ne fait pas non plus
    échouer le démarrage : un tiers pourrait alors bloquer le service ;
- le mot de passe n'est jamais écrit dans les journaux.
"""
import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.db import transaction

ADMIN_ROLE = 'ADMIN'


class Command(BaseCommand):
    help = "Crée le compte administrateur décrit par ADMIN_EMAIL / ADMIN_PASSWORD si l'adresse est libre."

    def handle(self, *args, **options) -> None:
        email = os.environ.get('ADMIN_EMAIL', '').strip().lower()
        password = os.environ.get('ADMIN_PASSWORD', '')

        if not email or not password:
            self.stdout.write("creer_admin : ADMIN_EMAIL ou ADMIN_PASSWORD absent, rien à faire.")
            return

        User = get_user_model()
        existing = User.objects.filter(email__iexact=email).first()
        if existing is not None:
            self._report_existing(existing)
            return

        # Validation avant création. Un mot de passe faible ne doit PAS arrêter
        # le démarrage (toute l'API tomberait en boucle de redémarrage) :
        # avertissement clair, aucun compte, et on continue. Le mot de passe
        # n'est jamais affiché, seuls les messages du validateur le sont.
        candidate = User(email=email, username=email)
        try:
            validate_password(password, user=candidate)
        except ValidationError as exc:
            self.stderr.write(
                "creer_admin : AVERTISSEMENT — ADMIN_PASSWORD refusé, aucun compte "
                "administrateur créé : " + " ".join(exc.messages) + " Choisissez un "
                "mot de passe plus solide dans les variables du service et redéployez."
            )
            return

        with transaction.atomic():
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                role=ADMIN_ROLE,
                is_staff=True,
                is_superuser=True,
            )
        self.stdout.write(f"creer_admin : compte administrateur créé ({user.email}).")

    def _report_existing(self, user) -> None:
        """Adresse déjà prise : on journalise, on ne touche à rien."""
        if user.role == ADMIN_ROLE:
            self.stdout.write(
                f"creer_admin : compte {user.email} déjà administrateur, rien à faire."
            )
            return

        # stderr : visible dans les journaux Render sans faire échouer le démarrage.
        self.stderr.write(
            f"creer_admin : AVERTISSEMENT — l'adresse {user.email} (ADMIN_EMAIL) est déjà "
            f"utilisée par un compte NON administrateur (rôle {user.role}). Aucun droit "
            f"n'a été accordé. Choisissez une autre adresse pour ADMIN_EMAIL et "
            f"redémarrez, ou vérifiez ce compte depuis un administrateur existant "
            f"(il a pu être créé par un tiers)."
        )
