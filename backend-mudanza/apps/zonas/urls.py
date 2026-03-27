from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ZonaViewSet, TarifaDistanciaViewSet

router = DefaultRouter()
router.register(r'', ZonaViewSet, basename='zona')
router.register(r'tarifas', TarifaDistanciaViewSet, basename='tarifa')

urlpatterns = [
    path('', include(router.urls)),
]
