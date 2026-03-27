from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Notificacion
from .serializers import NotificacionSerializer


class NotificacionViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacionSerializer
    queryset = Notificacion.objects.none()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Notificacion.objects.none()
        return Notificacion.objects.filter(usuario=self.request.user).order_by('-creado_en')

    @action(detail=False, methods=['get'])
    def no_leidas(self, request):
        """Lista notificaciones no leídas del usuario."""
        qs = self.get_queryset().filter(es_leida=False)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def marcar_leida(self, request, pk=None):
        """Marca la notificación como leída."""
        notif = self.get_object()
        notif.es_leida = True
        notif.leida_en = timezone.now()
        notif.save()
        return Response(NotificacionSerializer(notif).data)
