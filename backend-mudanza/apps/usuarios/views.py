from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework_simplejwt.views import TokenObtainPairView
from drf_spectacular.utils import extend_schema

from .audit import registrar_bitacora
from .models import Usuario, Rol, Permiso, RolPermiso, ConfiguracionSistema, BitacoraAuditoria
from .permissions import EsAdministrador, EsAdminOOperador
from .serializers import (
    UsuarioTokenObtainPairSerializer,
    UsuarioRegistroSerializer,
    UsuarioPerfilSerializer,
    UsuarioAdminSerializer,
    RolSerializer,
    RolConPermisosSerializer,
    PermisoSerializer,
    ConfiguracionSerializer,
    BitacoraSerializer,
    BitacoraAdminSerializer,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = UsuarioTokenObtainPairSerializer
    permission_classes = [AllowAny]


class RegistroView(APIView):
    """Registro de nuevos usuarios."""
    permission_classes = [AllowAny]

    @extend_schema(request=UsuarioRegistroSerializer, responses={201: UsuarioRegistroSerializer})
    def post(self, request):
        serializer = UsuarioRegistroSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            registrar_bitacora(
                user,
                'registro',
                request=request,
                detalles={'email': user.email},
            )
            return Response(
                {'id': user.id, 'email': user.email, 'nombre': user.nombre, 'apellido': user.apellido},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PerfilView(APIView):
    """Obtener y actualizar perfil del usuario autenticado."""
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UsuarioPerfilSerializer})
    def get(self, request):
        serializer = UsuarioPerfilSerializer(request.user)
        return Response(serializer.data)

    @extend_schema(request=UsuarioPerfilSerializer, responses={200: UsuarioPerfilSerializer})
    def patch(self, request):
        serializer = UsuarioPerfilSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PerfilHistorialView(APIView):
    """Actividad reciente del usuario en bitácora (W6 historial operativo de cuenta)."""
    permission_classes = [IsAuthenticated]

    @extend_schema(summary='Historial de actividad del perfil')
    def get(self, request):
        qs = BitacoraAuditoria.objects.filter(usuario=request.user).order_by('-creado_en')[:50]
        return Response(BitacoraSerializer(qs, many=True).data)


class UsuarioViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, EsAdminOOperador]
    queryset = Usuario.objects.select_related('rol').all().order_by('-creado_en')
    search_fields = ('email', 'nombre', 'apellido')
    filterset_fields = ('rol', 'es_activo')

    def get_serializer_class(self):
        return UsuarioAdminSerializer

    def perform_create(self, serializer):
        u = serializer.save()
        registrar_bitacora(
            self.request.user,
            'usuario_creado',
            request=self.request,
            entidad_tipo='Usuario',
            entidad_id=u.pk,
            detalles={'email': u.email},
        )

    def perform_update(self, serializer):
        u = serializer.save()
        registrar_bitacora(
            self.request.user,
            'usuario_actualizado',
            request=self.request,
            entidad_tipo='Usuario',
            entidad_id=u.pk,
            detalles={'email': u.email},
        )

    def perform_destroy(self, instance):
        uid, email = instance.pk, instance.email
        instance.delete()
        registrar_bitacora(
            self.request.user,
            'usuario_eliminado',
            request=self.request,
            entidad_tipo='Usuario',
            entidad_id=uid,
            detalles={'email': email},
        )


