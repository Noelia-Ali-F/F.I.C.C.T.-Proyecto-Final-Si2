from rest_framework import serializers
from .models import Reserva


class ReservaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.usuario.nombre_completo', read_only=True)
    cotizacion_id = serializers.IntegerField(source='cotizacion.id', read_only=True)

    class Meta:
        model = Reserva
        fields = '__all__'


class ReservaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reserva
        fields = ('cotizacion', 'cliente', 'fecha_servicio', 'franja_horaria')
