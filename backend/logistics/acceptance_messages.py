"""
Textes affichés après l'acceptation d'une réservation, selon le mode de paiement.

Au lancement, tout se paie en espèces (PAYMENT_GATEWAY=DISABLED) : parler de
« finaliser le paiement » envoyait le client chercher un écran de paiement qui
n'existe pas. En espèces, la mission peut démarrer tout de suite (le
transporteur confirme le démarrage) et le client paie à la livraison.
"""

COD = 'COD'


def _is_cash(payment_method: str) -> bool:
    return str(payment_method or '').upper() == COD


def client_next_step(payment_method: str) -> str:
    """Prochaine étape, vue du CLIENT dont la réservation vient d'être acceptée."""
    if _is_cash(payment_method):
        return ("La mission peut démarrer : le transporteur confirme le départ, "
                "et vous payez en espèces à la livraison.")
    return "Finalisez le paiement pour démarrer la mission."


def transporter_next_step(payment_method: str) -> str:
    """Prochaine étape, vue du TRANSPORTEUR dont la réservation est acceptée."""
    if _is_cash(payment_method):
        return ("Vous pouvez confirmer le démarrage de la mission : "
                "le client paie en espèces à la livraison.")
    return "Le client va finaliser le paiement."
