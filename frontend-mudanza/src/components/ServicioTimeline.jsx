import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ServicioTimeline = ({ servicio, historialEstados }) => {
  const estados = [
    { key: 'asignado', label: 'Asignado', icon: '📋' },
    { key: 'en_camino', label: 'En Camino', icon: '🚗' },
    { key: 'en_origen', label: 'En Origen', icon: '📍' },
    { key: 'cargando', label: 'Cargando', icon: '📦' },
    { key: 'en_ruta', label: 'En Ruta', icon: '🚚' },
    { key: 'en_destino', label: 'En Destino', icon: '🏁' },
    { key: 'descargando', label: 'Descargando', icon: '📤' },
    { key: 'completado', label: 'Completado', icon: '✅' },
  ];

  const estadoActual = servicio.estado;
  const indexActual = estados.findIndex(e => e.key === estadoActual);

  const obtenerInfoEstado = (estadoKey) => {
    const historial = historialEstados?.find(h => h.estado_nuevo === estadoKey);
    return historial;
  };

  return (
    <div className="servicio-timeline">
      <h3 className="text-lg font-semibold mb-4">Estado de tu mudanza</h3>
      <div className="relative">
        {/* Línea vertical */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {estados.map((estado, index) => {
          const info = obtenerInfoEstado(estado.key);
          const completado = index <= indexActual;
          const activo = estado.key === estadoActual;

          return (
            <div
              key={estado.key}
              className={`relative flex items-start mb-6 ${
                completado ? 'opacity-100' : 'opacity-40'
              }`}
            >
              {/* Icono */}
              <div
                className={`z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                  activo
                    ? 'bg-blue-500 border-blue-500 text-white scale-110 shadow-lg'
                    : completado
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                <span className="text-xl">{estado.icon}</span>
              </div>

              {/* Contenido */}
              <div className="ml-4 flex-1">
                <h4
                  className={`font-medium ${
                    activo ? 'text-blue-600 font-bold' : completado ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {estado.label}
                  {activo && <span className="ml-2 text-sm">(Actual)</span>}
                </h4>
                {info && (
                  <div className="mt-1 text-sm text-gray-600">
                    <p className="font-medium">
                      {format(new Date(info.creado_en), "d 'de' MMMM, h:mm a", { locale: es })}
                    </p>
                    {info.latitud && info.longitud && (
                      <p className="text-xs text-gray-500">
                        📍 {info.latitud.toFixed(4)}, {info.longitud.toFixed(4)}
                      </p>
                    )}
                    {info.notas && <p className="text-xs mt-1 italic">{info.notas}</p>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {servicio.duracion_minutos && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Duración total:</strong> {Math.floor(servicio.duracion_minutos / 60)}h{' '}
            {servicio.duracion_minutos % 60}min
          </p>
          {servicio.rf_tiempo_estimado_min && (
            <p className="text-xs text-gray-500 mt-1">
              Tiempo estimado por IA: {Math.floor(servicio.rf_tiempo_estimado_min / 60)}h{' '}
              {servicio.rf_tiempo_estimado_min % 60}min
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ServicioTimeline;
