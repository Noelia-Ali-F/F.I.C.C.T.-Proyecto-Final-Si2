from rest_framework import serializers
from .models import Cotizacion, CotizacionServicioAdicional


class CotizacionServicioAdicionalSerializer(serializers.ModelSerializer):
    servicio_nombre = serializers.CharField(source='servicio_adicional.nombre', read_only=True)

    class Meta:
        model = CotizacionServicioAdicional
        fields = '__all__'


class CotizacionSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.usuario.nombre_completo', read_only=True)
    zona_origen_nombre = serializers.CharField(source='zona_origen.nombre', read_only=True)
    zona_destino_nombre = serializers.CharField(source='zona_destino.nombre', read_only=True)
    tipo_servicio_nombre = serializers.CharField(source='tipo_servicio.nombre', read_only=True)
    servicios_adicionales = CotizacionServicioAdicionalSerializer(
        source='servicios_adicionales_vinculados', many=True, read_only=True
    )

    class Meta:
        model = Cotizacion
        fields = '__all__'


class CotizacionCreateSerializer(serializers.ModelSerializer):
    """
    Creación desde portal o app móvil: el cliente autenticado con rol cliente
    no envía `cliente`; lo asigna CotizacionViewSet.perform_create.
    """

    class Meta:
        model = Cotizacion
        fields = (
            'id',
            'cliente', 'direccion_origen', 'latitud_origen', 'longitud_origen', 'zona_origen',
            'direccion_destino', 'latitud_destino', 'longitud_destino', 'zona_destino',
            'tipo_servicio', 'fecha_deseada', 'franja_horaria', 'descripcion',
        )
        read_only_fields = ('id',)
        extra_kwargs = {
            'cliente': {'required': False, 'allow_null': True},
            'direccion_origen': {'required': True},
            'direccion_destino': {'required': True},
            'tipo_servicio': {'required': True},
        }

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        # Aliases *_id desde la app (evitar "" que no es None y rompe el PK)
        pairs = (
            ('zona_origen_id', 'zona_origen'),
            ('zona_destino_id', 'zona_destino'),
            ('tipo_servicio_id', 'tipo_servicio'),
        )
        for src, dst in pairs:
            if dst in data:
                continue
            raw = data.get(src)
            if raw in (None, ''):
                continue
            data[dst] = raw
        return super().to_internal_value(data)


class CotizacionServicioAdicionalCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotizacionServicioAdicional
        fields = ('cotizacion', 'servicio_adicional', 'cantidad', 'precio_unitario', 'precio_total')
