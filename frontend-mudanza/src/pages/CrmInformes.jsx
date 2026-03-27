import { useEffect, useState } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import FormInput from '../components/FormInput'
import FormTextarea from '../components/FormTextarea'
import Modal from '../components/Modal'

function Bar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm text-slate-400 mb-1">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function CrmInformes() {
  const [metricas, setMetricas] = useState(null)
  const [segmentos, setSegmentos] = useState([])
  const [segModal, setSegModal] = useState({ open: false, s: null })
  const [segForm, setSegForm] = useState({ nombre: '', descripcion: '', color: '#f59e0b' })
  const [loading, setLoading] = useState(true)
  const [rfMsg, setRfMsg] = useState('')
  const [err, setErr] = useState('')

  const loadMetricas = () => {
    api
      .get('/clientes/crm/reportes-comportamiento/')
      .then(({ data }) => setMetricas(data))
      .catch(() => setMetricas(null))
  }

  const loadSegmentos = () => {
    api
      .get('/clientes/segmentos/')
      .then(({ data }) => setSegmentos(data.results ?? data ?? []))
      .catch(() => setSegmentos([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadMetricas()
    loadSegmentos()
  }, [])

  const ejecutarRf = () => {
    setRfMsg('')
    api
      .post('/clientes/crm/prediccion-lealtad/')
      .then(({ data }) => {
        setRfMsg(`Actualizados: ${data.actualizados} (${data.metodo})`)
        loadMetricas()
      })
      .catch((e) => setRfMsg(e.response?.data?.detail || 'Error'))
  }

  const openSeg = (s) => {
    if (s) setSegForm({ nombre: s.nombre, descripcion: s.descripcion || '', color: s.color || '#f59e0b' })
    else setSegForm({ nombre: '', descripcion: '', color: '#f59e0b' })
    setSegModal({ open: true, s })
  }

  const saveSeg = (e) => {
    e.preventDefault()
    const req = segModal.s
      ? api.patch(`/clientes/segmentos/${segModal.s.id}/`, segForm)
      : api.post('/clientes/segmentos/', segForm)
    req.then(() => {
      loadSegmentos()
      setSegModal({ open: false, s: null })
    }).catch((e) => setErr(JSON.stringify(e.response?.data || {})))
  }

  const delSeg = (s) => {
    if (!window.confirm(`¿Eliminar segmento ${s.nombre}?`)) return
    api.delete(`/clientes/segmentos/${s.id}/`).then(loadSegmentos).catch(() => {})
  }

  const predicho = metricas?.clientes_por_segmento_predicho || {}
  const tipos = metricas?.clientes_por_tipo || {}
  const maxPred = Math.max(1, ...Object.values(predicho))
  const maxTipo = Math.max(1, ...Object.values(tipos))

  const segColumns = [
    { key: 'nombre', label: 'Segmento' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'color', label: 'Color', render: (r) => r.color && <span className="inline-block w-4 h-4 rounded" style={{ background: r.color }} /> },
  ]

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-2">Informes CRM</h1>
        <p className="text-slate-500 text-sm">W15 — Predicción de lealtad · W16 — Métricas · W13 — Segmentos</p>
      </div>

      {err && <p className="text-rose-400 text-sm">{err}</p>}

      <section className="border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Predicción de lealtad (Random Forest)</h2>
        <p className="text-slate-500 text-sm mb-4">
          Recalcula probabilidad de recompra y segmento predicho para todos los clientes.
        </p>
        <button
          type="button"
          onClick={ejecutarRf}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white text-sm font-medium"
        >
          Ejecutar modelo
        </button>
        {rfMsg && <p className="mt-3 text-emerald-400 text-sm">{rfMsg}</p>}
      </section>

      {metricas && (
        <section className="border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Comportamiento y retención (W16)</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-900/80 rounded-lg p-4">
              <p className="text-slate-500 text-sm">Clientes totales</p>
              <p className="text-2xl font-bold text-slate-100">{metricas.total_clientes}</p>
            </div>
            <div className="bg-slate-900/80 rounded-lg p-4">
              <p className="text-slate-500 text-sm">Activos (180 días)</p>
              <p className="text-2xl font-bold text-emerald-400">{metricas.clientes_activos_ultimos_180d}</p>
            </div>
            <div className="bg-slate-900/80 rounded-lg p-4">
              <p className="text-slate-500 text-sm">Posible churn (180 días)</p>
              <p className="text-2xl font-bold text-rose-400">{metricas.clientes_posible_churn_180d}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-slate-400 text-sm mb-3">Por segmento predicho (RF)</h3>
              {Object.entries(predicho).map(([k, v]) => (
                <Bar key={k} label={k || '—'} value={v} max={maxPred} color="bg-violet-500" />
              ))}
            </div>
            <div>
              <h3 className="text-slate-400 text-sm mb-3">Por tipo de cliente</h3>
              {Object.entries(tipos).map(([k, v]) => (
                <Bar key={k} label={k} value={v} max={maxTipo} color="bg-amber-500" />
              ))}
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Segmentos (W13)</h2>
          <button
            type="button"
            onClick={() => openSeg(null)}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
          >
            + Nuevo segmento
          </button>
        </div>
        <DataTable
          columns={segColumns}
          data={segmentos}
          loading={loading}
          onEdit={(s) => openSeg(s)}
          onDelete={delSeg}
        />
      </section>

      <Modal open={segModal.open} onClose={() => setSegModal({ open: false, s: null })} title={segModal.s ? 'Editar segmento' : 'Nuevo segmento'}>
        <form onSubmit={saveSeg} className="space-y-3">
          <FormInput label="Nombre" value={segForm.nombre} onChange={(e) => setSegForm({ ...segForm, nombre: e.target.value })} required />
          <FormTextarea label="Descripción" value={segForm.descripcion} onChange={(e) => setSegForm({ ...segForm, descripcion: e.target.value })} />
          <FormInput label="Color (#hex)" value={segForm.color} onChange={(e) => setSegForm({ ...segForm, color: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="submit" className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
