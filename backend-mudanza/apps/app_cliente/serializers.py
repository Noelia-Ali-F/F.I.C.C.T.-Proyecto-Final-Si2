from decimal import Decimal

from rest_framework import serializers

from apps.mudanzas.models import ServicioMudanza
from apps.pagos.services import PagoService
from apps.reservas.models import Reserva


class AppClienteReservaSerializer(serializers.ModelSerializer):
    """Payload enriquecido para la app cliente (zonas, precio, estado de ejecución)."""

    zona_origen = serializers.SerializerMethodField()
    zona_destino = serializers.SerializerMethodField()
    precio_total = serializers.SerializerMethodField()
    precio_final = serializers.SerializerMethodField()
    estado_seguimiento = serializers.SerializerMethodField()
    monto_deposito_sugerido = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = (
            'id',
            'codigo_confirmacion',
            'cotizacion_id',
            'fecha_servicio',
            'franja_horaria',
            'estado',
            'estado_seguimiento',
            'zona_origen',
            'zona_destino',
            'precio_total',
            'precio_final',
            'monto_deposito_sugerido',
            'confirmada_en',
            'creado_en',
        )
        read_only_fields = fields

    def get_zona_origen(self, obj):
        z = obj.cotizacion.zona_origen
        return z.nombre if z else None

    def get_zona_destino(self, obj):
        z = obj.cotizacion.zona_destino
        return z.nombre if z else None

    def get_precio_total(self, obj):
        c = obj.cotizacion
        v = c.precio_total_calculado
        return str(v) if v is not None else None

    def get_precio_final(self, obj):
        c = obj.cotizacion
        if c.rf_precio_predicho is not None:
            return str(c.rf_precio_predicho)
        return str(c.precio_total_calculado) if c.precio_total_calculado is not None else None

    def get_monto_deposito_sugerido(self, obj):
        """Mismo criterio que precio_final × porcentaje_deposito (config), p. ej. 10 % (Fase 4)."""
        c = obj.cotizacion
        if c.rf_precio_predicho is not None:
            base = c.rf_precio_predicho
        elif c.precio_total_calculado is not None:
            base = c.precio_total_calculado
        else:
            return None
        try:
            dep = PagoService.calcular_deposito(Decimal(str(base)))
            return str(dep)
        except Exception:
            return None

    def get_estado_seguimiento(self, obj):
        try:
            return obj.servicio.estado
        except ServicioMudanza.DoesNotExist:
            return None
