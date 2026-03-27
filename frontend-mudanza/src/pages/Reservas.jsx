import { useState, useEffect } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormSelect from '../components/FormSelect'
import { useAuth } from '../context/AuthContext'

export default function Reservas() {
  const { isAdmin } = useAuth()
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, r: null })

  const fetch = () => {
    setLoading(true)
    api.get('/reservas/')
      .then(({ data }) => setReservas(data.results ?? data ?? []))
      .catch(() => setReservas([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch()
  }, [])

  const cancelar = (r) => {
    const motivo = window.prompt('Motivo de cancelación (opcional):')
    api.post(`/reservas/${r.id}/cancelar/`, { motivo_cancelacion: motivo || '' }).then(() => fetch())
  }

  const columns = [
    { key: 'codigo_confirmacion', label: 'Código' },
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'fecha_servicio', label: 'Fecha' },
    { key: 'estado', label: 'Estado' },
    { key: 'franja_horaria', label: 'Franja' },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reservas</h1>
        <div className="text-sm text-slate-400">
          Las reservas se generan automáticamente cuando el cliente acepta una cotización
        </div>
      </div>
      <DataTable
        columns={columns}
        data={reservas}
        loading={loading}
        onRowClick={(r) => setModal({ open: true, r })}
        extraActions={
          isAdmin()
            ? (r) => {
                const acts = []
                if (r.estado !== 'cancelada' && r.estado !== 'completada') {
                  acts.push({
                    label: 'Cancelar',
                    onClick: () => cancelar(r),
                    className: 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  })
                }
                return acts
              }
            : []
        }
      />
      <Modal open={modal.open} onClose={() => setModal({ open: false, r: null })} title={modal.r ? `Reserva ${modal.r.codigo_confirmacion}` : ''}>
        {modal.r && (
          <div className="space-y-2 text-slate-300">
            <p><span className="text-slate-500">Código:</span> {modal.r.codigo_confirmacion}</p>
            <p><span className="text-slate-500">Cliente:</span> {modal.r.cliente_nombre}</p>
            <p><span className="text-slate-500">Fecha:</span> {modal.r.fecha_servicio}</p>
            <p><span className="text-slate-500">Estado:</span> <span className={modal.r.estado === 'confirmada' ? 'text-green-400' : modal.r.estado === 'pendiente' ? 'text-yellow-400' : ''}>{modal.r.estado}</span></p>
            <p><span className="text-slate-500">Franja:</span> {modal.r.franja_horaria}</p>
            {modal.r.estado === 'pendiente' && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400">
                ⏳ Esperando pago del depósito. La reserva se confirmará automáticamente cuando se verifique el pago.
              </div>
            )}
            {modal.r.estado === 'confirmada' && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400">
                ✓ Reserva confirmada. El depósito fue verificado.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}