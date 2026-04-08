from django.utils import timezone
from .models import Notificacion


class NotificacionService:
    """Servicio para enviar notificaciones a usuarios"""

    @staticmethod
    def enviar_notificacion(usuario, tipo, titulo, mensaje, canal='push', datos_extra=None):
        """Crea y envía una notificación a un usuario"""
        notificacion = Notificacion.objects.create(
            usuario=usuario,
            tipo=tipo,
            titulo=titulo,
            mensaje=mensaje,
            canal=canal,
            datos_extra=datos_extra or {},
            enviada_en=timezone.now()
        )
        return notificacion

    @staticmethod
    def notificar_cotizacion_enviada(cliente, cotizacion):
        """Notifica al cliente que su cotización está lista"""
        mensaje = (
            f"Tu cotización está lista. Precio: Bs {cotizacion.precio_total_calculado} "
            f"para mudanza {cotizacion.zona_origen.nombre} a {cotizacion.zona_destino.nombre}, "
            f"{cotizacion.fecha_deseada.strftime('%d/%m/%Y')}. "
            f"Válida hasta el {cotizacion.valida_hasta.strftime('%d/%m/%Y')}."
        )
        return NotificacionService.enviar_notificacion(
            usuario=cliente.usuario,
            tipo='cotizacion_enviada',
            titulo='Cotización lista',
            mensaje=mensaje,
            datos_extra={'cotizacion_id': cotizacion.id}
        )

    @staticmethod
    def notificar_reserva_confirmada(cliente, reserva, factura=None):
        """Notifica al cliente que su reserva fue confirmada (Fase 4)."""
        cotizacion = reserva.cotizacion
        fecha_txt = (
            reserva.fecha_servicio.strftime('%d/%m/%Y')
            if reserva.fecha_servicio
            else 'por definir'
        )
        franja = reserva.franja_horaria or '—'
        zo = cotizacion.zona_origen.nombre if cotizacion.zona_origen else '—'
        zd = cotizacion.zona_destino.nombre if cotizacion.zona_destino else '—'
        mensaje = (
            f"Tu reserva {reserva.codigo_confirmacion} está CONFIRMADA. "
            f"Fecha: {fecha_txt}, franja: {franja}. "
            f"Mudanza de {zo} a {zd}. "
            f"Puedes descargar la factura del depósito desde la app o el portal web."
        )
        datos_extra = {'reserva_id': reserva.id}
        if factura:
            datos_extra['factura_id'] = factura.id
        return NotificacionService.enviar_notificacion(
            usuario=cliente.usuario,
            tipo='reserva_confirmada',
            titulo=f'Reserva {reserva.codigo_confirmacion} confirmada',
            mensaje=mensaje,
            datos_extra=datos_extra,
        )

    @staticmethod
    def notificar_pago_pendiente(operador, pago):
        """Notifica al operador que hay un nuevo pago pendiente de verificación"""
        mensaje = (
            f"Nuevo comprobante de pago recibido para reserva {pago.reserva.codigo_confirmacion}. "
            f"Monto: Bs {pago.monto}. Método: {pago.metodo_pago.nombre}. "
            f"Pendiente de verificación."
        )
        return NotificacionService.enviar_notificacion(
            usuario=operador,
            tipo='pago_pendiente',
            titulo='Nuevo pago pendiente de verificación',
            mensaje=mensaje,
            datos_extra={'pago_id': pago.id}
        )

    @staticmethod
    def notificar_servicio_asignado(personal, servicio):
        """Notifica al conductor/cargador que tiene un nuevo servicio asignado (Fase 5)"""
        from apps.inventario.models import ObjetoMudanza

        cotizacion = servicio.reserva.cotizacion

        # Contar objetos de alto riesgo
        objetos_alto_riesgo = ObjetoMudanza.objects.filter(
            cotizacion=cotizacion,
            rf_nivel_riesgo='alto'
        ).count()

        # Obtener equipo asignado
        equipo = servicio.equipo.select_related('personal__usuario').all()
        nombres_equipo = [a.personal.usuario.nombre_completo for a in equipo if a.personal.id != personal.id]

        mensaje = (
            f"Nuevo servicio asignado. {servicio.reserva.fecha_servicio.strftime('%A %d de %B')}, "
            f"{servicio.reserva.franja_horaria}. "
            f"Origen: {cotizacion.direccion_origen}, {cotizacion.zona_origen.nombre}. "
            f"Destino: {cotizacion.direccion_destino}, {cotizacion.zona_destino.nombre}. "
            f"{cotizacion.cantidad_objetos} objetos"
        )

        if objetos_alto_riesgo > 0:
            mensaje += f" ({objetos_alto_riesgo} alto riesgo)"

        mensaje += f". Vehículo: {servicio.vehiculo.placa if servicio.vehiculo else 'Por asignar'}."

        if nombres_equipo:
            mensaje += f" Equipo: {', '.join(nombres_equipo)}."

        return NotificacionService.enviar_notificacion(
            usuario=personal.usuario,
            tipo='servicio_asignado',
            titulo='Nuevo servicio asignado',
            mensaje=mensaje,
            datos_extra={'servicio_id': servicio.id}
        )

    @staticmethod
    def notificar_cambio_estado_servicio(cliente, servicio, estado):
        """Notifica al cliente sobre cambios de estado del servicio"""
        mensajes_estado = {
            'en_camino': 'Tu equipo de mudanza está en camino.',
            'en_origen': 'El equipo llegó a tu dirección.',
            'cargando': 'Comenzó la carga de tus pertenencias.',
            'en_ruta': 'Tus pertenencias están en ruta hacia el destino.',
            'en_destino': 'El equipo llegó al destino.',
            'descargando': 'Comenzó la descarga.',
            'completado': 'Tu mudanza se completó exitosamente.',
        }
        mensaje = mensajes_estado.get(estado, f'Estado actualizado: {estado}')
        return NotificacionService.enviar_notificacion(
            usuario=cliente.usuario,
            tipo='estado_servicio',
            titulo=f'Servicio {servicio.reserva.codigo_confirmacion}',
            mensaje=mensaje,
            datos_extra={'servicio_id': servicio.id, 'estado': estado}
        )

    @staticmethod
    def notificar_incidencia_reportada(operador, incidencia):
        """Notifica al operador sobre una nueva incidencia"""
        mensaje = (
            f"Nueva incidencia reportada en servicio {incidencia.servicio.reserva.codigo_confirmacion}. "
            f"Tipo: {incidencia.get_tipo_display()}. Gravedad: {incidencia.get_gravedad_display()}."
        )
        return NotificacionService.enviar_notificacion(
            usuario=operador,
            tipo='incidencia_reportada',
            titulo='Nueva incidencia reportada',
            mensaje=mensaje,
            datos_extra={'incidencia_id': incidencia.id}
        )

    @staticmethod
    def notificar_pago_saldo_registrado(cliente, reserva, factura):
        """Cliente: pago de saldo verificado y factura final (Fase 8)."""
        mensaje = (
            f"Pago de saldo registrado: Bs {factura.total}. "
            f"Factura {factura.numero_factura} disponible para descarga."
        )
        return NotificacionService.enviar_notificacion(
            usuario=cliente.usuario,
            tipo='pago_saldo_completado',
            titulo='Factura de saldo',
            mensaje=mensaje,
            datos_extra={'reserva_id': reserva.id, 'factura_id': factura.id},
        )

    @staticmethod
    def notificar_pago_rechazado(cliente, pago):
        """Cliente: comprobante rechazado por operador (Fase 4)."""
        mensaje = (
            f"Tu comprobante de pago (Bs {pago.monto}, reserva {pago.reserva.codigo_confirmacion}) "
            f"fue rechazado. Sube un nuevo comprobante desde la app o el portal."
        )
        return NotificacionService.enviar_notificacion(
            usuario=cliente.usuario,
            tipo='pago_rechazado',
            titulo='Pago no verificado',
            mensaje=mensaje,
            datos_extra={'pago_id': pago.id, 'reserva_id': pago.reserva_id},
        )
