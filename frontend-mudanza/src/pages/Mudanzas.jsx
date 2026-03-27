import { useState, useEffect } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormSelect from '../components/FormSelect'
import FormInput from '../components/FormInput'
import { useAuth } from '../context/AuthContext'

export default function Mudanzas() {
  const { isAdmin } = useAuth()
  const [servicios, setServicios] = useState([])
  const [reservas, setReservas] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [personal, setPersonal] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, srv: null })
  const [formModal, setFormModal] = useState({ open: false })
  const [estadoModal, setEstadoModal] = useState({ open: false, srv: null })
  const [equipoModal, setEquipoModal] = useState({ open: false, srv: null })
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const fetch = () => {
    setLoading(true)
    api.get('/mudanzas/')
      .then(({ data }) => setServicios(data.results ?? data ?? []))
      .catch(() => setServicios([]))
      .finally(() => setLoading(false))
  }

  const fetchReservasSinServicio = () => {
    Promise.all([api.get('/reservas/'), api.get('/mudanzas/')])
      .then(([resRes, mudRes]) => {
        const resList = resRes.data.results ?? resRes.data ?? []
        const mudList = mudRes.data.results ?? mudRes.data ?? []
        const conServicio = new Set(mudList.map((m) => m.reserva))
        setReservas(resList.filter((r) => r.estado === 'confirmada' && !conServicio.has(r.id)))
      })
      .catch(() => setReservas([]))
  }

  useEffect(() => {
    fetch()
    if (isAdmin()) {
      api.get('/vehiculos/').then(({ data }) => setVehiculos(data.results ?? data ?? [])).catch(() => {})
      api.get('/personal/').then(({ data }) => setPersonal(data.results ?? data ?? [])).catch(() => {})
    }
  }, [])

  const openCreate = () => {
    fetchReservasSinServicio()
    setFormModal({ open: true })
    setForm({ reserva: '', vehiculo: '', notas_operador: '' })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    api
      .post('/mudanzas/', {
        reserva: parseInt(form.reserva),
        vehiculo: form.vehiculo ? parseInt(form.vehiculo) : null,
        notas_operador: form.notas_operador || '',
      })
      .then(() => {
        fetch()
        setFormModal({ open: false })
      })
      .catch(() => {})
      .finally(() => setSaving(false))
  }

  const cambiarEstado = (srv, estadoNuevo) => {
    api.post(`/mudanzas/${srv.id}/cambiar_estado/`, { estado_nuevo: estadoNuevo }).then(() => { fetch(); setEstadoModal({ open: false, srv: null }) })
  }

  const asignarEquipo = (srv, personalId, rol) => {
    api.post(`/mudanzas/${srv.id}/asignar_equipo/`, { personal: personalId, rol_asignado: rol }).then(() => { fetch(); setEquipoModal({ open: false, srv: null }) })
  }

  const estados = ['asignado', 'en_camino', 'en_origen', 'cargando', 'en_ruta', 'en_destino', 'descargando', 'completado', 'cancelado']

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'reserva_codigo', label: 'Reserva' },
    { key: 'vehiculo_placa', label: 'Vehículo' },
    { key: 'estado', label: 'Estado' },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Servicios de Mudanza</h1>
        {isAdmin() && (
          <button onClick={openCreate} className="px-4 py-2 bg-amber-500 text-slate-900 font-medium rounded-lg hover:bg-amber-400">
            + Nuevo servicio
          </button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={servicios}
        loading={loading}
        onRowClick={(s) => setModal({ open: true, srv: s })}
        extraActions={
          isAdmin()
            ? [
                { label: 'Estado', onClick: (s) => setEstadoModal({ open: true, srv: s }) },
                { label: 'Equipo', onClick: (s) => setEquipoModal({ open: true, srv: s }) },
              ]
            : []
        }
      />

      <Modal open={modal.open} onClose={() => setModal({ open: false, srv: null })} title={modal.srv ? `Servicio #${modal.srv.id}` : ''}>
        {modal.srv && (
          <div className="space-y-2 text-slate-300">
            <p><span className="text-slate-500">Reserva:</span> {modal.srv.reserva_codigo}</p>
            <p><span className="text-slate-500">Vehículo:</span> {modal.srv.vehiculo_placa || '-'}</p>
            <p><span className="text-slate-500">Estado:</span> {modal.srv.estado}</p>
          </div>
        )}
      </Modal>

      <Modal open={formModal.open} onClose={() => setFormModal({ open: false })} title="Nuevo servicio de mudanza">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSelect
            label="Reserva confirmada"
            name="reserva"
            value={form.reserva}
            onChange={(e) => setForm((f) => ({ ...f, reserva: e.target.value }))}
            required
            options={reservas}
            labelKey={(r) => `${r.codigo_confirmacion} - ${r.fecha_servicio}`}
          />
          <FormSelect
            label="Vehículo"
            name="vehiculo"
            value={form.vehiculo}
            onChange={(e) => setForm((f) => ({ ...f, vehiculo: e.target.value }))}
            options={vehiculos}
            labelKey="placa"
          />
          <FormInput
            label="Notas"
            name="notas_operador"
            value={form.notas_operador}
            onChange={(e) => setForm((f) => ({ ...f, notas_operador: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setFormModal({ open: false })} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-amber-500 text-slate-900 font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50">{saving ? 'Creando...' : 'Crear'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={estadoModal.open} onClose={() => setEstadoModal({ open: false, srv: null })} title="Cambiar estado">
        {estadoModal.srv && (
          <div className="flex flex-wrap gap-2">
            {estados.map((est) => (
              <button
                key={est}
                onClick={() => cambiarEstado(estadoModal.srv, est)}
                className={`px-3 py-2 rounded-lg text-sm ${estadoModal.srv.estado === est ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 hover:bg-slate-600'}`}
              >
                {est}
              </button>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={equipoModal.open} onClose={() => setEquipoModal({ open: false, srv: null })} title="Asignar equipo" size="lg">
        {equipoModal.srv && (
          <EquipoForm
            personal={personal}
            onAsignar={(personalId, rol) => asignarEquipo(equipoModal.srv, personalId, rol)}
          />
        )}
      </Modal>
    </div>
  )
}

function EquipoForm({ personal, onAsignar }) {
  const [sel, setSel] = useState({ personal: '', rol: 'conductor' })
  return (
    <div className="space-y-4">
      <FormSelect
        label="Personal"
        options={personal}
        valueKey="id"
        labelKey={(p) => `${p.usuario_nombre} (${p.tipo_personal})`}
        value={sel.personal}
        onChange={(e) => setSel((s) => ({ ...s, personal: e.target.value }))}
      />
      <FormSelect
        label="Rol"
        options={[
          { id: 'conductor', nombre: 'Conductor' },
          { id: 'cargador_principal', nombre: 'Cargador Principal' },
          { id: 'cargador_apoyo', nombre: 'Cargador de Apoyo' },
        ]}
        value={sel.rol}
        onChange={(e) => setSel((s) => ({ ...s, rol: e.target.value }))}
      />
      <button
        onClick={() => sel.personal && onAsignar(parseInt(sel.personal), sel.rol)}
        className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium"
      >
        Asignar
      </button>
    </div>
  )
}
