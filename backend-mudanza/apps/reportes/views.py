from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from django.db.models import Sum
from django.utils import timezone


def _rol_slug(user):
    if not getattr(user, 'rol', None):
        return ''
    return (user.rol.nombre or '').lower()


class DashboardView(APIView):
    """Resumen por rol (W7): admin/operador, cliente, conductor/cargador."""
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: None})
    def get(self, request):
        from apps.reservas.models import Reserva
        from apps.cotizaciones.models import Cotizacion
        from apps.clientes.models import Cliente
        from apps.pagos.models import Pago
        from apps.mudanzas.models import ServicioMudanza, AsignacionPersonal
        from apps.personal.models import Personal

        hoy = timezone.now().date()
        mes_inicio = hoy.replace(day=1)
        rol = _rol_slug(request.user)

        if rol == 'cliente':
            try:
                cli = Cliente.objects.get(usuario=request.user)
            except Cliente.DoesNotExist:
                return Response({
                    'vista': 'cliente',
                    'reservas_activas': 0,
                    'cotizaciones_pendientes': 0,
                    'pagos_pendientes': 0,
                    'proximas_mudanzas': 0,
                })
            reservas_activas = Reserva.objects.filter(
                cliente=cli,
                estado__in=['pendiente', 'confirmada', 'en_proceso'],
            ).count()
            cotizaciones_pendientes = Cotizacion.objects.filter(
                cliente=cli, estado='enviada'
            ).count()
            reservas_ids = Reserva.objects.filter(cliente=cli).values_list('id', flat=True)
            pagos_pendientes = Pago.objects.filter(
                reserva_id__in=reservas_ids, estado__in=['pendiente', 'procesando']
            ).count()
            proximas = Reserva.objects.filter(
                cliente=cli,
                fecha_servicio__gte=hoy,
                estado__in=['confirmada', 'en_proceso', 'pendiente'],
            ).count()
            return Response({
                'vista': 'cliente',
                'reservas_activas': reservas_activas,
                'cotizaciones_pendientes': cotizaciones_pendientes,
                'pagos_pendientes': pagos_pendientes,
                'proximas_mudanzas': proximas,
            })

        if rol in ('conductor', 'cargador'):
            try:
                per = Personal.objects.get(usuario=request.user)
            except Personal.DoesNotExist:
                return Response({
                    'vista': 'operativo',
                    'servicios_asignados': 0,
                    'servicios_en_curso': 0,
                    'servicios_completados_total': 0,
                })
            asignaciones = AsignacionPersonal.objects.filter(personal=per)
            serv_ids = asignaciones.values_list('servicio_id', flat=True).distinct()
            en_curso = ServicioMudanza.objects.filter(
                id__in=serv_ids,
                estado__in=[
                    'asignado', 'en_camino', 'en_origen', 'cargando',
                    'en_ruta', 'en_destino', 'descargando',
                ],
            ).count()
            asignados = ServicioMudanza.objects.filter(
                id__in=serv_ids,
                estado__in=['asignado', 'en_camino', 'en_origen', 'cargando', 'en_ruta', 'en_destino', 'descargando', 'completado'],
            ).count()
            return Response({
                'vista': 'operativo',
                'servicios_asignados': asignados,
                'servicios_en_curso': en_curso,
                'servicios_completados_total': per.servicios_completados,
            })

        # Admin, operador u otros con acceso CRM
        reservas_hoy = Reserva.objects.filter(
            fecha_servicio=hoy, estado__in=['confirmada', 'en_proceso']
        ).count()
        cotizaciones_pendientes = Cotizacion.objects.filter(estado='enviada').count()
        clientes_total = Cliente.objects.count()
        ingresos_mes = Pago.objects.filter(
            estado='completado',
            creado_en__date__gte=mes_inicio
        ).aggregate(total=Sum('monto'))['total'] or 0
        servicios_completados = ServicioMudanza.objects.filter(estado='completado').count()

        payload = {
            'vista': 'operador' if rol == 'operador' else 'admin',
            'reservas_hoy': reservas_hoy,
            'cotizaciones_pendientes': cotizaciones_pendientes,
            'clientes_total': clientes_total,
            'ingresos_mes': float(ingresos_mes),
            'servicios_completados': servicios_completados,
        }
        if rol == 'operador':
            payload['mudanzas_activas'] = ServicioMudanza.objects.exclude(
                estado__in=['completado', 'cancelado']
            ).count()
        return Response(payload)
