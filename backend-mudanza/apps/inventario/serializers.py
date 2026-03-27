from rest_framework import serializers

from .access import es_cliente_portal, objeto_accesible
from .models import CategoriaObjeto, ObjetoMudanza, FotoObjeto


class CategoriaObjetoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaObjeto
        fields = '__all__'


class ObjetoMudanzaSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)

    class Meta:
        model = ObjetoMudanza
        fields = '__all__'

    def validate(self, attrs):
        request = self.context.get('request')
        cot = attrs.get('cotizacion')
        if cot is None and self.instance:
            cot = self.instance.cotizacion
        if request and cot and es_cliente_portal(request.user):
            if cot.cliente.usuario_id != request.user.id:
                raise serializers.ValidationError({'cotizacion': 'No puede usar esta cotización.'})
        return attrs


class FotoObjetoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FotoObjeto
        fields = '__all__'

    def validate_objeto(self, obj):
        request = self.context.get('request')
        if request and not request.user.is_staff and not request.user.is_superuser:
            if not objeto_accesible(request.user, obj):
                raise serializers.ValidationError('No autorizado para este objeto.')
        return obj
