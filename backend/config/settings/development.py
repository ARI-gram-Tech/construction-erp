from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ['*']

# Loosen CORS in dev so the Vite dev server always works
CORS_ALLOW_ALL_ORIGINS = True

# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'