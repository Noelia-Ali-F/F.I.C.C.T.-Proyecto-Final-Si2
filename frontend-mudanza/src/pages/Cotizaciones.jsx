import { useState, useEffect } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormSelect from '../components/FormSelect'
import { useAuth } from '../context/AuthContext'
import { toastApiError, toastMessage, toastSuccess } from '../utils/apiToast'
import { PAGE_SIZE, parsePagedResponse } from '../utils/paging'

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
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const fetch = () => {
    setLoading(true)
    api
      .get('/cotizaciones/', { params: { page } })
      .then(({ data }) => {
        const { results, count } = parsePagedResponse(data)
        setCotizaciones(results)
        setTotalCount(count)
      })
      .catch(() => {
        setCotizaciones([])
        setTotalCount(0)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch()
  }, [page])

  useEffect(() => {
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
        toastSuccess(isEditing ? 'Cotización actualizada' : 'Cotización creada')
        fetch()
        setFormModal({ open: false, cot: null })
        if (!isEditing && id) api.post(`/cotizaciones/${id}/calcular-precio/`).catch(() => {})
      })
      .catch((err) => {
        setErrors(err.response?.data || {})
        toastApiError(err)
      })
      .finally(() => setSaving(false))
  }

  const enviar = (id) => {
    // Según flujo Fase 3: operador envía cotización con precio final
    api
      .post(`/cotizaciones/${id}/enviar/`)
      .then(() => {
        toastSuccess('Cotización enviada al cliente')
        fetch()
      })
      .catch((err) => toastApiError(err, 'Error al enviar la cotización'))
  }

  const aceptar = (id) => {
    // Según flujo Fase 3: solo el CLIENTE acepta (genera reserva automáticamente)
    if (!isCliente) {
      toastMessage('Solo el cliente puede aceptar la cotización')
      return
    }
    api
      .post(`/cotizaciones/${id}/aceptar/`)
      .then(() => {
        toastSuccess('Cotización aceptada. Se generó tu reserva automáticamente.')
        fetch()
      })
      .catch((err) => toastApiError(err, 'No se pudo aceptar la cotización'))
  }

  const rechazar = (id) => {
    // Cliente rechaza cotización
    if (!isCliente) {
      toastMessage('Solo el cliente puede rechazar la cotización')
      return
    }
    api
      .post(`/cotizaciones/${id}/rechazar/`)
      .then(() => {
        toastSuccess('Cotización rechazada')
        fetch()
      })
      .catch((err) => toastApiError(err, 'No se pudo rechazar la cotización'))
  }

  const recalcular = (id) => {
    api
      .post(`/cotizaciones/${id}/calcular-precio/`)
      .then(() => {
        toastSuccess('Precio recalculado')
        fetch()
      })
      .catch((err) => toastApiError(err, 'Error al recalcular'))
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
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Cotizaciones</h1>
          <p className="page-subtitle max-w-2xl">Seguimiento de propuestas y estados hasta la reserva.</p>
        </div>
        {!isCliente && (
          <button type="button" onClick={openCreate} className="btn-primary shrink-0">
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
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          totalCount,
          loading,
          onPageChange: setPage,
        }}
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
                  <button type="button" onClick={() => recalcular(modal.cot.id)} className="btn-secondary btn-primary-sm">
                    Recalcular precio
                  </button>
                  <button type="button" onClick={() => enviar(modal.cot.id)} className="btn-primary btn-primary-sm">
                    Enviar al cliente
                  </button>
                </>
              )}
              {modal.cot.estado === 'enviada' && isCliente && (
                <>
                  <button type="button" onClick={() => aceptar(modal.cot.id)} className="btn-primary btn-primary-sm">
                    Aceptar cotización
                  </button>
                  <button type="button" onClick={() => rechazar(modal.cot.id)} className="btn-danger btn-primary-sm">
                    Rechazar
                  </button>
                </>
              )}
              {modal.cot.estado === 'aceptada' && (
                <p className="text-sm text-success-400">
                  Cotización aceptada. La reserva fue generada automáticamente.
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
            <button type="button" onClick={() => setFormModal({ open: false, cot: null })} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
