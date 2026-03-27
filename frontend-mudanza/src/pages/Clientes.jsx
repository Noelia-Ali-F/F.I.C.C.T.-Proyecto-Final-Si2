import { useState, useEffect } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormSelect from '../components/FormSelect'
import FormTextarea from '../components/FormTextarea'
import { useAuth } from '../context/AuthContext'

const CANALES = [
  { id: 'llamada', nombre: 'Llamada' },
  { id: 'email', nombre: 'Email' },
  { id: 'sms', nombre: 'SMS' },
  { id: 'whatsapp', nombre: 'WhatsApp' },
  { id: 'mensaje', nombre: 'Mensaje / chat' },
  { id: 'sistema', nombre: 'Sistema' },
]

const TIPOS_ALERTA = [
  { id: 'seguimiento', nombre: 'Seguimiento' },
  { id: 'reactivacion', nombre: 'Reactivación' },
  { id: 'promocion', nombre: 'Promoción' },
  { id: 'recordatorio', nombre: 'Recordatorio' },
]

export default function Clientes() {
  const { isAdmin, hasPermission } = useAuth()
  const puedeVer = () => isAdmin() || hasPermission('crm.ver_clientes')
  const puedeRegistrar = () => isAdmin() || hasPermission('crm.registro_cliente') || hasPermission('crm.editar_clientes')
  const puedeHistorial = () => isAdmin() || hasPermission('crm.historial_mudanzas')
  const puedeCom = () => isAdmin() || hasPermission('crm.log_comunicaciones')
  const puedeAlertas = () => isAdmin() || hasPermission('crm.alertas_seguimiento')
  const puedeEliminar = () => isAdmin() || hasPermission('crm.eliminar_cliente')

  const [clientes, setClientes] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [tiposServicio, setTiposServicio] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, cliente: null })
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const [ficha, setFicha] = useState({ open: false, cliente: null, tab: 'resumen' })
  const [historial, setHistorial] = useState(null)
  const [histLoad, setHistLoad] = useState(false)
  const [coms, setComs] = useState([])
  const [alerts, setAlerts] = useState([])
  const [comForm, setComForm] = useState({ canal: 'llamada', asunto: '', contenido: '', direccion: 'saliente' })
  const [alertForm, setAlertForm] = useState({
    tipo: 'seguimiento', titulo: '', descripcion: '', fecha_programada: '', estado: 'pendiente',
  })

  const fetchClientes = () => {
    setLoading(true)
    const params = search ? { search } : {}
    api.get('/clientes/', { params })
      .then(({ data }) => setClientes(data.results ?? data ?? []))
      .catch(() => setClientes([]))
      .finally(() => setLoading(false))
  }

  const fetchUsuarios = () => {
    api.get('/auth/usuarios/').then(({ data }) => setUsuarios(data.results ?? data ?? [])).catch(() => setUsuarios([]))
  }

  useEffect(() => {
    if (puedeVer()) fetchClientes()
  }, [search])

  useEffect(() => {
    if (puedeRegistrar()) {
      fetchUsuarios()
      api.get('/servicios/tipos/').then(({ data }) => setTiposServicio(data.results ?? data ?? [])).catch(() => setTiposServicio([]))
    }
  }, [])

  const loadFichaData = (clienteId) => {
    if (puedeHistorial()) {
      setHistLoad(true)
      api.get(`/clientes/${clienteId}/historial/`)
        .then(({ data }) => setHistorial(data))
        .catch(() => setHistorial(null))
        .finally(() => setHistLoad(false))
    }
    if (puedeCom()) {
      api.get('/clientes/comunicaciones/', { params: { cliente: clienteId } })
        .then(({ data }) => setComs(data.results ?? data ?? []))
        .catch(() => setComs([]))
    }
    if (puedeAlertas()) {
      api.get('/clientes/alertas/', { params: { cliente: clienteId } })
        .then(({ data }) => setAlerts(data.results ?? data ?? []))
        .catch(() => setAlerts([]))
    }
  }

  useEffect(() => {
    if (ficha.open && ficha.cliente?.id) loadFichaData(ficha.cliente.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarga al abrir ficha
  }, [ficha.open, ficha.cliente?.id])

  const isEditing = !!modal.cliente?.id

  const openCreate = () => {
    setModal({ open: true, cliente: null })
    setForm({
      usuario: '',
      tipo_cliente: 'residencial',
      nombre_empresa: '',
      nit: '',
      direccion_predeterminada: '',
      direccion_origen_habitual: '',
      direccion_destino_habitual: '',
      tipo_mudanza_preferido: '',
      preferencia_comunicacion: 'email',
    })
    setErrors({})
  }

  const openEdit = (c) => {
    setModal({ open: true, cliente: c })
    setForm({
      usuario: c.usuario,
      tipo_cliente: c.tipo_cliente || 'residencial',
      nombre_empresa: c.nombre_empresa || '',
      nit: c.nit || '',
      direccion_predeterminada: c.direccion_predeterminada || '',
      direccion_origen_habitual: c.direccion_origen_habitual || '',
      direccion_destino_habitual: c.direccion_destino_habitual || '',
      tipo_mudanza_preferido: c.tipo_mudanza_preferido ?? '',
      preferencia_comunicacion: c.preferencia_comunicacion || 'email',
    })
    setErrors({})
  }

  const openFicha = (c) => {
    setFicha({ open: true, cliente: c, tab: 'resumen' })
    setHistorial(null)
    setComForm({ canal: 'llamada', asunto: '', contenido: '', direccion: 'saliente' })
    setAlertForm({ tipo: 'seguimiento', titulo: '', descripcion: '', fecha_programada: '', estado: 'pendiente' })
  }

  const closeModal = () => setModal({ open: false, cliente: null })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrors({})
    const payload = {
      ...form,
      usuario: form.usuario ? parseInt(form.usuario, 10) : null,
      tipo_mudanza_preferido: form.tipo_mudanza_preferido ? parseInt(form.tipo_mudanza_preferido, 10) : null,
    }
    setSaving(true)
    const req = isEditing
      ? api.patch(`/clientes/${modal.cliente.id}/`, payload)
      : api.post('/clientes/', payload)
    req
      .then(() => {
        fetchClientes()
        closeModal()
      })
      .catch((err) => setErrors(err.response?.data || {}))
      .finally(() => setSaving(false))
  }

  const handleDelete = (c) => {
    if (!window.confirm(`¿Eliminar cliente ${c.usuario_nombre}?`)) return
    api.delete(`/clientes/${c.id}/`)
      .then(() => fetchClientes())
      .catch((err) => alert(err.response?.data?.detail || 'Error al eliminar'))
  }

  const addComunicacion = (e) => {
    e.preventDefault()
    if (!ficha.cliente) return
    api.post('/clientes/comunicaciones/', {
      cliente: ficha.cliente.id,
      canal: comForm.canal,
      asunto: comForm.asunto,
      contenido: comForm.contenido,
      direccion: comForm.direccion,
    }).then(() => loadFichaData(ficha.cliente.id)).catch(() => {})
  }

  const addAlerta = (e) => {
    e.preventDefault()
    if (!ficha.cliente || !alertForm.fecha_programada) return
    api.post('/clientes/alertas/', {
      cliente: ficha.cliente.id,
      tipo: alertForm.tipo,
      titulo: alertForm.titulo,
      descripcion: alertForm.descripcion,
      fecha_programada: new Date(alertForm.fecha_programada).toISOString(),
      estado: alertForm.estado,
    }).then(() => loadFichaData(ficha.cliente.id)).catch(() => {})
  }

  const usuariosSinCliente = usuarios.filter((u) => !clientes.some((c) => c.usuario === u.id))

  const columns = [
    { key: 'usuario_nombre', label: 'Cliente' },
    { key: 'usuario_email', label: 'Email' },
    { key: 'tipo_cliente', label: 'Tipo' },
    { key: 'cantidad_mudanzas', label: 'Mudanzas' },
    { key: 'monto_total_gastado', label: 'Total gastado', render: (r) => `Bs ${r.monto_total_gastado || 0}` },
    {
      key: 'rf_segmento_predicho',
      label: 'Lealtad (RF)',
      render: (r) => r.rf_segmento_predicho || '—',
    },
  ]

  const extraFicha = [{ label: 'Ficha CRM', onClick: openFicha }]

  if (!puedeVer()) {
    return <p className="text-slate-500">No tienes permiso para ver el módulo de clientes.</p>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes (CRM)</h1>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg w-64"
          />
          {puedeRegistrar() && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-amber-500 text-slate-900 font-medium rounded-lg hover:bg-amber-400"
            >
              + Nuevo cliente
            </button>
          )}
        </div>
      </div>
      <DataTable
        columns={columns}
        data={clientes}
        loading={loading}
        onRowClick={openFicha}
        onEdit={puedeRegistrar() ? openEdit : undefined}
        onDelete={puedeEliminar() ? handleDelete : undefined}
        extraActions={extraFicha}
      />

      {puedeRegistrar() && (
        <Modal open={modal.open} onClose={closeModal} title={isEditing ? 'Editar cliente' : 'Nuevo cliente'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormSelect
              label="Usuario"
              name="usuario"
              value={form.usuario}
              onChange={handleChange}
              required
              disabled={isEditing}
              options={isEditing ? usuarios : usuariosSinCliente}
              valueKey="id"
              labelKey={(u) => `${u.nombre} ${u.apellido} (${u.email})`}
              error={errors.usuario}
            />
            <FormSelect
              label="Tipo de cliente"
              name="tipo_cliente"
              value={form.tipo_cliente}
              onChange={handleChange}
              options={[
                { id: 'residencial', nombre: 'Residencial' },
                { id: 'empresarial', nombre: 'Empresarial' },
              ]}
            />
            <FormInput label="Nombre empresa (si empresarial)" name="nombre_empresa" value={form.nombre_empresa} onChange={handleChange} />
            <FormInput label="NIT" name="nit" value={form.nit} onChange={handleChange} />
            <FormTextarea label="Dirección predeterminada" name="direccion_predeterminada" value={form.direccion_predeterminada} onChange={handleChange} />
            <FormTextarea
              label="Dirección origen habitual (W9)"
              name="direccion_origen_habitual"
              value={form.direccion_origen_habitual}
              onChange={handleChange}
            />
            <FormTextarea
              label="Dirección destino habitual (W9)"
              name="direccion_destino_habitual"
              value={form.direccion_destino_habitual}
              onChange={handleChange}
            />
            <FormSelect
              label="Tipo de mudanza preferido (W9)"
              name="tipo_mudanza_preferido"
              value={form.tipo_mudanza_preferido}
              onChange={handleChange}
              options={[{ id: '', nombre: '—' }, ...tiposServicio.map((t) => ({ id: t.id, nombre: t.nombre }))]}
            />
            <FormSelect
              label="Preferencia de comunicación"
              name="preferencia_comunicacion"
              value={form.preferencia_comunicacion}
              onChange={handleChange}
              options={[
                { id: 'email', nombre: 'Email' },
                { id: 'sms', nombre: 'SMS' },
                { id: 'telefono', nombre: 'Teléfono' },
              ]}
            />
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-400 hover:text-white">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-amber-500 text-slate-900 font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Modal open={ficha.open} onClose={() => setFicha({ open: false, cliente: null, tab: 'resumen' })} title={ficha.cliente ? `CRM — ${ficha.cliente.usuario_nombre}` : ''} size="lg">
        {ficha.cliente && (
          <div>
            <div className="flex gap-2 border-b border-slate-700 pb-3 mb-4 flex-wrap">
              {['resumen', 'historial', 'comunicaciones', 'alertas'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFicha((s) => ({ ...s, tab: t }))}
                  className={`px-3 py-1 rounded-lg text-sm ${ficha.tab === t ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  {t === 'resumen' ? 'Resumen' : t === 'historial' ? 'Historial mudanzas' : t === 'comunicaciones' ? 'Comunicaciones' : 'Alertas'}
                </button>
              ))}
            </div>

            {ficha.tab === 'resumen' && (
              <div className="text-slate-300 space-y-2 text-sm">
                <p><span className="text-slate-500">Email:</span> {ficha.cliente.usuario_email}</p>
                <p><span className="text-slate-500">Mudanzas:</span> {ficha.cliente.cantidad_mudanzas} · <span className="text-slate-500">Gasto total:</span> Bs {ficha.cliente.monto_total_gastado}</p>
                <p><span className="text-slate-500">Prob. retención (RF):</span> {ficha.cliente.rf_probabilidad_retencion ?? '—'}</p>
                <p><span className="text-slate-500">Segmento predicho:</span> {ficha.cliente.rf_segmento_predicho || '—'}</p>
              </div>
            )}

            {ficha.tab === 'historial' && (
              <div>
                {!puedeHistorial() && <p className="text-slate-500">Sin permiso de historial.</p>}
                {puedeHistorial() && histLoad && <p className="text-slate-500">Cargando…</p>}
                {puedeHistorial() && !histLoad && historial && (
                  <div className="space-y-4 max-h-96 overflow-y-auto text-sm">
                    <p className="text-slate-500">
                      Cotizaciones: {historial.totales?.cotizaciones} · Reservas: {historial.totales?.reservas} · Completadas: {historial.totales?.mudanzas_completadas}
                    </p>
                    {historial.reservas?.map((r) => (
                      <div key={`r-${r.id}`} className="border border-slate-700 rounded p-2">
                        <span className="text-amber-400">Reserva {r.codigo}</span> — {r.estado} — {r.fecha_servicio}
                        {r.mudanza_estado && <span className="text-slate-500"> · Mudanza: {r.mudanza_estado}</span>}
                      </div>
                    ))}
                    {historial.cotizaciones?.slice(0, 15).map((c) => (
                      <div key={`c-${c.id}`} className="border border-slate-700 rounded p-2 text-slate-400">
                        Cotización #{c.id} — {c.estado} — {c.tipo_servicio}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {ficha.tab === 'comunicaciones' && (
              <div>
                {!puedeCom() && <p className="text-slate-500">Sin permiso de registro de comunicaciones.</p>}
                {puedeCom() && (
                  <div className="space-y-4">
                    <form onSubmit={addComunicacion} className="space-y-2 border border-slate-700 rounded-lg p-3">
                      <FormSelect label="Canal" name="canal" value={comForm.canal} onChange={(e) => setComForm({ ...comForm, canal: e.target.value })} options={CANALES} />
                      <FormInput label="Asunto" value={comForm.asunto} onChange={(e) => setComForm({ ...comForm, asunto: e.target.value })} />
                      <FormTextarea label="Contenido" value={comForm.contenido} onChange={(e) => setComForm({ ...comForm, contenido: e.target.value })} required />
                      <FormSelect
                        label="Dirección"
                        value={comForm.direccion}
                        onChange={(e) => setComForm({ ...comForm, direccion: e.target.value })}
                        options={[{ id: 'entrante', nombre: 'Entrante' }, { id: 'saliente', nombre: 'Saliente' }]}
                      />
                      <button type="submit" className="px-3 py-1.5 bg-amber-500 text-slate-900 rounded text-sm font-medium">Registrar</button>
                    </form>
                    <ul className="max-h-48 overflow-y-auto space-y-1 text-sm">
                      {coms.map((x) => (
                        <li key={x.id} className="text-slate-400 border-b border-slate-800 pb-1">
                          {new Date(x.creado_en).toLocaleString('es-BO')} — {x.canal} — {x.asunto || '(sin asunto)'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {ficha.tab === 'alertas' && (
              <div>
                {!puedeAlertas() && <p className="text-slate-500">Sin permiso de alertas.</p>}
                {puedeAlertas() && (
                  <div className="space-y-4">
                    <form onSubmit={addAlerta} className="space-y-2 border border-slate-700 rounded-lg p-3">
                      <FormSelect label="Tipo" value={alertForm.tipo} onChange={(e) => setAlertForm({ ...alertForm, tipo: e.target.value })} options={TIPOS_ALERTA} />
                      <FormInput label="Título" value={alertForm.titulo} onChange={(e) => setAlertForm({ ...alertForm, titulo: e.target.value })} required />
                      <FormTextarea label="Descripción" value={alertForm.descripcion} onChange={(e) => setAlertForm({ ...alertForm, descripcion: e.target.value })} />
                      <FormInput label="Fecha programada" type="datetime-local" value={alertForm.fecha_programada} onChange={(e) => setAlertForm({ ...alertForm, fecha_programada: e.target.value })} required />
                      <button type="submit" className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm font-medium">Crear alerta</button>
                    </form>
                    <ul className="max-h-48 overflow-y-auto space-y-1 text-sm">
                      {alerts.map((a) => (
                        <li key={a.id} className="text-slate-400 border-b border-slate-800 pb-1">
                          {a.titulo} — {a.estado} — {new Date(a.fecha_programada).toLocaleString('es-BO')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
