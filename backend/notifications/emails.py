"""
Email Service — Transporti
Centralized transactional email system with HTML templates.

Supports:
- CONSOLE backend (development): prints to terminal
- SMTP backend (production): sends via SendGrid/Gmail/etc.

Usage:
    from notifications.emails import send_transactional_email
    send_transactional_email('offer_received', user, context={...})

Configuration via settings.py:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # dev
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'     # prod
"""
import logging
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger('transporti')

# Default sender
DEFAULT_FROM = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@transporti.tn')


# =============================================================================
# Email Templates Registry
# =============================================================================

EMAIL_TEMPLATES = {
    # ── Job Lifecycle ──
    'offer_received': {
        'subject': '📦 Nouvelle offre reçue — Transporti',
        'template': 'emails/offer_received.html',
    },
    'offer_accepted': {
        'subject': '✅ Votre offre a été acceptée — Transporti',
        'template': 'emails/offer_accepted.html',
    },
    'job_completed': {
        'subject': '🎉 Livraison confirmée — Transporti',
        'template': 'emails/job_completed.html',
    },

    # ── Payment ──
    'payment_received': {
        'subject': '💰 Paiement reçu — Transporti',
        'template': 'emails/payment_received.html',
    },
    'escrow_released': {
        'subject': '💸 Paiement libéré — Transporti',
        'template': 'emails/escrow_released.html',
    },

    # ── Trust & Verification ──
    'verification_approved': {
        'subject': '🛡️ Compte vérifié — Transporti',
        'template': 'emails/verification_approved.html',
    },
    'verification_rejected': {
        'subject': '⚠️ Vérification rejetée — Transporti',
        'template': 'emails/verification_rejected.html',
    },

    # ── Reviews ──
    'review_received': {
        'subject': '⭐ Nouvel avis reçu — Transporti',
        'template': 'emails/review_received.html',
    },

    # ── Disputes ──
    'dispute_opened': {
        'subject': '🔔 Signalement ouvert — Transporti',
        'template': 'emails/dispute_opened.html',
    },
    'dispute_resolved': {
        'subject': '✅ Signalement résolu — Transporti',
        'template': 'emails/dispute_resolved.html',
    },

    # ── Auth ──
    'welcome': {
        'subject': '🚀 Bienvenue sur Transporti !',
        'template': 'emails/welcome.html',
    },

    # ── Account ──
    'password_reset': {
        'subject': '🔑 Réinitialisation de votre mot de passe — Transporti',
        'template': 'emails/password_reset.html',
    },
    # Mot de passe temporaire fixé par un administrateur (back-office).
    'admin_password_reset': {
        'subject': '🔑 Votre nouveau mot de passe temporaire — Transporti',
        'template': 'emails/admin_password_reset.html',
    },
    'account_warning': {
        'subject': '⚠️ Avertissement concernant votre compte — Transporti',
        'template': 'emails/account_warning.html',
    },
}


# =============================================================================
# Core Send Function
# =============================================================================

