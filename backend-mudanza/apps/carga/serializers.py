from rest_framework import serializers
from .models import PlanCarga, ItemPlanCarga


class ItemPlanCargaSerializer(serializers.ModelSerializer):
    objeto_nombre = serializers.CharField(source='objeto.nombre', read_only=True)

    class Meta:
        model = ItemPlanCarga
        fields = '__all__'


class PlanCargaSerializer(serializers.ModelSerializer):
    items = ItemPlanCargaSerializer(many=True, read_only=True)
    tipo_contenedor_nombre = serializers.CharField(source='tipo_contenedor.nombre', read_only=True)

    class Meta:
        model = PlanCarga
        fields = '__all__'
