from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.usuarios.permissions import TieneAlgunoDe
from .models import MetodoPago, Pago, Factura, Reembolso
from .serializers import MetodoPagoSerializer, PagoSerializer, PagoCreateSerializer, FacturaSerializer, ReembolsoSerializer
from .services import PagoService


class MetodoPagoViewSet(viewsets.ModelViewSet):
    queryset = MetodoPago.objects.filter(es_activo=True)
    serializer_class = MetodoPagoSerializer


class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pago.objects.select_related('reserva', 'metodo_pago').all().order_by('-creado_en')
    filterset_fields = ('reserva', 'estado', 'metodo_pago')

    def get_serializer_class(self):
        if self.action == 'create':
            return PagoCreateSerializer
        return PagoSerializer

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, TieneAlgunoDe('pagos.verificar', 'pagos.gestionar')])
    def verificar(self, request, pk=None):
        """Verifica un pago pendiente (Fase 4 del flujo)"""
        pago = self.get_object()
        if pago.estado != 'pendiente':
            return Response(
                {'error': 'Solo se pueden verificar pagos pendientes'},
                status=status.HTTP_400_BAD_REQUEST
            )
        pago_verificado = PagoService.verificar_pago(pago, request.user)
        return Response(PagoSerializer(pago_verificado).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, TieneAlgunoDe('pagos.rechazar', 'pagos.gestionar')])
    def rechazar(self, request, pk=None):
        """Rechaza un pago pendiente"""
        pago = self.get_object()
        pago.estado = 'fallido'
        pago.save(update_fields=['estado'])
        return Response(PagoSerializer(pago).data)


class FacturaViewSet(viewsets.ModelViewSet):
    queryset = Factura.objects.select_related('cliente', 'pago').all()
    serializer_class = FacturaSerializer
    filterset_fields = ('cliente',)


class ReembolsoViewSet(viewsets.ModelViewSet):
    queryset = Reembolso.objects.select_related('pago').all().order_by('-creado_en')
    serializer_class = ReembolsoSerializer
    filterset_fields = ('pago', 'estado')
