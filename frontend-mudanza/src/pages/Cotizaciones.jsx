import { useState, useEffect } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormSelect from '../components/FormSelect'
import { useAuth } from '../context/AuthContext'

export default function Cotizaciones() {
  const { hasRole, isAdmin } = useAuth()
  const isCliente = hasRole('cliente')
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, cot: null })
  const [formModal, setFormModal] = useState({ open: false, cot: null })
  const [clientes, setClientes] = useState([])
  const [zonas, setZonas] = useState([])
  const [tiposServicio, setTiposServicio] = useState([])
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const fetch = () => {
    setLoading(true)
    api.get('/cotizaciones/')
      .then(({ data }) => setCotizaciones(data.results ?? data ?? []))
      .catch(() => setCotizaciones([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch()
    if (!isCliente) {
      api.get('/clientes/').then(({ data }) => setClientes(data.results ?? data ?? [])).catch(() => {})
      api.get('/zonas/').then(({ data }) => setZonas(data.results ?? data ?? [])).catch(() => {})
      api.get('/servicios/tipos/').then(({ data }) => setTiposServicio(data.results ?? data ?? [])).catch(() => {})
    }
  }, [isCliente])

  const isEditing = !!formModal.cot?.id

  const openCreate = () => {
    setFormModal({ open: true, cot: null })
    setForm({
      cliente: '',
      direccion_origen: '',
      zona_origen: '',
      direccion_destino: '',
      zona_destino: '',
      tipo_servicio: '',
      fecha_deseada: '',
      franja_horaria: '',
    })
    setErrors({})
  }

  const openEdit = (c) => {
    if (c.estado !== 'borrador') return
    setFormModal({ open: true, cot: c })
    setForm({
      cliente: c.cliente,
      direccion_origen: c.direccion_origen || '',
      zona_origen: c.zona_origen || '',
      direccion_destino: c.direccion_destino || '',
      zona_destino: c.zona_destino || '',
      tipo_servicio: c.tipo_servicio || '',
      fecha_deseada: c.fecha_deseada ? c.fecha_deseada.slice(0, 10) : '',
      franja_horaria: c.franja_horaria || '',
    })
    setErrors({})
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    const payload = {
      cliente: parseInt(form.cliente),
      direccion_origen: form.direccion_origen,
      zona_origen: form.zona_origen ? parseInt(form.zona_origen) : null,
      direccion_destino: form.direccion_destino,
      zona_destino: form.zona_destino ? parseInt(form.zona_destino) : null,
      tipo_servicio: parseInt(form.tipo_servicio),
      fecha_deseada: form.fecha_deseada || null,
      franja_horaria: form.franja_horaria || '',
    }
    const req = isEditing
      ? api.patch(`/cotizaciones/${formModal.cot.id}/`, payload)
      : api.post('/cotizaciones/', payload)
    req
      .then((res) => {
        const id = res.data?.id
        fetch()
        setFormModal({ open: false, cot: null })
        if (!isEditing && id) api.post(`/cotizaciones/${id}/calcular_precio/`).catch(() => {})
      })
      .catch((err) => setErrors(err.response?.data || {}))
      .finally(() => setSaving(false))
  }

  const enviar = (id) => {
    // Según flujo Fase 3: operador envía cotización con precio final
    api.post(`/cotizaciones/${id}/enviar/`).then(() => fetch())
  }

  const aceptar = (id) => {
    // Según flujo Fase 3: solo el CLIENTE acepta (genera reserva automáticamente)
    if (!isCliente) {
      alert('Solo el cliente puede aceptar la cotización')
      return
    }
    api.post(`/cotizaciones/${id}/aceptar/`).then(() => {
      alert('Cotización aceptada. Se generó tu reserva automáticamente.')
      fetch()
    })
  }

  const rechazar = (id) => {
    // Cliente rechaza cotización
    if (!isCliente) {
      alert('Solo el cliente puede rechazar la cotización')
      return
    }
    api.post(`/cotizaciones/${id}/rechazar/`).then(() => fetch())
  }

  const recalcular = (id) => {
    api.post(`/cotizaciones/${id}/calcular_precio/`).then(() => fetch())
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'estado', label: 'Estado' },
    { key: 'precio_total_calculado', label: 'Precio', render: (r) => `Bs ${r.precio_total_calculado || 0}` },
    { key: 'creado_en', label: 'Fecha', render: (r) => new Date(r.creado_en).toLocaleDateString('es-BO') },
  ]

  const clientesOptions = isCliente ? [] : clientes

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cotizaciones</h1>
        {!isCliente && (
          <button onClick={openCreate} className="px-4 py-2 bg-amber-500 text-slate-900 font-medium rounded-lg hover:bg-amber-400">
            + Nueva cotización
          </button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={cotizaciones}
        loading={loading}
        onRowClick={(c) => setModal({ open: true, cot: c })}
        onEdit={!isCliente ? openEdit : undefined}
      />
      <Modal open={modal.open} onClose={() => setModal({ open: false, cot: null })} title={modal.cot ? `Cotización #${modal.cot.id}` : ''} size="lg">
        {modal.cot && (
          <div className="space-y-4 text-slate-300">
            <p><span className="text-slate-500">Cliente:</span> {modal.cot.cliente_nombre}</p>
            <p><span className="text-slate-500">Estado:</span> {modal.cot.estado}</p>
            <p><span className="text-slate-500">Precio total:</span> Bs {modal.cot.precio_total_calculado || 0}</p>
            <p><span className="text-slate-500">Dirección origen:</span> {modal.cot.direccion_origen}</p>
            <p><span className="text-slate-500">Dirección destino:</span> {modal.cot.direccion_destino}</p>
            <div className="flex flex-wrap gap-2 pt-4">
              {modal.cot.estado === 'borrador' && !isCliente && (
                <>
                  <button onClick={() => recalcular(modal.cot.id)} className="px-3 py-1 text-sm bg-slate-600 hover:bg-slate-500 rounded-lg">
                    Recalcular precio
                  </button>
                  <button onClick={() => enviar(modal.cot.id)} className="px-3 py-1 text-sm bg-amber-500 text-slate-900 rounded-lg font-medium">
                    Enviar al cliente
                  </button>
                </>
              )}
              {modal.cot.estado === 'enviada' && isCliente && (
                <>
                  <button onClick={() => aceptar(modal.cot.id)} className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 rounded-lg">
                    Aceptar Cotización
                  </button>
                  <button onClick={() => rechazar(modal.cot.id)} className="px-3 py-1 text-sm bg-red-600 hover:bg-red-500 rounded-lg">
                    Rechazar
                  </button>
                </>
              )}
              {modal.cot.estado === 'aceptada' && (
                <p className="text-green-500 text-sm">
                  ✓ Cotización aceptada. La reserva fue generada automáticamente.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={formModal.open} onClose={() => setFormModal({ open: false, cot: null })} title={isEditing ? 'Editar cotización' : 'Nueva cotización'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSelect label="Cliente" name="cliente" value={form.cliente} onChange={handleChange} required options={clientesOptions} labelKey={(c) => `${c.usuario_nombre} (${c.usuario_email})`} error={errors.cliente} />
          <FormInput label="Dirección origen" name="direccion_origen" value={form.direccion_origen} onChange={handleChange} required />
          <FormSelect label="Zona origen" name="zona_origen" value={form.zona_origen} onChange={handleChange} options={zonas} labelKey="nombre" />
          <FormInput label="Dirección destino" name="direccion_destino" value={form.direccion_destino} onChange={handleChange} required />
          <FormSelect label="Zona destino" name="zona_destino" value={form.zona_destino} onChange={handleChange} options={zonas} labelKey="nombre" />
          <FormSelect label="Tipo de servicio" name="tipo_servicio" value={form.tipo_servicio} onChange={handleChange} required options={tiposServicio} labelKey="nombre" error={errors.tipo_servicio} />
          <FormInput label="Fecha deseada" name="fecha_deseada" type="date" value={form.fecha_deseada} onChange={handleChange} />
          <FormInput label="Franja horaria" name="franja_horaria" value={form.franja_horaria} onChange={handleChange} placeholder="Ej: 08:00-12:00" />
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setFormModal({ open: false, cot: null })} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-amber-500 text-slate-900 font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50">{saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
