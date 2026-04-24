from django.core.management.base import BaseCommand
from apps.usuarios.models import Usuario
from apps.personal.models import Personal


class Command(BaseCommand):
    help = 'Migra usuarios con rol conductor/cargador a registros de Personal'

    def handle(self, *args, **options):
        # Obtener usuarios con rol conductor o cargador que no tengan Personal
        usuarios_sin_personal = Usuario.objects.filter(
            rol__nombre__in=['conductor', 'cargador']
        ).exclude(
            perfil_personal__isnull=False
        )

        if not usuarios_sin_personal.exists():
            self.stdout.write(self.style.SUCCESS('No hay usuarios nuevos para migrar a Personal.'))
            return

        self.stdout.write(f'Encontrados {usuarios_sin_personal.count()} usuarios para migrar.')

        for usuario in usuarios_sin_personal:
            # Usar la fecha de creación del usuario como fecha_ingreso
            fecha_ingreso = usuario.creado_en.date()

            # Crear el registro Personal
            personal = Personal.objects.create(
                usuario=usuario,
                tipo_personal=usuario.rol.nombre,  # conductor o cargador
                fecha_ingreso=fecha_ingreso,
                esta_disponible=True,
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Creado Personal para {usuario.nombre_completo} ({usuario.email}) - Tipo: {personal.tipo_personal}'
                )
            )

        self.stdout.write(self.style.SUCCESS('Migración completada.'))