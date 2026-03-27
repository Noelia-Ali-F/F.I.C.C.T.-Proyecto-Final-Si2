from .base import *

DEBUG = True

# Almacenamiento local en desarrollo
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# Email a consola en desarrollo
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Logging detallado
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {'handlers': ['console'], 'level': 'INFO'},
    'loggers': {
        'django.db.backends': {'level': 'WARNING'},
    },
}