class RolViewSet(ModelViewSet):
    queryset = Rol.objects.all().order_by('nombre')
    filterset_fields = ('es_activo',)

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated(), EsAdminOOperador()]
        return [IsAuthenticated(), EsAdministrador()]

    def get_serializer_class(self):
        if self.action in ('retrieve', 'permisos', 'update', 'partial_update'):
            return RolConPermisosSerializer
        return RolSerializer

    def perform_create(self, serializer):
        r = serializer.save()
        registrar_bitacora(
            self.request.user,
            'rol_creado',
            request=self.request,
            entidad_tipo='Rol',
            entidad_id=r.pk,
            detalles={'nombre': r.nombre},
        )

    def perform_update(self, serializer):
        r = serializer.save()
        registrar_bitacora(
            self.request.user,
            'rol_actualizado',
            request=self.request,
            entidad_tipo='Rol',
            entidad_id=r.pk,
            detalles={'nombre': r.nombre},
        )

    def perform_destroy(self, instance):
        rid, nombre = instance.pk, instance.nombre
        instance.delete()
        registrar_bitacora(
            self.request.user,
            'rol_eliminado',
            request=self.request,
            entidad_tipo='Rol',
            entidad_id=rid,
            detalles={'nombre': nombre},
        )

    @action(detail=True, methods=['get', 'put'])
    def permisos(self, request, pk=None):
        rol = self.get_object()
        if request.method == 'GET':
            permisos = Permiso.objects.filter(roles_asignados__rol=rol).order_by('modulo', 'nombre')
            return Response(PermisoSerializer(permisos, many=True).data)
        permiso_ids = request.data.get('permiso_ids', [])
        RolPermiso.objects.filter(rol=rol).delete()
        for pid in permiso_ids:
            try:
                perm = Permiso.objects.get(pk=pid)
                RolPermiso.objects.create(rol=rol, permiso=perm)
            except Permiso.DoesNotExist:
                pass
        permisos = Permiso.objects.filter(roles_asignados__rol=rol).order_by('modulo', 'nombre')
        registrar_bitacora(
            request.user,
            'rol_permisos_actualizados',
            request=request,
            entidad_tipo='Rol',
            entidad_id=rol.pk,
            detalles={'nombre': rol.nombre, 'permiso_ids': permiso_ids},
        )
        return Response(PermisoSerializer(permisos, many=True).data)


class PermisoViewSet(ModelViewSet):
    queryset = Permiso.objects.all().order_by('modulo', 'nombre')
    serializer_class = PermisoSerializer
    filterset_fields = ('modulo',)

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated(), EsAdminOOperador()]
        return [IsAuthenticated(), EsAdministrador()]

    def perform_create(self, serializer):
        p = serializer.save()
        registrar_bitacora(
            self.request.user,
            'permiso_creado',
            request=self.request,
            entidad_tipo='Permiso',
            entidad_id=p.pk,
            detalles={'nombre': p.nombre, 'modulo': p.modulo},
        )

    def perform_update(self, serializer):
        p = serializer.save()
        registrar_bitacora(
            self.request.user,
            'permiso_actualizado',
            request=self.request,
            entidad_tipo='Permiso',
            entidad_id=p.pk,
            detalles={'nombre': p.nombre},
        )

    def perform_destroy(self, instance):
        pid, nombre = instance.pk, instance.nombre
        instance.delete()
        registrar_bitacora(
            self.request.user,
            'permiso_eliminado',
            request=self.request,
            entidad_tipo='Permiso',
            entidad_id=pid,
            detalles={'nombre': nombre},
        )


class ConfiguracionViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, EsAdministrador]
    queryset = ConfiguracionSistema.objects.all().order_by('clave')
    serializer_class = ConfiguracionSerializer

    def perform_create(self, serializer):
        c = serializer.save()
        registrar_bitacora(
            self.request.user,
            'config_creada',
            request=self.request,
            entidad_tipo='ConfiguracionSistema',
            entidad_id=c.pk,
            detalles={'clave': c.clave},
        )

    def perform_update(self, serializer):
        c = serializer.save()
        registrar_bitacora(
            self.request.user,
            'config_actualizada',
            request=self.request,
            entidad_tipo='ConfiguracionSistema',
            entidad_id=c.pk,
            detalles={'clave': c.clave},
        )

    def perform_destroy(self, instance):
        cid, clave = instance.pk, instance.clave
        instance.delete()
        registrar_bitacora(
            self.request.user,
            'config_eliminada',
            request=self.request,
            entidad_tipo='ConfiguracionSistema',
            entidad_id=cid,
            detalles={'clave': clave},
        )


class BitacoraViewSet(ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, EsAdministrador]
    queryset = BitacoraAuditoria.objects.select_related('usuario').all().order_by('-creado_en')
    serializer_class = BitacoraAdminSerializer
    filterset_fields = ('usuario', 'accion', 'entidad_tipo')
