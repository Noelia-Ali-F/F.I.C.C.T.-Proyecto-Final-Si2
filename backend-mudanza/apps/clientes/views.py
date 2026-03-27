from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from apps.usuarios.permissions import TieneAlgunoDe, TienePermiso

from .models import SegmentoCliente, Cliente, ComunicacionCliente, AlertaCliente
from .serializers import (
    SegmentoClienteSerializer,
    ClienteSerializer,
    ComunicacionClienteSerializer,
    AlertaClienteSerializer,
)
from .services_lealtad import ejecutar_prediccion_lealtad_todos


def _perm_cliente_staff():
    return [IsAuthenticated(), TieneAlgunoDe('crm.ver_clientes', 'crm.registro_cliente', 'crm.historial_mudanzas')]


def _perm_cliente_escritura():
    return [IsAuthenticated(), TieneAlgunoDe('crm.editar_clientes', 'crm.registro_cliente')]


class SegmentoClienteViewSet(viewsets.ModelViewSet):
    """W13 — Segmentación (solo administración CRM estratégica)."""
    queryset = SegmentoCliente.objects.all().order_by('nombre')
    serializer_class = SegmentoClienteSerializer

    def get_permissions(self):
        return [IsAuthenticated(), TienePermiso('crm.segmentacion')]


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.select_related('usuario').all().order_by('-creado_en')
    serializer_class = ClienteSerializer
    search_fields = ('usuario__nombre', 'usuario__apellido', 'usuario__email', 'nombre_empresa', 'nit')
    filterset_fields = ('tipo_cliente',)

    def get_permissions(self):
        if self.action == 'historial':
            return [IsAuthenticated(), TieneAlgunoDe('crm.historial_mudanzas', 'crm.ver_clientes', 'crm.registro_cliente')]
        if self.action == 'destroy':
            return [IsAuthenticated(), TienePermiso('crm.eliminar_cliente')]
        if self.action in ('list', 'retrieve'):
            return _perm_cliente_staff()
        return _perm_cliente_escritura()

    @extend_schema(summary='Historial de mudanzas y solicitudes del cliente (W10)')
    @action(detail=True, methods=['get'], url_path='historial')
    def historial(self, request, pk=None):
        cliente = self.get_object()
        cotizaciones = []
        for c in cliente.cotizaciones.all().order_by('-creado_en')[:80]:
            cotizaciones.append({
                'id': c.id,
                'tipo': 'cotizacion',
                'estado': c.estado,
                'precio_total': str(c.precio_total_calculado),
                'direccion_origen': c.direccion_origen[:200],
                'direccion_destino': c.direccion_destino[:200],
                'tipo_servicio': c.tipo_servicio.nombre if c.tipo_servicio_id else None,
                'fecha': c.creado_en.isoformat(),
            })
        reservas = []
        for r in cliente.reservas.select_related('cotizacion').all().order_by('-fecha_servicio')[:80]:
            srv = getattr(r, 'servicio', None)
            reservas.append({
                'id': r.id,
                'tipo': 'reserva',
                'codigo': r.codigo_confirmacion,
                'estado': r.estado,
                'fecha_servicio': str(r.fecha_servicio),
                'franja_horaria': r.franja_horaria,
                'mudanza_estado': srv.estado if srv else None,
                'creado_en': r.creado_en.isoformat(),
            })
        comunicaciones = list(
            cliente.comunicaciones.all().order_by('-creado_en')[:30].values(
                'id', 'canal', 'asunto', 'direccion', 'creado_en'
            )
        )
        return Response({
            'cliente_id': cliente.id,
            'usuario_nombre': cliente.usuario.nombre_completo,
            'cotizaciones': cotizaciones,
            'reservas': reservas,
            'comunicaciones_resumen': comunicaciones,
            'totales': {
                'cotizaciones': cliente.cotizaciones.count(),
                'reservas': cliente.reservas.count(),
                'mudanzas_completadas': cliente.reservas.filter(estado='completada').count(),
            },
        })


