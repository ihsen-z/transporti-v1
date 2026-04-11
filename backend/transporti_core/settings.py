"""
Django settings for transporti_core project.
Production-hardened configuration with environment variable support.
"""
import os
from decimal import Decimal
from pathlib import Path
from datetime import timedelta

# Load environment from .env file if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, use system env vars

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# =============================================================================
# SECURITY SETTINGS
# =============================================================================

# SECURITY: Load from environment variable, fail if not set in production
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-dev-only-replace-in-production')

# SECURITY: Separate JWT signing key
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)

# SECURITY: Debug mode - defaults to False for production safety
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')

# SECURITY: Environment detection
ENV = os.environ.get('ENV', os.environ.get('DJANGO_ENV', 'development')).lower()
IS_PRODUCTION = ENV in ('production', 'prod', 'live')

# SECURITY: Allowed hosts from environment
ALLOWED_HOSTS = [
    h.strip() for h in 
    os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
    if h.strip()
]


# =============================================================================
# PRODUCTION SECURITY FLAGS
# =============================================================================

if IS_PRODUCTION:
    # Force HTTPS in production
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    
    # Secure cookies
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    
    # HSTS (1 year)
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    
    # Content security
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
else:
    # Development defaults
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    SECURE_HSTS_SECONDS = 0


# =============================================================================
# APPLICATION DEFINITION
# =============================================================================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third Party
    'rest_framework',
    'corsheaders',
    'drf_spectacular',

    # Transporti V1 Modules
    'users',
    'trust',
    'logistics',
    'payments',
    'reviews',
    'support',
    'notifications',
    'messaging',
    'analytics',
    'realtime_api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'analytics.middleware.PresenceMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'transporti_core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'transporti_core.wsgi.application'


# =============================================================================
# DATABASE
# =============================================================================

# Database: PostgreSQL via DATABASE_URL (Docker) or SQLite fallback for dev
_db_url = os.environ.get('DATABASE_URL', '')
if _db_url:
    # Parse DATABASE_URL: postgres://user:password@host:port/dbname
    import re
    _match = re.match(
        r'postgres(?:ql)?://(?P<user>[^:]+):(?P<password>[^@]+)@(?P<host>[^:]+):(?P<port>\d+)/(?P<name>.+)',
        _db_url
    )
    if _match:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': _match.group('name'),
                'USER': _match.group('user'),
                'PASSWORD': _match.group('password'),
                'HOST': _match.group('host'),
                'PORT': _match.group('port'),
                'CONN_MAX_AGE': 600,  # Connection pooling: 10 min
                'OPTIONS': {
                    'connect_timeout': 5,
                },
            }
        }
    else:
        raise ValueError(f"Cannot parse DATABASE_URL: {_db_url}")
else:
    # SQLite fallback for local dev without Docker
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


# =============================================================================
# PASSWORD VALIDATION
# =============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# =============================================================================
# INTERNATIONALIZATION
# =============================================================================

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Tunis'
USE_I18N = True
USE_TZ = True


# =============================================================================
# STATIC FILES
# =============================================================================

STATIC_URL = 'static/'


# =============================================================================
# MEDIA FILES (User uploads: photos, documents)
# =============================================================================

MEDIA_ROOT = BASE_DIR / 'media'
MEDIA_URL = '/media/'

# Max upload size: 10 MB (allows 5 MB images with overhead)
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024


# =============================================================================
# DEFAULT PRIMARY KEY
# =============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# =============================================================================
# AUTH
# =============================================================================

AUTH_USER_MODEL = 'users.User'


# =============================================================================
# REST FRAMEWORK
# =============================================================================

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    # Pagination: prevent unbounded responses
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    # API Throttling for rate limiting
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'auth': '10/minute',        # Login/register rate limit
        'admin_auth': '5/10m',      # Admin login - strict rate limit (5 per 10 min)
        'booking': '20/minute',     # Offer/job creation rate limit
        'payment': '10/minute',     # Payment actions rate limit
    },
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Transporti V1 API',
    'DESCRIPTION': 'Modular Monolith API for Transporti Tunisia',
    'VERSION': '1.0.0',
    'COMPONENT_SPLIT_REQUEST': True,
    'SERVE_INCLUDE_SCHEMA': False,
    'ENUM_NAME_OVERRIDES': {},
    # Gracefully handle serializer introspection issues
    'POSTPROCESSING_HOOKS': [
        'drf_spectacular.hooks.postprocess_schema_enums',
    ],
}


