from rest_framework import viewsets
from .models import TipoContenedor, Vehiculo, MantenimientoVehiculo
from .serializers import TipoContenedorSerializer, VehiculoSerializer, MantenimientoVehiculoSerializer


class TipoContenedorViewSet(viewsets.ModelViewSet):
    queryset = TipoContenedor.objects.all().order_by('nombre')
    serializer_class = TipoContenedorSerializer


class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.select_related('tipo_contenedor').all().order_by('placa')
    serializer_class = VehiculoSerializer
    search_fields = ('placa', 'marca', 'modelo')
    filterset_fields = ('estado', 'tipo_contenedor')


class MantenimientoVehiculoViewSet(viewsets.ModelViewSet):
    queryset = MantenimientoVehiculo.objects.select_related('vehiculo').all().order_by('-fecha_programada')
    serializer_class = MantenimientoVehiculoSerializer
    filterset_fields = ('vehiculo', 'estado')