def send_transactional_email(
    template_key: str,
    recipient_email: str,
    context: dict = None,
    recipient_name: str = '',
) -> bool:
    """
    Send a transactional email using a registered template.

    Args:
        template_key: Key from EMAIL_TEMPLATES registry
        recipient_email: Destination email address
        context: Template context variables
        recipient_name: Recipient name for personalization

    Returns:
        True if email sent successfully, False otherwise
    """
    if template_key not in EMAIL_TEMPLATES:
        logger.error(f"Unknown email template: {template_key}")
        return False

    template_config = EMAIL_TEMPLATES[template_key]
    ctx = {
        'recipient_name': recipient_name or 'Utilisateur',
        'platform_name': 'Transporti',
        'platform_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:3000'),
        'support_email': 'support@transporti.tn',
        **(context or {}),
    }

    try:
        # Try to render HTML template
        html_message = render_to_string(template_config['template'], ctx)
        plain_message = strip_tags(html_message)
    except Exception:
        # Fallback: use a simple text-based email
        plain_message = _build_fallback_text(template_key, ctx)
        html_message = _build_fallback_html(template_key, ctx)

    try:
        sent = send_mail(
            subject=template_config['subject'],
            message=plain_message,
            from_email=DEFAULT_FROM,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(
            # Ni adresse ni sujet : les journaux ne portent pas de donnée personnelle.
            f"EMAIL_SENT: template={template_key}"
        )
        return sent > 0
    except Exception as e:
        logger.error(
            # Type seul : le texte de l'exception porte l'adresse du destinataire
            # (SMTPRecipientsRefused), donnée personnelle hors des journaux.
            f"EMAIL_FAILED: template={template_key}, error={type(e).__name__}"
        )
        return False


# =============================================================================
# Convenience Functions (called from services/signals)
# =============================================================================

def notify_offer_received(job, offer):
    """Notify job owner that a new offer was received."""
    send_transactional_email(
        'offer_received',
        recipient_email=job.owner.email,
        recipient_name=job.owner.first_name,
        context={
            'job_id': job.id,
            'job_description': job.description[:100],
            'offer_price': str(offer.total_price),
            'transporter_name': offer.transporter.get_full_name(),
        },
    )


def notify_offer_accepted(offer):
    """Notify transporter that their offer was accepted."""
    send_transactional_email(
        'offer_accepted',
        recipient_email=offer.transporter.email,
        recipient_name=offer.transporter.first_name,
        context={
            'job_id': offer.job.id,
            'offer_price': str(offer.total_price),
            'pickup_address': offer.job.pickup_address,
            'dropoff_address': offer.job.dropoff_address,
        },
    )


def notify_job_completed(job):
    """Notify the client that the job is completed."""
    # Le vrai client : sur un trajet retour, job.owner est le transporteur.
    from logistics.participants import get_job_client
    client = get_job_client(job)
    if client is None:
        return
    send_transactional_email(
        'job_completed',
        recipient_email=client.email,
        recipient_name=client.first_name,
        context={'job_id': job.id, 'role': 'client'},
    )


def send_password_reset_notification(user, temp_password: str) -> bool:
    """
    Envoie à l'utilisateur le mot de passe temporaire fixé par un admin.

    C'est le SEUL canal par lequel ce mot de passe sort hors DEBUG : la vue
    ne le renvoie pas dans sa réponse. Il n'est jamais écrit dans les journaux
    (send_transactional_email ne journalise que le gabarit et l'adresse).
    """
    return send_transactional_email(
        'admin_password_reset',
        recipient_email=user.email,
        recipient_name=user.first_name,
        context={'temp_password': temp_password},
    )


def send_warning_email(user, reason: str) -> bool:
    """Prévient l'utilisateur d'un avertissement émis par la modération."""
    return send_transactional_email(
        'account_warning',
        recipient_email=user.email,
        recipient_name=user.first_name,
        context={'reason': reason},
    )


def notify_verification_status(user, approved: bool, reason: str = ''):
    """Notify transporter about verification result."""
    template = 'verification_approved' if approved else 'verification_rejected'
    send_transactional_email(
        template,
        recipient_email=user.email,
        recipient_name=user.first_name,
        context={'reason': reason},
    )


def notify_welcome(user):
    """Send welcome email on registration."""
    send_transactional_email(
        'welcome',
        recipient_email=user.email,
        recipient_name=user.first_name,
        context={'role': getattr(user, 'role', 'CLIENT')},
    )


# =============================================================================
# Fallback Templates (when HTML templates are not found)
# =============================================================================

def _build_fallback_text(template_key: str, ctx: dict) -> str:
    """Simple text fallback when HTML template is missing."""
    name = ctx.get('recipient_name', 'Utilisateur')
    lines = [
        f"Bonjour {name},",
        "",
        _get_fallback_body(template_key, ctx),
        "",
        "Cordialement,",
        f"L'équipe {ctx.get('platform_name', 'Transporti')}",
        "",
        f"Support : {ctx.get('support_email', 'support@transporti.tn')}",
    ]
    return "\n".join(lines)


def _build_fallback_html(template_key: str, ctx: dict) -> str:
    """Simple HTML fallback when template file is missing."""
    name = ctx.get('recipient_name', 'Utilisateur')
    body = _get_fallback_body(template_key, ctx)
    platform = ctx.get('platform_name', 'Transporti')
    url = ctx.get('platform_url', '#')

    return f"""
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">
        <div style="background:linear-gradient(135deg,#1e40af,#10b981);padding:24px;text-align:center;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:24px;">{platform}</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">Logistique simplifiée</p>
        </div>
        <div style="padding:32px 24px;background:white;border:1px solid #e5e7eb;border-top:0;">
            <p style="font-size:16px;">Bonjour <strong>{name}</strong>,</p>
            <p style="font-size:15px;line-height:1.6;color:#555;">{body}</p>
            <div style="text-align:center;margin:24px 0;">
                <a href="{url}" style="display:inline-block;background:#1e40af;color:white;
                    padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">
                    Accéder à Transporti
                </a>
            </div>
        </div>
        <div style="padding:16px 24px;background:#f9fafb;text-align:center;border-radius:0 0 12px 12px;
            border:1px solid #e5e7eb;border-top:0;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">
                © 2026 {platform} · support@transporti.tn
            </p>
        </div>
    </div>
    """


def _get_fallback_body(template_key: str, ctx: dict) -> str:
    """Get the body text for a given template key."""
    bodies = {
        'offer_received': f"Vous avez reçu une nouvelle offre de {ctx.get('offer_price', '—')} TND "
                          f"pour votre demande de transport #{ctx.get('job_id', '')}.",
        'offer_accepted': f"Votre offre de {ctx.get('offer_price', '—')} TND a été acceptée ! "
                          f"Préparez-vous pour le transport #{ctx.get('job_id', '')}.",
        'job_completed': "Votre transport a été complété avec succès. "
                         "N'oubliez pas de laisser un avis !",
        'payment_received': "Votre paiement a été reçu et placé en séquestre.",
        'escrow_released': "Le paiement a été libéré au transporteur.",
        'verification_approved': "Votre compte a été vérifié avec succès ! "
                                 "Vous pouvez maintenant recevoir des missions.",
        'verification_rejected': f"Votre vérification a été rejetée. "
                                 f"Raison : {ctx.get('reason', 'Documents non conformes')}.",
        'review_received': "Vous avez reçu un nouvel avis sur votre profil.",
        'dispute_opened': "Un signalement a été ouvert concernant votre transport.",
        'dispute_resolved': "Le signalement a été résolu par notre équipe.",
        'welcome': "Bienvenue sur Transporti ! Votre compte a été créé avec succès.",
        # Le lien est dans le corps du message et non uniquement sur le bouton
        # « Accéder à Transporti » du gabarit de repli, sinon l'utilisateur
        # arrive sur l'accueil sans jeton et le parcours est cassé.
        'password_reset': (
            "Vous avez demandé la réinitialisation de votre mot de passe.\n\n"
            f"Depuis un ordinateur : {ctx.get('reset_link', '')}\n"
            + (
                f"Depuis l'application mobile : {ctx.get('mobile_link', '')}\n"
                if ctx.get('mobile_link') else ''
            )
            + "\nCe lien est valable 24 heures et ne peut servir qu'une fois. "
            "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : "
            "votre mot de passe reste inchangé."
        ),
        'admin_password_reset': (
            "Un administrateur de Transporti a réinitialisé votre mot de passe.\n\n"
            f"Mot de passe temporaire : {ctx.get('temp_password', '')}\n\n"
            "Connectez-vous avec ce mot de passe puis changez-le tout de suite "
            "depuis votre profil. Si vous n'avez rien demandé, contactez le support."
        ),
        'account_warning': (
            "Notre équipe de modération vous adresse un avertissement.\n\n"
            f"Motif : {ctx.get('reason', '')}\n\n"
            "En cas de récidive, votre compte pourra être suspendu."
        ),
    }
    return bodies.get(template_key, "Vous avez une nouvelle notification.")
