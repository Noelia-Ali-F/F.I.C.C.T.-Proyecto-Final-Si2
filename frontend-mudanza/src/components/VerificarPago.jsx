import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import apiClient from '../api/client';

const VerificarPago = ({ pago, onVerificado }) => {
  const [loading, setLoading] = useState(false);

  const handleVerificar = async () => {
    if (!window.confirm('¿Confirmar que el pago es válido?')) return;

    setLoading(true);
    try {
      await apiClient.post(`/pagos/${pago.id}/verificar/`);
      alert('Pago verificado exitosamente. Se generó la factura automáticamente.');
      onVerificado?.();
    } catch (error) {
      console.error('Error al verificar pago:', error);
      alert('Error al verificar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleRechazar = async () => {
    if (!window.confirm('¿Rechazar este pago? El cliente deberá volver a subir el comprobante.'))
      return;

    setLoading(true);
    try {
      await apiClient.post(`/pagos/${pago.id}/rechazar/`);
      alert('Pago rechazado. Se notificó al cliente.');
      onVerificado?.();
    } catch (error) {
      console.error('Error al rechazar pago:', error);
      alert('Error al rechazar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verificar-pago max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Verificación de Pago</h2>

      {/* Información del pago */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Reserva:</span>{' '}
            <span className="font-medium">{pago.reserva_codigo}</span>
          </div>
          <div>
            <span className="text-gray-600">Tipo:</span>{' '}
            <span className="font-medium capitalize">{pago.tipo_pago}</span>
          </div>
          <div>
            <span className="text-gray-600">Método:</span>{' '}
            <span className="font-medium">{pago.metodo_nombre}</span>
          </div>
          <div>
            <span className="text-gray-600">Monto:</span>{' '}
            <span className="font-bold text-lg">
              Bs {parseFloat(pago.monto).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Fecha subida:</span>{' '}
            <span className="font-medium">
              {format(new Date(pago.creado_en), "d 'de' MMMM, h:mm a", { locale: es })}
            </span>
          </div>
          {pago.referencia_transaccion && (
            <div>
              <span className="text-gray-600">Referencia:</span>{' '}
              <span className="font-medium font-mono text-xs">{pago.referencia_transaccion}</span>
            </div>
          )}
        </div>
      </div>

      {/* Comprobante */}
      {pago.comprobante && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Comprobante</h3>
          <div className="border rounded-lg overflow-hidden">
            <img
              src={pago.comprobante}
              alt="Comprobante de pago"
              className="w-full h-auto"
              style={{ maxHeight: '600px', objectFit: 'contain' }}
            />
          </div>
          <a
            href={pago.comprobante}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-blue-600 hover:underline"
          >
            Abrir en nueva ventana →
          </a>
        </div>
      )}

      {/* Checklist de verificación */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold mb-3 text-yellow-800">Checklist de Verificación</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <input type="checkbox" className="mt-1 mr-2" />
            <span>El monto coincide con lo esperado (Bs {parseFloat(pago.monto).toFixed(2)})</span>
          </li>
          <li className="flex items-start">
            <input type="checkbox" className="mt-1 mr-2" />
            <span>La fecha de transferencia es reciente</span>
          </li>
          <li className="flex items-start">
            <input type="checkbox" className="mt-1 mr-2" />
            <span>El número de referencia es válido (si aplica)</span>
          </li>
          <li className="flex items-start">
            <input type="checkbox" className="mt-1 mr-2" />
            <span>El comprobante es legible y auténtico</span>
          </li>
          <li className="flex items-start">
            <input type="checkbox" className="mt-1 mr-2" />
            <span>La cuenta de destino es correcta</span>
          </li>
        </ul>
      </div>

      {/* Información adicional según tipo de pago */}
      {pago.tipo_pago === 'deposito' && (
        <div className="mb-6 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
          <p>
            ℹ️ Al verificar este depósito, la reserva pasará automáticamente a estado{' '}
            <strong>CONFIRMADA</strong> y se generará la factura del depósito.
          </p>
        </div>
      )}

      {pago.tipo_pago === 'saldo' && (
        <div className="mb-6 p-3 bg-green-50 rounded-lg text-sm text-green-800">
          <p>
            ℹ️ Al verificar este pago de saldo, se generará la factura final y el servicio quedará
            cerrado.
          </p>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-4">
        <button
          onClick={handleVerificar}
          disabled={loading}
          className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? 'Verificando...' : '✓ Verificar Pago'}
        </button>
        <button
          onClick={handleRechazar}
          disabled={loading}
          className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400"
        >
          {loading ? 'Rechazando...' : '✗ Rechazar'}
        </button>
      </div>
    </div>
  );
};

export default VerificarPago;
