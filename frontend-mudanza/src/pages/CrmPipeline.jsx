import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

const labelsCot = {
  borrador: 'Borrador',
  enviada: 'Enviada (lead)',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  expirada: 'Expirada',
}

const labelsRes = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  en_proceso: 'En proceso',
  completada: 'Completada',
  cancelada: 'Cancelada',
  reprogramada: 'Reprogramada',
}

export default function CrmPipeline() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/clientes/crm/pipeline/')
      .then(({ data: d }) => setData(d))
      .catch((e) => setError(e.response?.data?.detail || 'Sin acceso o error al cargar'))
  }, [])

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Pipeline CRM</h1>
        <p className="text-rose-400">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const cot = data.cotizaciones_por_estado || {}
  const res = data.reservas_por_estado || {}

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Pipeline de solicitudes</h1>
      <p className="text-slate-500 text-sm mb-6">
        Flujo tipo lead → confirmación → operación (W11). Usa{' '}
        <Link to="/cotizaciones" className="text-amber-400 hover:underline">Cotizaciones</Link>
        {' '}y{' '}
        <Link to="/reservas" className="text-amber-400 hover:underline">Reservas</Link>
        {' '}para mover estados.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <section className="border border-slate-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-amber-400/90 mb-4">Cotizaciones</h2>
          <ul className="space-y-2">
            {Object.entries(cot).map(([k, v]) => (
              <li key={k} className="flex justify-between text-slate-300 border-b border-slate-800/80 py-2">
                <span>{labelsCot[k] || k}</span>
                <span className="font-mono text-amber-200">{v}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="border border-slate-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-emerald-400/90 mb-4">Reservas (mudanzas)</h2>
          <ul className="space-y-2">
            {Object.entries(res).map(([k, v]) => (
              <li key={k} className="flex justify-between text-slate-300 border-b border-slate-800/80 py-2">
                <span>{labelsRes[k] || k}</span>
                <span className="font-mono text-emerald-200">{v}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
