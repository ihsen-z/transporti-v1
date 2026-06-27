"""
Payment Gateway Adapter — Transporti V1
Abstraction layer for external payment providers.

Supports:
- SANDBOX mode (default): simulates payments for testing
- KONNECT mode: integrates with Konnect.tn (Tunisian payment gateway)

Configuration via settings.py:
    PAYMENT_GATEWAY = 'SANDBOX'  # or 'KONNECT'
    KONNECT_API_KEY = '...'
    KONNECT_WALLET_ID = '...'
    KONNECT_API_URL = 'https://api.preprod.konnect.network/api/v2'  # or prod
"""
import logging
import uuid
from abc import ABC, abstractmethod
from decimal import Decimal
from dataclasses import dataclass
from typing import Optional

from django.conf import settings

logger = logging.getLogger('payments')


# =============================================================================
# Data Transfer Objects
# =============================================================================

@dataclass
class PaymentInitResult:
    """Result of payment initialization."""
    success: bool
    gateway_ref: str  # External reference ID
    payment_url: str  # Redirect URL for client
    error: Optional[str] = None


@dataclass
class PaymentStatusResult:
    """Result of payment status check."""
    gateway_ref: str
    status: str  # 'pending', 'completed', 'failed'
    amount: Decimal
    error: Optional[str] = None


# =============================================================================
# Abstract Gateway Interface
# =============================================================================

class PaymentGateway(ABC):
    """Abstract payment gateway interface."""

    @abstractmethod
    def init_payment(
        self,
        amount: Decimal,
        description: str,
        order_id: str,
        success_url: str,
        fail_url: str,
    ) -> PaymentInitResult:
        """Initialize a payment and return redirect URL."""
        ...

    @abstractmethod
    def check_status(self, gateway_ref: str) -> PaymentStatusResult:
        """Check the status of a payment."""
        ...

    @abstractmethod
    def refund(self, gateway_ref: str, amount: Decimal) -> bool:
        """Refund a completed payment."""
        ...


# =============================================================================
# Sandbox Gateway (Development/Testing)
# =============================================================================

class SandboxGateway(PaymentGateway):
    """
    Simulates payment flow for development.
    All payments succeed immediately.
    """

    def init_payment(
        self,
        amount: Decimal,
        description: str,
        order_id: str,
        success_url: str,
        fail_url: str,
    ) -> PaymentInitResult:
        ref = f"SANDBOX-{uuid.uuid4().hex[:12].upper()}"
        logger.info(
            f"[SANDBOX] Payment initiated: {amount} TND, "
            f"order={order_id}, ref={ref}"
        )
        separator = '&' if '?' in success_url else '?'
        return PaymentInitResult(
            success=True,
            gateway_ref=ref,
            payment_url=f"{success_url}{separator}ref={ref}&sandbox=1",
        )

    def check_status(self, gateway_ref: str) -> PaymentStatusResult:
        logger.info(f"[SANDBOX] Status check: {gateway_ref} -> completed")
        return PaymentStatusResult(
            gateway_ref=gateway_ref,
            status='completed',
            amount=Decimal('0'),
        )

    def refund(self, gateway_ref: str, amount: Decimal) -> bool:
        logger.info(f"[SANDBOX] Refund: {gateway_ref}, amount={amount} TND")
        return True


# =============================================================================
# Konnect Gateway (Production — Tunisia)
# =============================================================================

class KonnectGateway(PaymentGateway):
    """
    Integration with Konnect.tn payment gateway.
    Docs: https://api.konnect.network/api/v2/
    
    Required settings:
        KONNECT_API_KEY: str
        KONNECT_WALLET_ID: str
        KONNECT_API_URL: str (default: preprod)
    """

    def __init__(self):
        self.api_key = getattr(settings, 'KONNECT_API_KEY', '')
        self.wallet_id = getattr(settings, 'KONNECT_WALLET_ID', '')
        self.api_url = getattr(
            settings, 'KONNECT_API_URL',
            'https://api.preprod.konnect.network/api/v2'
        )
        if not self.api_key:
            logger.warning(
                "KONNECT_API_KEY not configured! "
                "Payment will fail. Set in settings.py or env."
            )

    def init_payment(
        self,
        amount: Decimal,
        description: str,
        order_id: str,
        success_url: str,
        fail_url: str,
    ) -> PaymentInitResult:
        import requests

        # Konnect requires amount in millimes (1 TND = 1000 millimes)
        amount_millimes = int(amount * 1000)

        payload = {
            "receiverWalletId": self.wallet_id,
            "token": "TND",
            "amount": amount_millimes,
            "type": "immediate",
            "description": description,
            "acceptedPaymentMethods": ["wallet", "bank_card", "e-DINAR"],
            "lifespan": 30,  # 30 minutes
            "checkoutForm": True,
            "addPaymentFeesToAmount": False,
            "orderId": order_id,
            "silentWebhook": True,
            "successUrl": success_url,
            "failUrl": fail_url,
            "theme": "light",
        }

        try:
            response = requests.post(
                f"{self.api_url}/payments/init-payment",
                json=payload,
                headers={
                    "x-api-key": self.api_key,
                    "Content-Type": "application/json",
                },
                timeout=15,
            )
            response.raise_for_status()
            data = response.json()

            gateway_ref = data.get("paymentRef", "")
            payment_url = data.get("payUrl", "")

            logger.info(
                f"[KONNECT] Payment initiated: {amount} TND, "
                f"order={order_id}, ref={gateway_ref}"
            )

            return PaymentInitResult(
                success=True,
                gateway_ref=gateway_ref,
                payment_url=payment_url,
            )

        except requests.RequestException as e:
            logger.error(f"[KONNECT] Init payment failed: {e}")
            return PaymentInitResult(
                success=False,
                gateway_ref="",
                payment_url="",
                error=str(e),
            )

    def check_status(self, gateway_ref: str) -> PaymentStatusResult:
        import requests

        try:
            response = requests.get(
                f"{self.api_url}/payments/{gateway_ref}",
                headers={"x-api-key": self.api_key},
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()

            payment = data.get("payment", {})
            konnect_status = payment.get("status", "pending")

            # Map Konnect status to our internal status
            status_map = {
                "completed": "completed",
                "pending": "pending",
                "failed": "failed",
            }
            internal_status = status_map.get(konnect_status, "pending")

            amount = Decimal(str(payment.get("amount", 0))) / 1000  # millimes -> TND

            return PaymentStatusResult(
                gateway_ref=gateway_ref,
                status=internal_status,
                amount=amount,
            )

        except requests.RequestException as e:
            logger.error(f"[KONNECT] Status check failed: {e}")
            return PaymentStatusResult(
                gateway_ref=gateway_ref,
                status="pending",
                amount=Decimal("0"),
                error=str(e),
            )

    def refund(self, gateway_ref: str, amount: Decimal) -> bool:
        # Konnect refunds are handled via dashboard or support
        # API refund endpoint may not be available in all plans
        logger.warning(
            f"[KONNECT] Refund requested for {gateway_ref}, "
            f"amount={amount} TND — requires manual processing via dashboard"
        )
        return False


# =============================================================================
# Factory
# =============================================================================

def get_payment_gateway() -> PaymentGateway:
    """
    Factory function to get the configured payment gateway.
    Reads from settings.PAYMENT_GATEWAY ('SANDBOX' or 'KONNECT').
    """
    gateway_type = getattr(settings, 'PAYMENT_GATEWAY', 'SANDBOX')

    if gateway_type == 'KONNECT':
        return KonnectGateway()
    else:
        return SandboxGateway()
