from django.db import models
from apps.usuarios.models import Usuario


class Notificacion(models.Model):
    CANALES = [('push', 'Push'), ('email', 'Email'), ('sms', 'SMS'), ('sistema', 'Sistema')]

    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.CharField(max_length=30)
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    canal = models.CharField(max_length=20, choices=CANALES)
    datos_extra = models.JSONField(default=dict, blank=True)
    es_leida = models.BooleanField(default=False)
    enviada_en = models.DateTimeField(null=True, blank=True)
    leida_en = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notificaciones'
        ordering = ['-creado_en']
