from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Usuario, Rol, Permiso, RolPermiso, ConfiguracionSistema, BitacoraAuditoria


def _permisos_nombres_usuario(user):
    if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
        return list(Permiso.objects.values_list('nombre', flat=True))
    rol = getattr(user, 'rol', None)
    if not rol:
        return []
    return list(
        rol.permisos_asignados.values_list('permiso__nombre', flat=True).distinct()
    )


class UsuarioTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = Usuario.USERNAME_FIELD

    def validate(self, attrs):
        from django.utils import timezone
        from .audit import registrar_bitacora

        data = super().validate(attrs)
        user = self.user
        user.ultimo_login = timezone.now()
        user.save(update_fields=['ultimo_login'])
        request = self.context.get('request')
        registrar_bitacora(
            user,
            'login',
            request=request,
            detalles={'email': user.email},
        )
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['nombre'] = user.nombre
        token['rol_nombre'] = user.rol.nombre if user.rol else None
        token['permisos'] = _permisos_nombres_usuario(user)
        return token


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ('id', 'nombre', 'descripcion', 'es_activo')


class UsuarioSerializer(serializers.ModelSerializer):
    rol_nombre = serializers.CharField(source='rol.nombre', read_only=True)

    class Meta:
        model = Usuario
        fields = (
            'id', 'email', 'nombre', 'apellido', 'telefono', 'avatar_url',
            'rol', 'rol_nombre', 'es_activo', 'creado_en'
        )
        read_only_fields = ('email', 'creado_en')


class UsuarioRegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Usuario
        fields = ('email', 'nombre', 'apellido', 'password', 'telefono')

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Usuario.objects.create_user(**validated_data, password=password)
        return user




class ConfiguracionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionSistema
        fields = ('id', 'clave', 'valor', 'tipo_dato', 'descripcion')


class BitacoraSerializer(serializers.ModelSerializer):
    usuario_email = serializers.CharField(source='usuario.email', read_only=True, allow_null=True)

    class Meta:
        model = BitacoraAuditoria
        fields = ('id', 'usuario', 'usuario_email', 'accion', 'entidad_tipo', 'entidad_id', 'detalles', 'creado_en')


class BitacoraAdminSerializer(BitacoraSerializer):
    class Meta(BitacoraSerializer.Meta):
        fields = BitacoraSerializer.Meta.fields + ('direccion_ip', 'user_agent')


class UsuarioPerfilSerializer(serializers.ModelSerializer):
    rol_nombre = serializers.CharField(source='rol.nombre', read_only=True, allow_null=True)
    permisos = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = (
            'id', 'email', 'nombre', 'apellido', 'telefono', 'avatar_url',
            'preferencias_comunicacion', 'rol', 'rol_nombre', 'is_staff', 'permisos',
        )
        read_only_fields = ('email', 'permisos')

    def get_permisos(self, obj):
        return _permisos_nombres_usuario(obj)


class PermisoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permiso
        fields = ('id', 'nombre', 'modulo', 'descripcion')


class RolConPermisosSerializer(serializers.ModelSerializer):
    permisos = PermisoSerializer(many=True, read_only=True)
    permiso_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = Rol
        fields = ('id', 'nombre', 'descripcion', 'es_activo', 'permisos', 'permiso_ids')

    def update(self, instance, validated_data):
        permiso_ids = validated_data.pop('permiso_ids', None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if permiso_ids is not None:
            RolPermiso.objects.filter(rol=instance).delete()
            for pid in permiso_ids:
                try:
                    perm = Permiso.objects.get(pk=pid)
                    RolPermiso.objects.create(rol=instance, permiso=perm)
                except Permiso.DoesNotExist:
                    pass
        return instance


class UsuarioAdminSerializer(serializers.ModelSerializer):
    """Para crear/editar usuarios desde admin. Soporta password y creación de Cliente/Personal."""
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    rol_nombre = serializers.CharField(source='rol.nombre', read_only=True)
    crear_cliente = serializers.BooleanField(write_only=True, required=False, default=False)
    crear_personal = serializers.BooleanField(write_only=True, required=False, default=False)
    tipo_cliente = serializers.ChoiceField(
        choices=[('residencial', 'Residencial'), ('empresarial', 'Empresarial')],
        write_only=True, required=False
    )
    tipo_personal = serializers.ChoiceField(
        choices=[('conductor', 'Conductor'), ('cargador', 'Cargador')],
        write_only=True, required=False
    )
    numero_licencia = serializers.CharField(write_only=True, required=False)
    tipo_licencia = serializers.CharField(write_only=True, required=False)
    fecha_ingreso = serializers.DateField(write_only=True, required=False)
    salario_mensual = serializers.DecimalField(
        max_digits=10, decimal_places=2, write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = Usuario
        fields = (
            'id', 'email', 'nombre', 'apellido', 'telefono', 'rol', 'rol_nombre',
            'es_activo', 'password', 'creado_en',
            'crear_cliente', 'tipo_cliente', 'crear_personal', 'tipo_personal',
            'numero_licencia', 'tipo_licencia', 'fecha_ingreso', 'salario_mensual',
        )
        read_only_fields = ('creado_en',)
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        from apps.clientes.models import Cliente
        from apps.personal.models import Personal

        password = validated_data.pop('password', None)
        crear_cliente = validated_data.pop('crear_cliente', False)
        crear_personal = validated_data.pop('crear_personal', False)
        tipo_cliente = validated_data.pop('tipo_cliente', 'residencial')
        tipo_personal = validated_data.pop('tipo_personal', 'conductor')
        numero_licencia = validated_data.pop('numero_licencia', '')
        tipo_licencia = validated_data.pop('tipo_licencia', '')
        fecha_ingreso = validated_data.pop('fecha_ingreso', None)
        salario_mensual = validated_data.pop('salario_mensual', None)

        if not password:
            raise serializers.ValidationError({'password': 'La contraseña es obligatoria al crear usuario.'})
        user = Usuario.objects.create_user(**validated_data, password=password)

        if crear_cliente:
            Cliente.objects.create(usuario=user, tipo_cliente=tipo_cliente)

        if crear_personal and fecha_ingreso:
            Personal.objects.create(
                usuario=user,
                tipo_personal=tipo_personal,
                numero_licencia=numero_licencia,
                tipo_licencia=tipo_licencia,
                fecha_ingreso=fecha_ingreso,
                salario_mensual=salario_mensual,
            )

        return user

    def update(self, instance, validated_data):
        validated_data.pop('crear_cliente', None)
        validated_data.pop('crear_personal', None)
        validated_data.pop('tipo_cliente', None)
        validated_data.pop('tipo_personal', None)
        validated_data.pop('numero_licencia', None)
        validated_data.pop('tipo_licencia', None)
        validated_data.pop('fecha_ingreso', None)
        validated_data.pop('salario_mensual', None)
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance
