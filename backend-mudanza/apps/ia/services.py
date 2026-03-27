from decimal import Decimal
from django.utils import timezone
from .models import RFModelo, RFRetroalimentacion


class RandomForestService:
    """Servicio para predicciones con Random Forest"""

    @staticmethod
    def obtener_modelo_activo(nombre_modelo):
        """Obtiene el modelo activo por nombre"""
        try:
            return RFModelo.objects.filter(
                nombre_modelo=nombre_modelo,
                es_activo=True
            ).latest('entrenado_en')
        except RFModelo.DoesNotExist:
            return None

    @staticmethod
    def clasificar_riesgo_objeto(objeto):
        """
        Clasifica el riesgo de daño de un objeto usando Random Forest

        NOTA: Esta es una implementación simulada. En producción, aquí se cargaría
        el modelo real desde ml_models/ usando joblib y se haría la predicción.
        """
        modelo = RandomForestService.obtener_modelo_activo('clasificacion_riesgo')

        # Calcular features
        volumen = objeto.volumen_cm3 or 0
        peso = float(objeto.peso_kg)
        fragilidad_score = {'baja': 1, 'media': 2, 'alta': 3}[objeto.fragilidad]

        # Simulación de predicción (en producción usar el modelo real)
        # Lógica heurística basada en peso, volumen y fragilidad
        score = (peso * 0.3) + (fragilidad_score * 0.5) + (volumen / 1000000 * 0.2)

        if score > 8 or fragilidad_score == 3:
            nivel_riesgo = 'alto'
            probabilidad = min(0.99, 0.65 + (score / 30))
            proteccion = 'embalaje especial' if 'TV' in objeto.nombre or 'refrigerador' in objeto.nombre.lower() else 'caja reforzada'
        elif score > 4:
            nivel_riesgo = 'medio'
            probabilidad = 0.25 + (score / 40)
            proteccion = 'estandar'
        else:
            nivel_riesgo = 'bajo'
            probabilidad = 0.05 + (score / 100)
            proteccion = 'estandar'

        # Guardar en el objeto
        objeto.rf_nivel_riesgo = nivel_riesgo
        objeto.rf_probabilidad_dano = Decimal(str(round(probabilidad, 4)))
        objeto.rf_proteccion_sugerida = proteccion
        objeto.save(update_fields=['rf_nivel_riesgo', 'rf_probabilidad_dano', 'rf_proteccion_sugerida'])

        # Registrar retroalimentación
        if modelo:
            RFRetroalimentacion.objects.create(
                modelo=modelo,
                tipo_prediccion='riesgo',
                entidad_tipo='ObjetoMudanza',
                entidad_id=objeto.id,
                features_entrada={
                    'peso_kg': peso,
                    'volumen_cm3': volumen,
                    'fragilidad': objeto.fragilidad,
                    'categoria': objeto.categoria.nombre if objeto.categoria else None
                },
                valor_predicho={'nivel_riesgo': nivel_riesgo, 'probabilidad': float(probabilidad)},
                confianza=Decimal('0.85')
            )

        return {
            'nivel_riesgo': nivel_riesgo,
            'probabilidad_dano': float(probabilidad),
            'proteccion_sugerida': proteccion
        }

    @staticmethod
    def predecir_precio(cotizacion):
        """
        Predice el precio de una cotización usando Random Forest

        NOTA: Implementación simulada. En producción cargar modelo real.
        """
        modelo = RandomForestService.obtener_modelo_activo('prediccion_precio')

        # Features
        tarifa_base = float(cotizacion.precio_base)
        factor_servicio = float(cotizacion.tipo_servicio.factor_precio)
        volumen = float(cotizacion.volumen_total_m3)
        peso = float(cotizacion.peso_total_kg)
        cantidad_objetos = cotizacion.cantidad_objetos
        mes = cotizacion.fecha_deseada.month if cotizacion.fecha_deseada else timezone.now().month
        dia_semana = cotizacion.fecha_deseada.weekday() if cotizacion.fecha_deseada else 0

        # Simulación: agregar factor de demanda según día/mes
        factor_demanda = 1.0
        if dia_semana >= 5:  # Fin de semana
            factor_demanda += 0.15
        if mes in [11, 12, 1]:  # Fin/inicio de año
            factor_demanda += 0.10

        precio_predicho = tarifa_base * factor_servicio * factor_demanda
        precio_predicho += float(cotizacion.precio_servicios_extra or 0)

        # Guardar en cotización
        cotizacion.rf_precio_predicho = Decimal(str(round(precio_predicho, 2)))
        cotizacion.rf_confianza_precio = Decimal('0.87')
        cotizacion.save(update_fields=['rf_precio_predicho', 'rf_confianza_precio'])

        # Registrar retroalimentación
        if modelo:
            RFRetroalimentacion.objects.create(
                modelo=modelo,
                tipo_prediccion='precio',
                entidad_tipo='Cotizacion',
                entidad_id=cotizacion.id,
                features_entrada={
                    'zona_origen': cotizacion.zona_origen.nombre,
                    'zona_destino': cotizacion.zona_destino.nombre,
                    'volumen_m3': volumen,
                    'peso_kg': peso,
                    'cantidad_objetos': cantidad_objetos,
                    'tipo_servicio': cotizacion.tipo_servicio.nombre,
                    'mes': mes,
                    'dia_semana': dia_semana
                },
                valor_predicho=float(precio_predicho),
                confianza=Decimal('0.87')
            )

        return {
            'precio_predicho': float(precio_predicho),
            'confianza': 0.87
        }

    @staticmethod
    def recomendar_contenedor(servicio):
        """
        Recomienda tipo de contenedor y predice viajes/tiempo

        NOTA: Implementación simulada.
        """
        from apps.vehiculos.models import TipoContenedor

        modelo = RandomForestService.obtener_modelo_activo('recomendacion_contenedor')
        cotizacion = servicio.reserva.cotizacion

        volumen_total = float(cotizacion.volumen_total_m3)
        peso_total = float(cotizacion.peso_total_kg)

        # Simulación de recomendación
        if volumen_total <= 8 and peso_total <= 1500:
            tipo_nombre = 'pequeno'
            viajes = 1
            tiempo_min = 120
        elif volumen_total <= 15 and peso_total <= 3000:
            tipo_nombre = 'mediano'
            viajes = 1
            tiempo_min = 195
        elif volumen_total <= 25 and peso_total <= 5000:
            tipo_nombre = 'grande'
            viajes = 1
            tiempo_min = 240
        else:
            tipo_nombre = 'extra_grande'
            viajes = 1
            tiempo_min = 300

        # Buscar contenedor
        try:
            contenedor = TipoContenedor.objects.filter(nombre__icontains=tipo_nombre).first()
        except TipoContenedor.DoesNotExist:
            contenedor = None

        # Guardar en servicio
        servicio.rf_tipo_contenedor_recomendado = contenedor
        servicio.rf_viajes_predichos = viajes
        servicio.rf_tiempo_estimado_min = tiempo_min
        servicio.save(update_fields=['rf_tipo_contenedor_recomendado', 'rf_viajes_predichos', 'rf_tiempo_estimado_min'])

        # Registrar retroalimentación
        if modelo:
            RFRetroalimentacion.objects.create(
                modelo=modelo,
                tipo_prediccion='contenedor',
                entidad_tipo='ServicioMudanza',
                entidad_id=servicio.id,
                features_entrada={
                    'volumen_m3': volumen_total,
                    'peso_kg': peso_total,
                    'cantidad_objetos': cotizacion.cantidad_objetos
                },
                valor_predicho={
                    'contenedor': contenedor.nombre if contenedor else tipo_nombre,
                    'viajes': viajes,
                    'tiempo_min': tiempo_min
                },
                confianza=Decimal('0.91')
            )

        return {
            'contenedor_recomendado': contenedor,
            'viajes_predichos': viajes,
            'tiempo_estimado_min': tiempo_min
        }

    @staticmethod
    def actualizar_retroalimentacion(tipo_prediccion, entidad_id, valor_real):
        """
        Actualiza la retroalimentación con el valor real obtenido
        """
        try:
            retro = RFRetroalimentacion.objects.filter(
                tipo_prediccion=tipo_prediccion,
                entidad_id=entidad_id
            ).latest('creado_en')

            retro.valor_real = valor_real

            # Calcular error si es numérico
            if isinstance(valor_real, (int, float, Decimal)) and isinstance(retro.valor_predicho, (int, float, Decimal)):
                vp = float(retro.valor_predicho)
                vr = float(valor_real)
                retro.error_absoluto = abs(vp - vr)
                if vr != 0:
                    retro.error_porcentual = (abs(vp - vr) / vr) * 100
                retro.fue_correcto = retro.error_porcentual <= 10

            retro.save()
            return retro
        except RFRetroalimentacion.DoesNotExist:
            return None
