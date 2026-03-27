from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from apps.notificaciones.services import NotificacionService
from .models import Pago, Factura


class PagoService:
    """Servicio para gestión de pagos y facturación"""

    @staticmethod
    def verificar_pago(pago: Pago, verificado_por) -> Pago:
        """
        Verifica un pago pendiente y confirma la reserva (Fase 4 del flujo)
        """
        with transaction.atomic():
            pago.estado = 'completado'
            pago.fecha_pago = timezone.now()
            pago.save(update_fields=['estado', 'fecha_pago'])

            reserva = pago.reserva

            # Si es depósito, confirmar la reserva
            if pago.tipo_pago == 'deposito':
                reserva.estado = 'confirmada'
                reserva.confirmada_en = timezone.now()
                reserva.save(update_fields=['estado', 'confirmada_en'])

                # Generar factura del depósito
                factura = PagoService.generar_factura(pago)

                # Notificar al cliente
                NotificacionService.notificar_reserva_confirmada(reserva.cliente, reserva)

                return pago

            # Si es saldo, el servicio ya está completado
            elif pago.tipo_pago == 'saldo':
                # Generar factura del saldo
                factura = PagoService.generar_factura(pago)

                return pago

        return pago

    @staticmethod
    def generar_factura(pago: Pago) -> Factura:
        """
        Genera una factura para un pago completado
        """
        from apps.usuarios.models import ConfiguracionSistema

        # Obtener IVA de configuración
        try:
            iva_porcentaje = Decimal(ConfiguracionSistema.objects.get(clave='porcentaje_iva').valor)
        except (ConfiguracionSistema.DoesNotExist, ValueError):
            iva_porcentaje = Decimal('13')  # Default 13%

        # Calcular subtotal e impuesto
        total = pago.monto
        subtotal = total / (1 + (iva_porcentaje / 100))
        impuesto = total - subtotal

        # Generar número de factura
        año_actual = timezone.now().year
        ultimo_numero = Factura.objects.filter(
            numero_factura__startswith=f'FAC-{año_actual}-'
        ).count()
        numero_factura = f'FAC-{año_actual}-{str(ultimo_numero + 1).zfill(4)}'

        # Crear factura
        factura = Factura.objects.create(
            pago=pago,
            numero_factura=numero_factura,
            cliente=pago.reserva.cliente,
            subtotal=subtotal.quantize(Decimal('0.01')),
            impuesto=impuesto.quantize(Decimal('0.01')),
            total=total,
            nit_cliente=pago.reserva.cliente.nit or '',
            razon_social=pago.reserva.cliente.nombre_empresa or pago.reserva.cliente.usuario.nombre_completo
        )

        # TODO: Generar PDF de factura (usando ReportLab o similar)
        # factura.pdf = generar_pdf_factura(factura)
        # factura.save()

        return factura

    @staticmethod
    def calcular_deposito(monto_total: Decimal) -> Decimal:
        """
        Calcula el monto del depósito (10% por defecto)
        """
        from apps.usuarios.models import ConfiguracionSistema

        try:
            porcentaje = Decimal(ConfiguracionSistema.objects.get(clave='porcentaje_deposito').valor)
        except (ConfiguracionSistema.DoesNotExist, ValueError):
            porcentaje = Decimal('10')

        return (monto_total * porcentaje / 100).quantize(Decimal('0.01'))

    @staticmethod
    def calcular_saldo(reserva) -> Decimal:
        """
        Calcula el saldo pendiente de una reserva
        """
        total = reserva.cotizacion.precio_total_calculado
        deposito_pagado = Pago.objects.filter(
            reserva=reserva,
            tipo_pago='deposito',
            estado='completado'
        ).aggregate(total=models.Sum('monto'))['total'] or Decimal('0')

        saldo = total - deposito_pagado
        return saldo.quantize(Decimal('0.01'))


from django.db import models
