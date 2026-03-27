from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from apps.inventario.access import es_cliente_portal
from apps.usuarios.permissions import TieneAlgunoDe, TienePermiso
from apps.ia.services import RandomForestService
from apps.notificaciones.services import NotificacionService

from .models import (
    ServicioMudanza,
    AsignacionPersonal,
    Incidencia,
    CalificacionServicio,
    HistorialEstadoServicio,
    ConfirmacionEntrega,
    FotoEntrega,
)
from .serializers import (
    ServicioMudanzaSerializer,
    ServicioMudanzaCreateSerializer,
    AsignacionPersonalSerializer,
    IncidenciaSerializer,
    CalificacionServicioSerializer,
    ConfirmacionEntregaSerializer,
)


class DenyAny(BasePermission):
    def has_permission(self, request, view):
        return False


class ServicioMudanzaViewSet(viewsets.ModelViewSet):
    queryset = ServicioMudanza.objects.select_related(
        'reserva', 'reserva__cliente__usuario', 'vehiculo', 'rf_tipo_contenedor_recomendado'
    ).prefetch_related('equipo__personal__usuario', 'confirmacion__fotos').all().order_by('-creado_en')
    filterset_fields = ('reserva', 'estado', 'vehiculo')

    def get_queryset(self):
        qs = ServicioMudanza.objects.select_related(
            'reserva', 'reserva__cliente__usuario', 'vehiculo', 'rf_tipo_contenedor_recomendado'
        ).prefetch_related('equipo__personal__usuario', 'confirmacion__fotos').order_by('-creado_en')
        u = self.request.user
        if u.is_superuser or u.is_staff:
            return qs
        if es_cliente_portal(u):
            return qs.filter(reserva__cliente__usuario=u)
        return qs

    def get_permissions(self):
        u = self.request.user
        if es_cliente_portal(u):
            if self.action in ('list', 'retrieve', 'confirmar_entrega', 'calificar', 'reportar_incidencia'):
                return [IsAuthenticated()]
            return [IsAuthenticated(), DenyAny()]
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated(), TieneAlgunoDe('reservas.gestionar', 'reservas.ver', 'crm.pipeline_solicitudes')]
        if self.action == 'create':
            return [IsAuthenticated(), TieneAlgunoDe('reservas.gestionar')]
        return [IsAuthenticated(), TieneAlgunoDe('reservas.gestionar')]

    def get_serializer_class(self):
        if self.action == 'create':
            return ServicioMudanzaCreateSerializer
        return ServicioMudanzaSerializer

    def perform_create(self, serializer):
        """Crea el servicio y ejecuta predicciones de IA (Fase 5 del flujo)"""
        servicio = serializer.save()
        # Ejecutar predicciones de IA
        RandomForestService.recomendar_contenedor(servicio)
        return servicio

    @action(detail=True, methods=['post'])
    def asignar_equipo(self, request, pk=None):
        """Asigna personal al servicio y notifica (Fase 5 del flujo)"""
        from apps.personal.models import Personal
        servicio = self.get_object()
        personal_id = request.data.get('personal')
        rol = request.data.get('rol_asignado')
        if not personal_id or not rol:
            return Response(
                {'error': 'personal y rol_asignado son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        asig, created = AsignacionPersonal.objects.get_or_create(
            servicio=servicio,
            personal_id=personal_id,
            defaults={'rol_asignado': rol}
        )
        if not created:
            asig.rol_asignado = rol
            asig.save()

        # Notificar al personal asignado
        personal = Personal.objects.get(pk=personal_id)
        NotificacionService.notificar_servicio_asignado(personal, servicio)

        return Response(AsignacionPersonalSerializer(asig).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambia el estado del servicio y notifica al cliente (Fase 6 del flujo)"""
        servicio = self.get_object()
        estado_nuevo = request.data.get('estado_nuevo')
        if not estado_nuevo:
            return Response({'error': 'estado_nuevo es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        estado_anterior = servicio.estado
        servicio.estado = estado_nuevo
        if estado_nuevo == 'completado':
            servicio.fin_real = timezone.now()
            if servicio.inicio_real:
                delta = servicio.fin_real - servicio.inicio_real
                servicio.duracion_minutos = int(delta.total_seconds() / 60)
                # Retroalimentar modelo de tiempo
                RandomForestService.actualizar_retroalimentacion(
                    'tiempo', servicio.id, servicio.duracion_minutos
                )
        elif estado_nuevo in ('en_origen', 'cargando') and not servicio.inicio_real:
            servicio.inicio_real = timezone.now()
        servicio.save()

        HistorialEstadoServicio.objects.create(
            servicio=servicio,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_nuevo,
            cambiado_por=request.user,
            latitud=request.data.get('latitud'),
            longitud=request.data.get('longitud'),
            notas=request.data.get('notas', ''),
        )

        # Notificar al cliente sobre el cambio de estado
        NotificacionService.notificar_cambio_estado_servicio(
            servicio.reserva.cliente,
            servicio,
            estado_nuevo
        )

        return Response(ServicioMudanzaSerializer(servicio).data)

    @action(detail=True, methods=['post'])
    def reportar_incidencia(self, request, pk=None):
        """Reporta una incidencia y notifica al operador (Fase 7 del flujo)"""
        from apps.usuarios.models import Usuario
        servicio = self.get_object()
        dueno = es_cliente_portal(request.user) and servicio.reserva.cliente.usuario_id == request.user.id
        puede_staff = TieneAlgunoDe('inventario.incidencias_postentrega', 'inventario.editar').has_permission(
            request, self
        )
        if not (dueno or puede_staff):
            raise PermissionDenied()
        serializer = IncidenciaSerializer(
            data=request.data,
            context={'request': request, 'servicio': servicio},
        )
        if serializer.is_valid():
            inc = serializer.save(servicio=servicio, reportado_por=request.user)

            # Notificar a operadores con permiso de gestionar incidencias
            operadores = Usuario.objects.filter(
                rol__permisos_asignados__permiso__nombre__in=['incidencias_postentrega', 'editar'],
                es_activo=True
            ).distinct()[:5]  # Limitar a 5 operadores
            for operador in operadores:
                NotificacionService.notificar_incidencia_reportada(operador, inc)

            return Response(IncidenciaSerializer(inc).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def confirmar_entrega(self, request, pk=None):
        """Confirmación de entrega con firmas separadas (conductor + cliente) - Fases 6 y 7 del flujo"""
        servicio = self.get_object()
        reserva = servicio.reserva
        dueno = es_cliente_portal(request.user) and reserva.cliente.usuario_id == request.user.id
        staff = request.user.is_staff or request.user.is_superuser
        perm = TienePermiso('inventario.confirmar_entrega').has_permission(request, self)

        if not (dueno or staff or perm):
            raise PermissionDenied()

        # Determinar qué firma se está recibiendo
        tipo_firma = request.data.get('tipo_firma', 'conductor')  # 'conductor' o 'cliente'
        conforme = request.data.get('cliente_conforme', '')

        # Crear o actualizar confirmación
        conf, _ = ConfirmacionEntrega.objects.get_or_create(servicio=servicio)

        # Actualizar campos
        if request.data.get('observaciones'):
            conf.observaciones = request.data.get('observaciones')

        if conforme in ['total', 'parcial', 'ninguna']:
            conf.cliente_conforme = conforme

        # Guardar firma según tipo
        firma = request.FILES.get('firma')
        if firma:
            if tipo_firma == 'conductor':
                conf.firma_conductor = firma
            elif tipo_firma == 'cliente':
                conf.firma_cliente = firma

        conf.save()

        # Agregar fotos si las hay
        for f in request.FILES.getlist('fotos_entrega'):
            FotoEntrega.objects.create(confirmacion=conf, foto=f)

        return Response(ConfirmacionEntregaSerializer(conf).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def calificar(self, request, pk=None):
        """Cliente califica el servicio (Fase 7 del flujo)"""
        from decimal import Decimal
        servicio = self.get_object()
        reserva = servicio.reserva
        cliente = reserva.cliente

        calificacion, created = CalificacionServicio.objects.update_or_create(
            servicio=servicio,
            defaults={
                'cliente': cliente,
                'calificacion': request.data.get('calificacion'),
                'comentario': request.data.get('comentario', ''),
                'calificacion_puntualidad': request.data.get('calificacion_puntualidad'),
                'calificacion_cuidado': request.data.get('calificacion_cuidado'),
                'calificacion_atencion': request.data.get('calificacion_atencion'),
            }
        )

        # Actualizar métricas del personal asignado
        from django.db.models import Avg
        for asignacion in servicio.equipo.all():
            personal = asignacion.personal
            calificaciones = CalificacionServicio.objects.filter(
                servicio__equipo__personal=personal
            )
            promedio = calificaciones.aggregate(Avg('calificacion'))['calificacion__avg'] or 0
            personal.calificacion_promedio = Decimal(str(round(promedio, 2)))
            personal.servicios_completados += 1 if created else 0
            personal.save(update_fields=['calificacion_promedio', 'servicios_completados'])

        # Actualizar métricas del cliente
        cliente.cantidad_mudanzas += 1 if created else 0
        if created:
            cliente.monto_total_gastado += reserva.cotizacion.precio_total_calculado
        cliente.save(update_fields=['cantidad_mudanzas', 'monto_total_gastado'])

        return Response(ServicioMudanzaSerializer(servicio).data)


class IncidenciaViewSet(viewsets.ModelViewSet):
    queryset = Incidencia.objects.select_related('servicio', 'servicio__reserva__cliente__usuario', 'objeto', 'reportado_por').all().order_by('-creado_en')
    serializer_class = IncidenciaSerializer
    filterset_fields = ('servicio', 'tipo', 'estado')

    def get_queryset(self):
        qs = Incidencia.objects.select_related(
            'servicio', 'servicio__reserva__cliente__usuario', 'objeto', 'reportado_por'
        ).order_by('-creado_en')
        u = self.request.user
        if u.is_superuser or u.is_staff:
            return qs
        if es_cliente_portal(u):
            return qs.filter(servicio__reserva__cliente__usuario=u)
        return qs

    def get_permissions(self):
        return [
            IsAuthenticated(),
            TieneAlgunoDe('inventario.incidencias_postentrega', 'inventario.editar'),
        ]

    def perform_create(self, serializer):
        serializer.save(reportado_por=self.request.user)
