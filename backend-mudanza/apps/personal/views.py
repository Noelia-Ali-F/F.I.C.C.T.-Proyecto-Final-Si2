from rest_framework import viewsets
from .models import Personal
from .serializers import PersonalSerializer


class PersonalViewSet(viewsets.ModelViewSet):
    queryset = Personal.objects.select_related('usuario').all().order_by('-creado_en')
    serializer_class = PersonalSerializer
    search_fields = ('usuario__nombre', 'usuario__apellido', 'numero_licencia')
    filterset_fields = ('tipo_personal', 'esta_disponible')
