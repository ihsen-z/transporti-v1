"""
Vérification du code de livraison (4 chiffres) avec blocage après échecs.

Sans limite, 10 000 essais suffisaient à deviner le code et à déclarer livrée
une mission qui ne l'était pas. La règle :
- chaque code faux incrémente Booking.pin_failed_attempts ;
- au 5e code faux, la saisie est bloquée 15 minutes (423, code PIN_LOCKED),
  y compris pour un code juste, et le client reçoit une notification ;
- un code juste remet le compteur à zéro ; à la fin du blocage, le compteur
  repart de zéro ;
- plafond total : au 3e blocage sur une même réservation (15 essais faux),
  la saisie reste fermée jusqu'à intervention du support (remise à zéro de
  Booking.pin_lock_count). Même code PIN_LOCKED, sans délai d'attente.
"""
import secrets
from dataclasses import dataclass
from datetime import timedelta
from typing import Optional

from django.db import transaction
from django.utils import timezone

from .models import Booking

MAX_PIN_ATTEMPTS = 5
PIN_LOCK_DURATION = timedelta(minutes=15)
MAX_PIN_LOCKOUTS = 3

PIN_OK = 'OK'
PIN_INVALID = 'PIN_INVALID'
PIN_LOCKED = 'PIN_LOCKED'


@dataclass
class PinCheck:
    """Résultat d'une vérification : statut, essais restants, fin du blocage."""
    status: str
    remaining_attempts: int = MAX_PIN_ATTEMPTS
    locked_until: Optional[object] = None
    # Vrai : bloqué jusqu'à intervention du support (pas de délai d'attente).
    permanent: bool = False

    @property
    def retry_after_seconds(self) -> int:
        if self.permanent or self.locked_until is None:
            return 0
        return max(0, int((self.locked_until - timezone.now()).total_seconds()))


def _notify_client_locked(booking: Booking, permanent: bool = False) -> None:
    """Prévient le client : quelqu'un a saisi 5 codes faux sur sa livraison."""
    if permanent:
        message = (
            f"Trop de codes de livraison faux ont été saisis pour la mission "
            f"#{booking.job_id}. La saisie est bloquée jusqu'à intervention du "
            f"support : contactez-le. Ne donnez votre code qu'à la réception de "
            f"vos biens."
        )
    else:
        message = (
            f"5 codes de livraison faux ont été saisis pour la mission "
            f"#{booking.job_id}. La saisie est bloquée 15 minutes. Ne donnez "
            f"votre code qu'à la réception de vos biens."
        )
    try:
        from logistics.participants import get_job_client
        from notifications.services import notify
        client = get_job_client(booking.job)
        if client is None:
            return
        notify(
            user=client,
            notification_type='SYSTEM_ALERT',
            title='🔒 Code de livraison bloqué',
            message=message,
            metadata={'job_id': booking.job_id, 'event': PIN_LOCKED, 'permanent': permanent},
        )
    except Exception:
        pass  # La notification ne doit jamais casser la vérification


def check_delivery_pin(booking: Booking, pin: str) -> PinCheck:
    """Vérifie `pin` contre le code de la réservation et tient le compteur."""
    with transaction.atomic():
        # Verrou de ligne : deux essais simultanés ne peuvent pas compter pour un.
        locked = Booking.objects.select_for_update().get(pk=booking.pk)
        now = timezone.now()

        # Plafond total atteint : fermé jusqu'à intervention, code juste compris.
        if locked.pin_lock_count >= MAX_PIN_LOCKOUTS:
            return PinCheck(PIN_LOCKED, 0, None, permanent=True)

        if locked.pin_locked_until is not None:
            if locked.pin_locked_until > now:
                return PinCheck(PIN_LOCKED, 0, locked.pin_locked_until)
            # Blocage expiré : on repart de zéro.
            locked.pin_failed_attempts = 0
            locked.pin_locked_until = None

        # compare_digest : comparaison à temps constant.
        if secrets.compare_digest(str(pin), str(locked.delivery_pin)):
            locked.pin_failed_attempts = 0
            locked.pin_locked_until = None
            locked.save(update_fields=['pin_failed_attempts', 'pin_locked_until'])
            return PinCheck(PIN_OK)

        locked.pin_failed_attempts += 1
        just_locked = locked.pin_failed_attempts >= MAX_PIN_ATTEMPTS
        permanent = False
        if just_locked:
            locked.pin_lock_count += 1
            permanent = locked.pin_lock_count >= MAX_PIN_LOCKOUTS
            locked.pin_locked_until = None if permanent else now + PIN_LOCK_DURATION
        locked.save(update_fields=['pin_failed_attempts', 'pin_locked_until', 'pin_lock_count'])

    if just_locked:
        _notify_client_locked(locked, permanent=permanent)
        return PinCheck(PIN_LOCKED, 0, locked.pin_locked_until, permanent=permanent)
    return PinCheck(PIN_INVALID, MAX_PIN_ATTEMPTS - locked.pin_failed_attempts)
