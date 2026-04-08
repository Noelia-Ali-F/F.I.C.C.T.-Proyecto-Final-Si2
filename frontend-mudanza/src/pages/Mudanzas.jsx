import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormSelect from '../components/FormSelect'
import FormInput from '../components/FormInput'
import ServicioTimeline from '../components/ServicioTimeline'
import { useAuth } from '../context/AuthContext'

const ESTADOS_LABELS = {
  asignado: { label: 'Asignado', color: 'bg-gray-500' },
  en_camino: { label: 'En Camino', color: 'bg-blue-500' },
  en_origen: { label: 'En Origen', color: 'bg-cyan-500' },
  cargando: { label: 'Cargando', color: 'bg-indigo-500' },
  en_ruta: { label: 'En Ruta', color: 'bg-purple-500' },
  en_destino: { label: 'En Destino', color: 'bg-green-500' },
  descargando: { label: 'Descargando', color: 'bg-lime-500' },
  completado: { label: 'Completado', color: 'bg-green-600' },
  cancelado: { label: 'Cancelado', color: 'bg-red-500' },
}

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
  const [detalleServicio, setDetalleServicio] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const fetch = () => {
    setLoading(true)
    api
      .get('/mudanzas/')
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
        setReservas(
          resList.filter((r) => r.estado === 'confirmada' && !conServicio.has(r.id))
        )
      })
      .catch(() => setReservas([]))
  }

  const fetchDetalleServicio = async (id) => {
    try {
      const { data } = await api.get(`/mudanzas/${id}/`)
      setDetalleServicio(data)
    } catch (err) {
      console.error('Error al cargar detalle:', err)
    }
  }

  useEffect(() => {
    fetch()
    if (isAdmin()) {
      api
        .get('/vehiculos/')
        .then(({ data }) => setVehiculos(data.results ?? data ?? []))
        .catch(() => {})
      api
        .get('/personal/')
        .then(({ data }) => setPersonal(data.results ?? data ?? []))
        .catch(() => {})
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
    api
      .post(`/mudanzas/${srv.id}/cambiar_estado/`, { estado_nuevo: estadoNuevo })
      .then(() => {
        fetch()
        setEstadoModal({ open: false, srv: null })
        if (detalleServicio?.id === srv.id) {
          fetchDetalleServicio(srv.id)
        }
      })
  }

  const asignarEquipo = (srv, personalId, rol) => {
    api
      .post(`/mudanzas/${srv.id}/asignar_equipo/`, {
        personal: personalId,
        rol_asignado: rol,
      })
      .then(() => {
        fetch()
        setEquipoModal({ open: false, srv: null })
        if (detalleServicio?.id === srv.id) {
          fetchDetalleServicio(srv.id)
        }
      })
  }

  const handleRowClick = (srv) => {
    setModal({ open: true, srv })
    fetchDetalleServicio(srv.id)
  }

  const estados = [
    'asignado',
    'en_camino',
    'en_origen',
    'cargando',
    'en_ruta',
    'en_destino',
    'descargando',
    'completado',
    'cancelado',
  ]

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'reserva_codigo', label: 'Reserva' },
    { key: 'vehiculo_placa', label: 'Vehículo' },
    {
      key: 'estado',
      label: 'Estado',
      render: (srv) => {
        const est = ESTADOS_LABELS[srv.estado]
        return est ? (
          <span
            className={`px-2 py-1 rounded text-xs font-medium text-white ${est.color}`}
          >
            {est.label}
          </span>
        ) : (
          srv.estado
        )
      },
    },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Panel Operador - Servicios de Mudanza</h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestione el estado y equipo de los servicios en tiempo real
          </p>
        </div>
        {isAdmin() && (
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-amber-500 text-slate-900 font-medium rounded-lg hover:bg-amber-400"
          >
            + Nuevo servicio
          </button>
        )}
      </div>

      {/* Link a incidencias */}
      <div className="mb-4">
        <Link
          to="/incidencias"
          className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium"
        >
          ⚠️ Ver Incidencias
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={servicios}
        loading={loading}
        onRowClick={handleRowClick}
        extraActions={
          isAdmin()
            ? [
                {
                  label: 'Estado',
                  onClick: (s) => setEstadoModal({ open: true, srv: s }),
                },
                {
                  label: 'Equipo',
                  onClick: (s) => setEquipoModal({ open: true, srv: s }),
                },
              ]
            : []
        }
      />

      {/* Modal de Detalle Mejorado */}
      <Modal
        open={modal.open}
        onClose={() => {
          setModal({ open: false, srv: null })
          setDetalleServicio(null)
        }}
        title={modal.srv ? `Servicio #${modal.srv.id} - ${modal.srv.reserva_codigo}` : ''}
        size="xl"
      >
        {detalleServicio ? (
          <div className="space-y-6">
            {/* Estado y Timeline */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Estado del Servicio</h3>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`px-3 py-1 rounded font-medium text-white ${
                    ESTADOS_LABELS[detalleServicio.estado]?.color || 'bg-gray-500'
                  }`}
                >
                  {ESTADOS_LABELS[detalleServicio.estado]?.label ||
                    detalleServicio.estado}
                </span>
                {isAdmin() && (
                  <button
                    onClick={() =>
                      setEstadoModal({ open: true, srv: detalleServicio })
                    }
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
                  >
                    Cambiar Estado
                  </button>
                )}
              </div>
              <ServicioTimeline estado={detalleServicio.estado} />
            </div>

            {/* Información de Reserva */}
            <div className="grid grid-cols-2 gap-4 bg-slate-800 p-4 rounded-lg">
              <div>
                <p className="text-slate-400 text-sm">Fecha de Servicio</p>
                <p className="font-medium">
                  {detalleServicio.reserva?.fecha_servicio || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Franja Horaria</p>
                <p className="font-medium">
                  {detalleServicio.reserva?.franja_horaria || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Origen</p>
                <p className="text-sm">
                  {detalleServicio.reserva?.cotizacion?.direccion_origen || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Destino</p>
                <p className="text-sm">
                  {detalleServicio.reserva?.cotizacion?.direccion_destino || '-'}
                </p>
              </div>
            </div>

            {/* Vehículo */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Vehículo Asignado</h3>
              <div className="bg-slate-800 p-3 rounded-lg">
                {detalleServicio.vehiculo_placa ? (
                  <p className="font-medium">{detalleServicio.vehiculo_placa}</p>
                ) : (
                  <p className="text-slate-400">No asignado</p>
                )}
              </div>
            </div>

            {/* Equipo */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Equipo Asignado</h3>
                {isAdmin() && (
                  <button
                    onClick={() =>
                      setEquipoModal({ open: true, srv: detalleServicio })
                    }
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
                  >
                    + Agregar Persona
                  </button>
                )}
              </div>
              {detalleServicio.equipo && detalleServicio.equipo.length > 0 ? (
                <div className="space-y-2">
                  {detalleServicio.equipo.map((miembro, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-slate-800 p-3 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{miembro.personal_nombre}</p>
                        <p className="text-sm text-slate-400">
                          {miembro.rol_asignado}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 bg-slate-800 p-3 rounded-lg">
                  No hay equipo asignado
                </p>
              )}
            </div>

            {/* Incidencias */}
            {detalleServicio.incidencias && detalleServicio.incidencias.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2 text-red-400">
                  ⚠️ Incidencias Reportadas
                </h3>
                <div className="space-y-2">
                  {detalleServicio.incidencias.map((inc, idx) => (
                    <div
                      key={idx}
                      className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-red-400">
                            {inc.tipo} - {inc.gravedad}
                          </p>
                          <p className="text-sm text-slate-300 mt-1">
                            {inc.descripcion}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            inc.estado === 'resuelta'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {inc.estado}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/incidencias"
                  className="inline-block mt-3 text-amber-500 hover:text-amber-400 text-sm"
                >
                  Ver todas las incidencias →
                </Link>
              </div>
            )}

            {/* Notas del Operador */}
            {detalleServicio.notas_operador && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Notas del Operador</h3>
                <div className="bg-slate-800 p-3 rounded-lg">
                  <p className="text-slate-300">{detalleServicio.notas_operador}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-slate-400 mt-2">Cargando detalles...</p>
          </div>
        )}
      </Modal>

      {/* Modal de Creación */}
      <Modal
        open={formModal.open}
        onClose={() => setFormModal({ open: false })}
        title="Nuevo servicio de mudanza"
      >
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
            onChange={(e) =>
              setForm((f) => ({ ...f, notas_operador: e.target.value }))
            }
          />
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setFormModal({ open: false })}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-amber-500 text-slate-900 font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50"
            >
              {saving ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Cambio de Estado */}
      <Modal
        open={estadoModal.open}
        onClose={() => setEstadoModal({ open: false, srv: null })}
        title="Cambiar estado"
      >
        {estadoModal.srv && (
          <div>
            <p className="text-slate-400 mb-4">
              Estado actual:{' '}
              <span className="text-white font-medium">
                {ESTADOS_LABELS[estadoModal.srv.estado]?.label ||
                  estadoModal.srv.estado}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {estados.map((est) => (
                <button
                  key={est}
                  onClick={() => cambiarEstado(estadoModal.srv, est)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    estadoModal.srv.estado === est
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {ESTADOS_LABELS[est]?.label || est}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Asignación de Equipo */}
      <Modal
        open={equipoModal.open}
        onClose={() => setEquipoModal({ open: false, srv: null })}
        title="Asignar equipo"
        size="lg"
      >
        {equipoModal.srv && (
          <EquipoForm
            personal={personal}
            onAsignar={(personalId, rol) =>
              asignarEquipo(equipoModal.srv, personalId, rol)
            }
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
        disabled={!sel.personal}
        className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 disabled:opacity-50 w-full"
      >
        Asignar
      </button>
    </div>
  )
}
