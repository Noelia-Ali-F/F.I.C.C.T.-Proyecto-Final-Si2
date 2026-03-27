from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.usuarios.permissions import TieneAlgunoDe

from .models import Cotizacion, CotizacionServicioAdicional
from .serializers import CotizacionSerializer, CotizacionCreateSerializer, CotizacionServicioAdicionalSerializer
from .services import calcular_precio_cotizacion, agregar_servicio_adicional, enviar_cotizacion, aceptar_cotizacion


def _es_cliente_portal(user):
    if not user.is_authenticated:
        return False
    if user.is_superuser or user.is_staff:
        return False
    rol = getattr(user, 'rol', None)
    return bool(rol and rol.nombre.lower() == 'cliente')


class CotizacionViewSet(viewsets.ModelViewSet):
    queryset = Cotizacion.objects.select_related(
        'cliente__usuario', 'zona_origen', 'zona_destino', 'tipo_servicio'
    ).prefetch_related('objetos', 'servicios_adicionales_vinculados__servicio_adicional').all().order_by('-creado_en')
    filterset_fields = ('cliente', 'estado', 'zona_origen', 'zona_destino')

    def get_queryset(self):
        qs = Cotizacion.objects.select_related(
            'cliente__usuario', 'zona_origen', 'zona_destino', 'tipo_servicio'
        ).prefetch_related('objetos', 'servicios_adicionales_vinculados__servicio_adicional').order_by('-creado_en')
        u = self.request.user
        if u.is_superuser or u.is_staff:
            return qs
        if _es_cliente_portal(u):
            from apps.clientes.models import Cliente
            try:
                cli = Cliente.objects.get(usuario=u)
                return qs.filter(cliente=cli)
            except Cliente.DoesNotExist:
                return qs.none()
        return qs

    def get_permissions(self):
        u = self.request.user
        if _es_cliente_portal(u):
            if self.action in ('list', 'retrieve', 'create', 'update', 'partial_update'):
                return [IsAuthenticated()]
            return [IsAuthenticated(), TieneAlgunoDe('crm.editar_clientes', 'crm.registro_cliente')]
        if self.action in ('aceptar', 'rechazar'):
            return [IsAuthenticated(), TieneAlgunoDe('crm.pipeline_solicitudes', 'reservas.gestionar')]
        if self.action in ('list', 'retrieve'):
            return [
                IsAuthenticated(),
                TieneAlgunoDe('crm.ver_clientes', 'crm.registro_cliente', 'crm.pipeline_solicitudes'),
            ]
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), TieneAlgunoDe('crm.editar_clientes', 'crm.registro_cliente')]
        if self.action in ('calcular_precio', 'agregar_servicio'):
            return [IsAuthenticated(), TieneAlgunoDe('crm.editar_clientes', 'crm.registro_cliente')]
        return [IsAuthenticated(), TieneAlgunoDe('crm.ver_clientes', 'crm.registro_cliente')]

    def get_serializer_class(self):
        if self.action == 'create':
            return CotizacionCreateSerializer
        return CotizacionSerializer

    def perform_create(self, serializer):
        if _es_cliente_portal(self.request.user):
            from apps.clientes.models import Cliente
            try:
                cli = Cliente.objects.get(usuario=self.request.user)
            except Cliente.DoesNotExist:
                raise ValidationError({'cliente': 'Usuario sin perfil de cliente.'})
            cotizacion = serializer.save(cliente=cli)
        else:
            cotizacion = serializer.save()
        calcular_precio_cotizacion(cotizacion)

    @action(detail=True, methods=['post'])
    def calcular_precio(self, request, pk=None):
        """Recalcula el precio de la cotización."""
        cotizacion = self.get_object()
        resultado = calcular_precio_cotizacion(cotizacion)
        return Response(resultado)

    @action(detail=True, methods=['post'])
    def enviar(self, request, pk=None):
        """Envía la cotización al cliente (Fase 3). El operador puede especificar el precio final."""
        from decimal import Decimal
        cotizacion = self.get_object()
        precio_final = request.data.get('precio_final')
        if precio_final:
            precio_final = Decimal(str(precio_final))
        cotizacion_actualizada = enviar_cotizacion(cotizacion, precio_final)
        return Response(CotizacionSerializer(cotizacion_actualizada).data)

    @action(detail=True, methods=['post'])
    def aceptar(self, request, pk=None):
        """Cliente acepta la cotización y genera reserva automáticamente (Fase 3)."""
        from apps.reservas.serializers import ReservaSerializer
        cotizacion = self.get_object()
        reserva = aceptar_cotizacion(cotizacion)
        return Response({
            'cotizacion': CotizacionSerializer(cotizacion).data,
            'reserva': ReservaSerializer(reserva).data
        })

    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        """Marca la cotización como rechazada."""
        cotizacion = self.get_object()
        cotizacion.estado = 'rechazada'
        cotizacion.save(update_fields=['estado'])
        return Response(CotizacionSerializer(cotizacion).data)

    @action(detail=True, methods=['post'], url_path='agregar-servicio')
    def agregar_servicio(self, request, pk=None):
        """Agrega un servicio adicional a la cotización. Body: {servicio_adicional: id, cantidad: 1}"""
        servicio_id = request.data.get('servicio_adicional')
        if not servicio_id:
            return Response({'error': 'servicio_adicional es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        cantidad = int(request.data.get('cantidad', 1))
        try:
            csa = agregar_servicio_adicional(int(pk), int(servicio_id), cantidad)
            return Response(CotizacionServicioAdicionalSerializer(csa).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CotizacionServicioAdicionalViewSet(viewsets.ModelViewSet):
    queryset = CotizacionServicioAdicional.objects.select_related('cotizacion', 'servicio_adicional').all()
    serializer_class = CotizacionServicioAdicionalSerializer
    filterset_fields = ('cotizacion',)
