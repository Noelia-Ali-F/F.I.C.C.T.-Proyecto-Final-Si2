from rest_framework import serializers
from .models import MetodoPago, Pago, Factura, Reembolso


class MetodoPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetodoPago
        fields = '__all__'


class PagoSerializer(serializers.ModelSerializer):
    metodo_nombre = serializers.CharField(source='metodo_pago.nombre', read_only=True)
    reserva_codigo = serializers.CharField(source='reserva.codigo_confirmacion', read_only=True)

    class Meta:
        model = Pago
        fields = '__all__'


class PagoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = ('reserva', 'metodo_pago', 'tipo_pago', 'monto', 'referencia_transaccion')


class FacturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Factura
        fields = '__all__'


class ReembolsoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reembolso
        fields = '__all__'
