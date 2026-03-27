"""
Sistema de permisos granulares basado en rol_permisos.
"""
from rest_framework.permissions import BasePermission


def _rol_slug(user):
    rol = getattr(user, 'rol', None)
    return (rol.nombre or '').lower() if rol else ''


class EsAdministrador(BasePermission):
    """Rol administrador del sistema (W4, W5, W8): admin, administrador o staff/superuser."""

    def has_permission(self, request, view):
        u = request.user
        if not u.is_authenticated:
            return False
        if u.is_superuser or u.is_staff:
            return True
        return _rol_slug(u) in ('admin', 'administrador')


class EsAdminOOperador(BasePermission):
    """Administrador u operativo (p. ej. gestión de usuarios sin tocar roles globales)."""

    def has_permission(self, request, view):
        u = request.user
        if not u.is_authenticated:
            return False
        if u.is_superuser or u.is_staff:
            return True
        return _rol_slug(u) in ('admin', 'administrador', 'operador')


class TieneAlgunoDe(BasePermission):
    """True si el rol tiene al menos uno de los permisos listados (staff/superuser siempre)."""

    def __init__(self, *permisos):
        self.permisos = frozenset(permisos)

    def has_permission(self, request, view):
        u = request.user
        if not u.is_authenticated:
            return False
        if u.is_superuser or u.is_staff:
            return True
        rol = getattr(u, 'rol', None)
        if not rol:
            return False
        nombres = set(rol.permisos_asignados.values_list('permiso__nombre', flat=True))
        return bool(nombres & self.permisos)


class TienePermiso(BasePermission):
    """
    Verifica que el usuario tenga el permiso especificado
    en la tabla rol_permisos del sistema.
    """
    def __init__(self, permiso_requerido):
        self.permiso_requerido = permiso_requerido

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        u = request.user
        if u.is_superuser or u.is_staff:
            return True
        if not getattr(u, 'rol', None):
            return False
        return u.rol.permisos_asignados.filter(
            permiso__nombre=self.permiso_requerido
        ).exists()


def requiere_permiso(nombre_permiso):
    """Decorator factory para usar en views."""
    class PermisoEspecifico(BasePermission):
        def has_permission(self, request, view):
            u = request.user
            if not u.is_authenticated:
                return False
            if u.is_superuser or u.is_staff:
                return True
            if not getattr(u, 'rol', None):
                return False
            return u.rol.permisos_asignados.filter(
                permiso__nombre=nombre_permiso
            ).exists()
    return PermisoEspecifico