class ComunicacionClienteViewSet(viewsets.ModelViewSet):
    """W12 — Bitácora de comunicaciones."""
    queryset = ComunicacionCliente.objects.select_related('cliente', 'operador').all().order_by('-creado_en')
    serializer_class = ComunicacionClienteSerializer
    filterset_fields = ('cliente', 'canal', 'direccion')

    def get_permissions(self):
        return [IsAuthenticated(), TienePermiso('crm.log_comunicaciones')]

    def perform_create(self, serializer):
        serializer.save(operador=self.request.user)


class AlertaClienteViewSet(viewsets.ModelViewSet):
    """W14 — Alertas y seguimiento a leads/clientes."""
    queryset = AlertaCliente.objects.select_related('cliente', 'operador').all().order_by('fecha_programada')
    serializer_class = AlertaClienteSerializer
    filterset_fields = ('cliente', 'tipo', 'estado')

    def get_permissions(self):
        return [IsAuthenticated(), TienePermiso('crm.alertas_seguimiento')]

    def perform_create(self, serializer):
        serializer.save(operador=self.request.user)


class CrmPipelineView(APIView):
    """W11 — Conteos por estado (cotizaciones + reservas) para tablero tipo pipeline."""

    def get_permissions(self):
        return [
            IsAuthenticated(),
            TieneAlgunoDe('crm.pipeline_solicitudes', 'reservas.gestionar', 'crm.ver_clientes'),
        ]

    @extend_schema(summary='Pipeline CRM: conteos por estado')
    def get(self, request):
        from apps.cotizaciones.models import Cotizacion
        from apps.reservas.models import Reserva

        cot_counts = dict(
            Cotizacion.objects.values('estado').annotate(n=Count('id')).values_list('estado', 'n')
        )
        res_counts = dict(
            Reserva.objects.values('estado').annotate(n=Count('id')).values_list('estado', 'n')
        )
        return Response({
            'cotizaciones_por_estado': cot_counts,
            'reservas_por_estado': res_counts,
            'etapas_reserva_sugeridas': ['pendiente', 'confirmada', 'completada'],
        })


class CrmComportamientoView(APIView):
    """W16 — Datos agregados para gráficos de comportamiento y retención."""

    def get_permissions(self):
        return [IsAuthenticated(), TienePermiso('crm.reportes_comportamiento')]

    @extend_schema(summary='Métricas CRM para visualización')
    def get(self, request):
        hoy = timezone.now().date()
        desde = hoy - timedelta(days=180)

        por_segmento_rf = dict(
            Cliente.objects.exclude(rf_segmento_predicho='').values('rf_segmento_predicho').annotate(
                n=Count('id')
            ).values_list('rf_segmento_predicho', 'n')
        )
        por_tipo = dict(
            Cliente.objects.values('tipo_cliente').annotate(n=Count('id')).values_list('tipo_cliente', 'n')
        )

        # "Churn" aproximado: tenían actividad y sin reserva reciente
        con_historial = Cliente.objects.filter(cantidad_mudanzas__gt=0)
        inactivos = 0
        for c in con_historial.iterator(chunk_size=100):
            ult = c.reservas.order_by('-fecha_servicio').values_list('fecha_servicio', flat=True).first()
            if ult and ult < desde:
                inactivos += 1

        activos_recientes = Cliente.objects.filter(
            reservas__fecha_servicio__gte=desde
        ).distinct().count()

        return Response({
            'clientes_por_segmento_predicho': por_segmento_rf,
            'clientes_por_tipo': por_tipo,
            'clientes_activos_ultimos_180d': activos_recientes,
            'clientes_posible_churn_180d': inactivos,
            'total_clientes': Cliente.objects.count(),
        })


class PrediccionLealtadView(APIView):
    """W15 — Ejecuta modelo RF (o heurística) sobre todos los clientes."""

    def get_permissions(self):
        return [IsAuthenticated(), TienePermiso('crm.rf_prediccion_lealtad')]

    @extend_schema(summary='Ejecutar predicción de lealtad (Random Forest)')
    def post(self, request):
        resultado = ejecutar_prediccion_lealtad_todos()
        return Response(resultado, status=status.HTTP_200_OK)
