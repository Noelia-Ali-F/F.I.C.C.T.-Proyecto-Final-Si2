import { useState, useEffect } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormTextarea from '../components/FormTextarea'
import FormCheckbox from '../components/FormCheckbox'

/** Alineado con backend apps.usuarios.models.Permiso.MODULOS */
const MODULO_OPTIONS = [
  { value: 'usuarios', label: 'Usuarios' },
  { value: 'crm', label: 'CRM' },
  { value: 'inventario', label: 'Inventario' },
  { value: 'reservas', label: 'Reservas' },
  { value: 'reportes', label: 'Reportes' },
  { value: 'vehiculos', label: 'Vehículos' },
  { value: 'pagos', label: 'Pagos' },
  { value: 'chatbot', label: 'Chatbot' },
  { value: 'servicios', label: 'Servicios' },
]

export default function Roles() {
  const [roles, setRoles] = useState([])
  const [permisos, setPermisos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, rol: null })
  const [permisosModal, setPermisosModal] = useState({ open: false, rol: null })
  const [form, setForm] = useState({})
  const [selectedPermisos, setSelectedPermisos] = useState([])
  const [saving, setSaving] = useState(false)

  const [catModal, setCatModal] = useState({ open: false, permiso: null })
  const [catForm, setCatForm] = useState({ nombre: '', modulo: 'reservas', descripcion: '' })

  const fetchRoles = () => {
    setLoading(true)
    api.get('/auth/roles/')
      .then(({ data }) => setRoles(data.results ?? data ?? []))
      .catch(() => setRoles([]))
      .finally(() => setLoading(false))
  }

  const fetchPermisos = () => {
    api.get('/auth/permisos/')
      .then(({ data }) => setPermisos(data.results ?? data ?? []))
      .catch(() => setPermisos([]))
  }

  useEffect(() => {
    fetchRoles()
    fetchPermisos()
  }, [])

  const isEditing = !!modal.rol?.id

  const openCreate = () => {
    setModal({ open: true, rol: null })
    setForm({ nombre: '', descripcion: '', es_activo: true })
  }

  const openEdit = (r) => {
    setModal({ open: true, rol: r })
    setForm({ nombre: r.nombre, descripcion: r.descripcion || '', es_activo: r.es_activo ?? true })
  }

  const openPermisos = async (r) => {
    setPermisosModal({ open: true, rol: r })
    const { data } = await api.get(`/auth/roles/${r.id}/permisos/`)
    setSelectedPermisos(Array.isArray(data) ? data.map((p) => p.id) : [])
  }

  const closeModal = () => setModal({ open: false, rol: null })
  const closePermisosModal = () => setPermisosModal({ open: false, rol: null })

  const openCatCreate = () => {
    setCatModal({ open: true, permiso: null })
    setCatForm({ nombre: '', modulo: 'reservas', descripcion: '' })
  }

  const openCatEdit = (p) => {
    setCatModal({ open: true, permiso: p })
    setCatForm({ nombre: p.nombre, modulo: p.modulo, descripcion: p.descripcion || '' })
  }

  const closeCatModal = () => setCatModal({ open: false, permiso: null })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const togglePermiso = (id) => {
    setSelectedPermisos((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const toggleModulo = (modulo) => {
    const modPermisos = permisos.filter((p) => p.modulo === modulo).map((p) => p.id)
    const allSelected = modPermisos.every((id) => selectedPermisos.includes(id))
    if (allSelected) {
      setSelectedPermisos((prev) => prev.filter((id) => !modPermisos.includes(id)))
    } else {
      setSelectedPermisos((prev) => [...new Set([...prev, ...modPermisos])])
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = { nombre: form.nombre, descripcion: form.descripcion, es_activo: form.es_activo }
    const req = isEditing
      ? api.patch(`/auth/roles/${modal.rol.id}/`, payload)
      : api.post('/auth/roles/', payload)
    req
      .then(() => {
        fetchRoles()
        closeModal()
      })
      .catch(() => {})
      .finally(() => setSaving(false))
  }

  const handleSavePermisos = () => {
    if (!permisosModal.rol) return
    setSaving(true)
    api
      .put(`/auth/roles/${permisosModal.rol.id}/permisos/`, { permiso_ids: selectedPermisos })
      .then(() => {
        closePermisosModal()
      })
      .finally(() => setSaving(false))
  }

  const handleDelete = (r) => {
    if (!window.confirm(`¿Eliminar rol ${r.nombre}?`)) return
    api.delete(`/auth/roles/${r.id}/`)
      .then(() => fetchRoles())
      .catch((err) => alert(err.response?.data?.detail || 'Error al eliminar'))
  }

  const handleCatSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = { nombre: catForm.nombre.trim(), modulo: catForm.modulo, descripcion: catForm.descripcion }
    const req = catModal.permiso
      ? api.patch(`/auth/permisos/${catModal.permiso.id}/`, payload)
      : api.post('/auth/permisos/', payload)
    req
      .then(() => {
        fetchPermisos()
        closeCatModal()
      })
      .catch((err) => alert(err.response?.data ? JSON.stringify(err.response.data) : 'Error'))
      .finally(() => setSaving(false))
  }

  const handleCatDelete = (p) => {
    if (!window.confirm(`¿Eliminar permiso ${p.nombre}? Puede afectar asignaciones a roles.`)) return
    api.delete(`/auth/permisos/${p.id}/`)
      .then(() => fetchPermisos())
      .catch((err) => alert(err.response?.data?.detail || 'Error al eliminar'))
  }

  const columns = [
    { key: 'nombre', label: 'Rol' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'es_activo', label: 'Activo', render: (r) => (r.es_activo ? 'Sí' : 'No') },
  ]

  const permColumns = [
    { key: 'nombre', label: 'Código' },
    { key: 'modulo', label: 'Módulo' },
    { key: 'descripcion', label: 'Descripción' },
  ]

  const modulos = [...new Set(permisos.map((p) => p.modulo))].sort()
  const moduloLabels = {
    usuarios: 'Usuarios',
    crm: 'CRM',
    inventario: 'Inventario',
    reservas: 'Reservas',
    reportes: 'Reportes',
    vehiculos: 'Vehículos',
    pagos: 'Pagos',
    chatbot: 'Chatbot',
    servicios: 'Servicios',
  }

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">Roles y permisos</h1>
      <p className="text-slate-500 text-sm max-w-3xl">
        Roles estándar del sistema de transporte: <strong>admin</strong>, <strong>operador</strong>,{' '}
        <strong>conductor</strong>, <strong>cliente</strong> (y <strong>cargador</strong> si aplica).
        Puedes crear variaciones y asignar permisos granulares (p. ej. ver reportes, gestionar reservas).
      </p>

      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Roles</h2>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-amber-500 text-slate-900 font-medium rounded-lg hover:bg-amber-400"
          >
            + Nuevo rol
          </button>
        </div>
        <DataTable
          columns={columns}
          data={roles}
          loading={loading}
          onEdit={openEdit}
          onDelete={handleDelete}
          extraActions={[{ label: 'Permisos', onClick: openPermisos }]}
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Catálogo de permisos</h2>
          <button
            type="button"
            onClick={openCatCreate}
            className="px-4 py-2 bg-slate-700 text-slate-100 font-medium rounded-lg hover:bg-slate-600"
          >
            + Nuevo permiso
          </button>
        </div>
        <DataTable
          columns={permColumns}
          data={permisos}
          loading={false}
          onEdit={openCatEdit}
          onDelete={handleCatDelete}
        />
      </div>

      <Modal open={modal.open} onClose={closeModal} title={isEditing ? 'Editar rol' : 'Nuevo rol'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Nombre"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
          />
          <FormTextarea
            label="Descripción"
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
          />
          <FormCheckbox
            label="Rol activo"
            name="es_activo"
            checked={form.es_activo}
            onChange={handleChange}
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

      <Modal
        open={permisosModal.open}
        onClose={closePermisosModal}
        title={`Permisos: ${permisosModal.rol?.nombre || ''}`}
        size="lg"
      >
        {permisosModal.rol && (
          <div className="space-y-4">
            {modulos.map((mod) => {
              const modPermisos = permisos.filter((p) => p.modulo === mod)
              const allSelected = modPermisos.every((p) => selectedPermisos.includes(p.id))
              return (
                <div key={mod} className="border border-slate-700 rounded-lg p-4">
                  <FormCheckbox
                    label={moduloLabels[mod] || mod}
                    checked={allSelected}
                    onChange={() => toggleModulo(mod)}
                  />
                  <div className="mt-2 pl-6 space-y-1">
                    {modPermisos.map((p) => (
                      <FormCheckbox
                        key={p.id}
                        label={`${p.nombre} - ${p.descripcion || ''}`}
                        checked={selectedPermisos.includes(p.id)}
                        onChange={() => togglePermiso(p.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={closePermisosModal}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePermisos}
                disabled={saving}
                className="px-4 py-2 bg-amber-500 text-slate-900 font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar permisos'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={catModal.open}
        onClose={closeCatModal}
        title={catModal.permiso ? 'Editar permiso' : 'Nuevo permiso'}
      >
        <form onSubmit={handleCatSubmit} className="space-y-4">
          <FormInput
            label="Nombre único (ej. reservas.gestionar)"
            name="nombre"
            value={catForm.nombre}
            onChange={(e) => setCatForm((c) => ({ ...c, nombre: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm text-slate-400 mb-1">Módulo</label>
            <select
              value={catForm.modulo}
              onChange={(e) => setCatForm((c) => ({ ...c, modulo: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            >
              {MODULO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <FormTextarea
            label="Descripción"
            name="descripcion"
            value={catForm.descripcion}
            onChange={(e) => setCatForm((c) => ({ ...c, descripcion: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={closeCatModal} className="px-4 py-2 text-slate-400 hover:text-white">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-amber-500 text-slate-900 font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