# =============================================================================
# CORS (Production-safe configuration)
# =============================================================================

# Load from environment, with safe defaults
_cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://localhost:5173')
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]
CORS_ALLOW_CREDENTIALS = True


# =============================================================================
# JWT CONFIGURATION
# =============================================================================

# User token lifetimes
USER_ACCESS_TOKEN_LIFETIME = timedelta(minutes=30)
USER_REFRESH_TOKEN_LIFETIME = timedelta(days=7)

# Admin token lifetimes (shorter for security)
ADMIN_ACCESS_TOKEN_LIFETIME = timedelta(minutes=15)
ADMIN_REFRESH_TOKEN_LIFETIME = timedelta(hours=1)

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': USER_ACCESS_TOKEN_LIFETIME,
    'REFRESH_TOKEN_LIFETIME': USER_REFRESH_TOKEN_LIFETIME,
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': JWT_SECRET_KEY,  # Separate from Django SECRET_KEY
    
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    
    'TOKEN_OBTAIN_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenObtainPairSerializer',
}


# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'transporti.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'transporti': {
            'handlers': ['console', 'file'] if not DEBUG else ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'payments': {
            'handlers': ['console', 'file'] if not DEBUG else ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'support': {
            'handlers': ['console', 'file'] if not DEBUG else ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Create logs directory if it doesn't exist
(BASE_DIR / 'logs').mkdir(exist_ok=True)


# =============================================================================
# COMMISSION CONFIGURATION (Single Source of Truth)
# =============================================================================

# Commission rates by job type - ONLY modify here
COMMISSION_RATES = {
    'TRANSPORT': 0.12,  # 12%
    'MOVING': 0.15,     # 15%
    'DEFAULT': 0.12,    # Fallback rate
}


# =============================================================================
# PAYMENT GATEWAY CONFIGURATION
# =============================================================================

# Gateway mode: 'SANDBOX' (development) or 'KONNECT' (production)
PAYMENT_GATEWAY = os.environ.get('PAYMENT_GATEWAY', 'SANDBOX')

# Konnect.tn settings (Tunisia's main payment gateway)
KONNECT_API_KEY = os.environ.get('KONNECT_API_KEY', '')
KONNECT_WALLET_ID = os.environ.get('KONNECT_WALLET_ID', '')
KONNECT_API_URL = os.environ.get(
    'KONNECT_API_URL',
    'https://api.preprod.konnect.network/api/v2'
)

# COD threshold — above this amount, digital payment is mandatory
COD_MAX_AMOUNT = Decimal(os.environ.get('COD_MAX_AMOUNT', '300'))


# =============================================================================
# EMAIL CONFIGURATION
# =============================================================================

# Default: console backend (prints to terminal in dev)
# Production: set EMAIL_BACKEND to smtp and configure SendGrid/Gmail
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend'
)

# SMTP settings (for production with SendGrid)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.sendgrid.net')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'apikey')
EMAIL_HOST_PASSWORD = os.environ.get('SENDGRID_API_KEY', '')

DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@transporti.tn')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')


# =============================================================================
# STARTUP SECURITY VALIDATION
# =============================================================================
# This MUST be at the end of settings.py to validate all settings are loaded

# Only run validation when Django is actually starting (not during migrations, etc.)
import sys
if 'runserver' in sys.argv or 'gunicorn' in sys.argv[0] if sys.argv else False or IS_PRODUCTION:
    try:
        from transporti_core.security_validator import validate_production_security, validate_jwt_settings
        validate_production_security()
        validate_jwt_settings()
    except ImportError:
        # Validator not yet available (first migrations, etc.)
        pass

