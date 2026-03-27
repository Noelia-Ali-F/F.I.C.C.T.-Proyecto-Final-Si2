from rest_framework import serializers

from apps.inventario.access import es_cliente_portal

from .models import (
    ServicioMudanza,
    AsignacionPersonal,
    HistorialEstadoServicio,
    ConfirmacionEntrega,
    FotoEntrega,
    Incidencia,
    CalificacionServicio,
)


class AsignacionPersonalSerializer(serializers.ModelSerializer):
    personal_nombre = serializers.CharField(source='personal.usuario.nombre_completo', read_only=True)

    class Meta:
        model = AsignacionPersonal
        fields = '__all__'


class ServicioMudanzaSerializer(serializers.ModelSerializer):
    reserva_codigo = serializers.CharField(source='reserva.codigo_confirmacion', read_only=True)
    vehiculo_placa = serializers.CharField(source='vehiculo.placa', read_only=True)
    equipo = AsignacionPersonalSerializer(many=True, read_only=True)

    class Meta:
        model = ServicioMudanza
        fields = '__all__'


class ServicioMudanzaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicioMudanza
        fields = ('reserva', 'vehiculo', 'notas_operador')


class FotoEntregaSerializer(serializers.ModelSerializer):
    class Meta:
        model = FotoEntrega
        fields = '__all__'


class ConfirmacionEntregaSerializer(serializers.ModelSerializer):
    fotos = FotoEntregaSerializer(many=True, read_only=True)

    class Meta:
        model = ConfirmacionEntrega
        fields = '__all__'


class IncidenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incidencia
        fields = '__all__'
        read_only_fields = ('reportado_por',)

    def validate(self, attrs):
        request = self.context.get('request')
        servicio = self.context.get('servicio') or attrs.get('servicio')
        if self.instance:
            servicio = servicio or self.instance.servicio
        if servicio and request and es_cliente_portal(request.user):
            if servicio.reserva.cliente.usuario_id != request.user.id:
                raise serializers.ValidationError('No autorizado para este servicio.')
        objeto = attrs.get('objeto')
        if objeto and servicio and servicio.reserva.cotizacion_id != objeto.cotizacion_id:
            raise serializers.ValidationError({'objeto': 'El objeto no pertenece a la cotización de esta reserva.'})
        return attrs


class CalificacionServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalificacionServicio
        fields = '__all__'


class ConfirmacionEntregaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfirmacionEntrega
        fields = '__all__'
