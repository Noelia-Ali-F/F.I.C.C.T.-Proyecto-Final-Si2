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
    class Meta:
        model = Cotizacion
        fields = (
            'cliente', 'direccion_origen', 'zona_origen', 'direccion_destino', 'zona_destino',
            'tipo_servicio', 'fecha_deseada', 'franja_horaria'
        )


class CotizacionServicioAdicionalCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotizacionServicioAdicional
        fields = ('cotizacion', 'servicio_adicional', 'cantidad', 'precio_unitario', 'precio_total')
