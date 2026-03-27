import { useState, useEffect } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormSelect from '../components/FormSelect'
import FormCheckbox from '../components/FormCheckbox'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, usuario: null })
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const fetchUsuarios = () => {
    setLoading(true)
    api.get('/auth/usuarios/')
      .then(({ data }) => setUsuarios(data.results ?? data ?? []))
      .catch(() => setUsuarios([]))
      .finally(() => setLoading(false))
  }

  const fetchRoles = () => {
    api.get('/auth/roles/')
      .then(({ data }) => setRoles(data.results ?? data ?? []))
      .catch(() => setRoles([]))
  }

  useEffect(() => {
    fetchUsuarios()
    fetchRoles()
  }, [])

  const isEditing = !!modal.usuario?.id
  const rolNombre = form.rol ? roles.find((r) => r.id === parseInt(form.rol))?.nombre : ''
  const isClienteRol = rolNombre === 'cliente'
  const isPersonalRol = rolNombre === 'conductor' || rolNombre === 'cargador'

  const openCreate = () => {
    setModal({ open: true, usuario: null })
    setForm({
      email: '',
      nombre: '',
      apellido: '',
      telefono: '',
      password: '',
      rol: '',
      es_activo: true,
      crear_cliente: false,
      crear_personal: false,
      tipo_cliente: 'residencial',
      tipo_personal: 'conductor',
      numero_licencia: '',
      tipo_licencia: '',
      fecha_ingreso: '',
      salario_mensual: '',
    })
    setErrors({})
  }

  const openEdit = (u) => {
    setModal({ open: true, usuario: u })
    setForm({
      email: u.email,
      nombre: u.nombre,
      apellido: u.apellido,
      telefono: u.telefono || '',
      password: '',
      rol: u.rol?.toString() || '',
      es_activo: u.es_activo ?? true,
    })
    setErrors({})
  }

  const closeModal = () => setModal({ open: false, usuario: null })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrors({})
    const payload = {
      email: form.email,
      nombre: form.nombre,
      apellido: form.apellido,
      telefono: form.telefono || '',
      rol: form.rol ? parseInt(form.rol) : null,
      es_activo: form.es_activo ?? true,
    }
    if (!isEditing) {
      if (!form.password) {
        setErrors({ password: 'La contraseña es obligatoria' })
        return
      }
      payload.password = form.password
      if (isClienteRol) {
        payload.crear_cliente = true
        payload.tipo_cliente = form.tipo_cliente || 'residencial'
      }
      if (isPersonalRol) {
        payload.crear_personal = true
        payload.tipo_personal = form.tipo_personal || 'conductor'
        payload.numero_licencia = form.numero_licencia || ''
        payload.tipo_licencia = form.tipo_licencia || ''
        payload.fecha_ingreso = form.fecha_ingreso || null
        payload.salario_mensual = form.salario_mensual ? parseFloat(form.salario_mensual) : null
      }
    } else if (form.password) {
      payload.password = form.password
    }

    setSaving(true)
    const req = isEditing
      ? api.patch(`/auth/usuarios/${modal.usuario.id}/`, payload)
      : api.post('/auth/usuarios/', payload)
    req
      .then(() => {
        fetchUsuarios()
        closeModal()
      })
      .catch((err) => {
        setErrors(err.response?.data || {})
      })
      .finally(() => setSaving(false))
  }

  const handleDelete = (u) => {
    if (!window.confirm(`¿Eliminar usuario ${u.email}?`)) return
    api.delete(`/auth/usuarios/${u.id}/`)
      .then(() => fetchUsuarios())
      .catch((err) => alert(err.response?.data?.detail || 'Error al eliminar'))
  }

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellido', label: 'Apellido' },
    { key: 'rol_nombre', label: 'Rol' },
    { key: 'es_activo', label: 'Activo', render: (r) => (r.es_activo ? 'Sí' : 'No') },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-amber-500 text-slate-900 font-medium rounded-lg hover:bg-amber-400"
        >
          + Nuevo usuario
        </button>
      </div>
      <DataTable
        columns={columns}
        data={usuarios}
        loading={loading}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
      <Modal open={modal.open} onClose={closeModal} title={isEditing ? 'Editar usuario' : 'Nuevo usuario'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              disabled={isEditing}
              error={errors.email}
            />
            <FormInput
              label={isEditing ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña'}
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required={!isEditing}
              error={errors.password}
            />
            <FormInput
              label="Nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              error={errors.nombre}
            />
            <FormInput
              label="Apellido"
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
              required
              error={errors.apellido}
            />
            <FormInput
              label="Teléfono"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
            />
            <FormSelect
              label="Rol"
              name="rol"
              value={form.rol}
              onChange={handleChange}
              options={roles}
              labelKey="nombre"
              error={errors.rol}
            />
          </div>
          {!isEditing && (
            <>
              {isClienteRol && (
                <div className="p-4 bg-slate-800/50 rounded-lg space-y-2">
                  <FormCheckbox
                    label="Crear perfil de cliente automáticamente"
                    name="crear_cliente"
                    checked={form.crear_cliente}
                    onChange={handleChange}
                  />
                  {form.crear_cliente && (
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
                  )}
                </div>
              )}
              {isPersonalRol && (
                <div className="p-4 bg-slate-800/50 rounded-lg space-y-4">
                  <FormCheckbox
                    label="Crear perfil de personal (conductor/cargador)"
                    name="crear_personal"
                    checked={form.crear_personal}
                    onChange={handleChange}
                  />
                  {form.crear_personal && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormSelect
                        label="Tipo"
                        name="tipo_personal"
                        value={form.tipo_personal}
                        onChange={handleChange}
                        options={[
                          { id: 'conductor', nombre: 'Conductor' },
                          { id: 'cargador', nombre: 'Cargador' },
                        ]}
                      />
                      <FormInput
                        label="Fecha de ingreso"
                        name="fecha_ingreso"
                        type="date"
                        value={form.fecha_ingreso}
                        onChange={handleChange}
                        required
                      />
                      <FormInput
                        label="Nº Licencia"
                        name="numero_licencia"
                        value={form.numero_licencia}
                        onChange={handleChange}
                      />
                      <FormInput
                        label="Tipo licencia"
                        name="tipo_licencia"
                        value={form.tipo_licencia}
                        onChange={handleChange}
                      />
                      <FormInput
                        label="Salario mensual (Bs)"
                        name="salario_mensual"
                        type="number"
                        step="0.01"
                        value={form.salario_mensual}
                        onChange={handleChange}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {isEditing && (
            <FormCheckbox
              label="Usuario activo"
              name="es_activo"
              checked={form.es_activo}
              onChange={handleChange}
            />
          )}
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
    </div>
  )
}
