"""
Security Validator - Transporti V1
Startup security checks to prevent running with unsafe settings.

RULES:
- System MUST refuse to start on misconfiguration
- No silent fallbacks
- All failures logged as SECURITY_BOOT_FAILURE
"""
import os
import sys
import logging

logger = logging.getLogger('transporti.security')


class SecurityBootError(Exception):
    """Raised when security validation fails at startup."""
    pass


INSECURE_SECRET_KEY_PATTERNS = [
    'django-insecure',
    'dev-only',
    'change-me',
    'replace-in-production',
    'secret-key-here',
    'your-secret-key',
]


def validate_production_security():
    """
    Validate security settings at Django startup.
    
    MUST be called from settings.py or apps.py ready().
    
    Raises:
        SecurityBootError: If any security check fails in production
    """
    from django.conf import settings
    
    env = os.environ.get('ENV', os.environ.get('DJANGO_ENV', 'development')).lower()
    is_production = env in ('production', 'prod', 'live')
    
    errors = []
    
    # =========================================================================
    # 1. SECRET_KEY VALIDATION
    # =========================================================================
    secret_key = getattr(settings, 'SECRET_KEY', '')
    
    # Check if SECRET_KEY is missing
    if not secret_key:
        errors.append("SECRET_KEY is not set")
    
    # Check for insecure patterns
    secret_lower = secret_key.lower()
    for pattern in INSECURE_SECRET_KEY_PATTERNS:
        if pattern in secret_lower:
            errors.append(f"SECRET_KEY contains insecure pattern: '{pattern}'")
            break
    
    # Check minimum length
    if len(secret_key) < 50:
        errors.append(f"SECRET_KEY is too short ({len(secret_key)} chars). Minimum 50 characters required.")
    
    # =========================================================================
    # 2. DEBUG MODE VALIDATION
    # =========================================================================
    debug = getattr(settings, 'DEBUG', False)
    
    if is_production and debug:
        errors.append("DEBUG=True is not allowed in production environment")
    
    # =========================================================================
    # 3. ALLOWED_HOSTS VALIDATION
    # =========================================================================
    allowed_hosts = getattr(settings, 'ALLOWED_HOSTS', [])
    
    if is_production:
        if not allowed_hosts:
            errors.append("ALLOWED_HOSTS is empty in production")
        elif '*' in allowed_hosts:
            errors.append("ALLOWED_HOSTS contains '*' wildcard in production")
        elif allowed_hosts == ['localhost', '127.0.0.1']:
            errors.append("ALLOWED_HOSTS only contains localhost in production")
    
    # =========================================================================
    # 4. JWT SECRET VALIDATION
    # =========================================================================
    jwt_secret = getattr(settings, 'JWT_SECRET_KEY', secret_key)
    
    if is_production and jwt_secret == secret_key:
        # Warning but not blocking - separate key is recommended but not required
        logger.warning(
            "SECURITY_WARNING: JWT_SECRET_KEY is same as SECRET_KEY. "
            "Consider using a separate key for JWT signing."
        )
    
    # =========================================================================
    # 5. SSL/TLS VALIDATION (Production Only)
    # =========================================================================
    if is_production:
        if not getattr(settings, 'SECURE_SSL_REDIRECT', False):
            errors.append("SECURE_SSL_REDIRECT is not enabled in production")
        
        if not getattr(settings, 'SESSION_COOKIE_SECURE', False):
            errors.append("SESSION_COOKIE_SECURE is not enabled in production")
        
        if not getattr(settings, 'CSRF_COOKIE_SECURE', False):
            errors.append("CSRF_COOKIE_SECURE is not enabled in production")
    
    # =========================================================================
    # FAIL HARD IF ERRORS
    # =========================================================================
    if errors:
        error_list = '\n  - '.join(errors)
        full_message = (
            f"\n{'='*60}\n"
            f"SECURITY BOOT FAILURE - SYSTEM REFUSED TO START\n"
            f"{'='*60}\n"
            f"Environment: {env}\n"
            f"Errors:\n  - {error_list}\n"
            f"{'='*60}\n"
        )
        
        logger.critical(
            f"SECURITY_BOOT_FAILURE: env={env}, errors={errors}"
        )
        
        # Print to stderr for visibility
        print(full_message, file=sys.stderr)
        
        raise SecurityBootError(full_message)
    
    # Success logging
    logger.info(
        f"SECURITY_BOOT_SUCCESS: env={env}, debug={debug}, "
        f"hosts={len(allowed_hosts)}, ssl_redirect={getattr(settings, 'SECURE_SSL_REDIRECT', False)}"
    )


def validate_jwt_settings():
    """Validate JWT configuration settings."""
    from django.conf import settings
    from datetime import timedelta
    
    jwt_settings = getattr(settings, 'SIMPLE_JWT', {})
    
    access_lifetime = jwt_settings.get('ACCESS_TOKEN_LIFETIME', timedelta(minutes=30))
    refresh_lifetime = jwt_settings.get('REFRESH_TOKEN_LIFETIME', timedelta(days=1))
    
    # Warn on excessively long token lifetimes
    if access_lifetime > timedelta(hours=1):
        logger.warning(
            f"SECURITY_WARNING: ACCESS_TOKEN_LIFETIME is {access_lifetime}. "
            "Consider reducing to 30 minutes or less."
        )
    
    if refresh_lifetime > timedelta(days=7):
        logger.warning(
            f"SECURITY_WARNING: REFRESH_TOKEN_LIFETIME is {refresh_lifetime}. "
            "Consider reducing to 7 days or less."
        )
    
    logger.debug(
        f"JWT_CONFIG_VALIDATED: access={access_lifetime}, refresh={refresh_lifetime}"
    )
