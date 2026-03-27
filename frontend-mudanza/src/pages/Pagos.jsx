import { useState, useEffect } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormSelect from '../components/FormSelect'
import { useAuth } from '../context/AuthContext'

export default function Pagos() {
  const { isAdmin } = useAuth()
  const [pagos, setPagos] = useState([])
  const [reservas, setReservas] = useState([])
  const [metodos, setMetodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, pago: null })
  const [formModal, setFormModal] = useState({ open: false })
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const fetch = () => {
    setLoading(true)
    api.get('/pagos/')
      .then(({ data }) => setPagos(data.results ?? data ?? []))
      .catch(() => setPagos([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch()
    if (isAdmin()) {
      api.get('/reservas/').then(({ data }) => setReservas(data.results ?? data ?? [])).catch(() => {})
      api.get('/pagos/metodos/').then(({ data }) => setMetodos(data.results ?? data ?? [])).catch(() => {})
    }
  }, [])

  const openCreate = () => {
    setFormModal({ open: true })
    setForm({
      reserva: '',
      metodo_pago: '',
      tipo_pago: 'pago_completo',
      monto: '',
      referencia_transaccion: '',
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
    api
      .post('/pagos/', {
        reserva: parseInt(form.reserva),
        metodo_pago: parseInt(form.metodo_pago),
        tipo_pago: form.tipo_pago,
        monto: parseFloat(form.monto) || 0,
        referencia_transaccion: form.referencia_transaccion || '',
      })
      .then(() => {
        fetch()
        setFormModal({ open: false })
      })
      .catch((err) => setErrors(err.response?.data || {}))
      .finally(() => setSaving(false))
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'reserva_codigo', label: 'Reserva' },
    { key: 'monto', label: 'Monto', render: (r) => `Bs ${r.monto}` },
    { key: 'estado', label: 'Estado' },
    { key: 'metodo_nombre', label: 'Método' },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pagos</h1>
        {isAdmin() && (
          <button onClick={openCreate} className="px-4 py-2 bg-amber-500 text-slate-900 font-medium rounded-lg hover:bg-amber-400">
            + Registrar pago
          </button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={pagos}
        loading={loading}
        onRowClick={(p) => setModal({ open: true, pago: p })}
      />
      <Modal open={modal.open} onClose={() => setModal({ open: false, pago: null })} title={modal.pago ? `Pago #${modal.pago.id}` : ''}>
        {modal.pago && (
          <div className="space-y-2 text-slate-300">
            <p><span className="text-slate-500">Reserva:</span> {modal.pago.reserva_codigo}</p>
            <p><span className="text-slate-500">Monto:</span> Bs {modal.pago.monto}</p>
            <p><span className="text-slate-500">Estado:</span> {modal.pago.estado}</p>
            <p><span className="text-slate-500">Método:</span> {modal.pago.metodo_nombre}</p>
          </div>
        )}
      </Modal>

      <Modal open={formModal.open} onClose={() => setFormModal({ open: false })} title="Registrar pago">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSelect
            label="Reserva"
            name="reserva"
            value={form.reserva}
            onChange={handleChange}
            required
            options={reservas}
            labelKey={(r) => `${r.codigo_confirmacion} - ${r.fecha_servicio}`}
            error={errors.reserva}
          />
          <FormSelect
            label="Método de pago"
            name="metodo_pago"
            value={form.metodo_pago}
            onChange={handleChange}
            required
            options={metodos}
            labelKey="nombre"
            error={errors.metodo_pago}
          />
          <FormSelect
            label="Tipo"
            name="tipo_pago"
            value={form.tipo_pago}
            onChange={handleChange}
            options={[
              { id: 'deposito', nombre: 'Depósito' },
              { id: 'saldo', nombre: 'Saldo' },
              { id: 'pago_completo', nombre: 'Pago Completo' },
            ]}
          />
          <FormInput
            label="Monto (Bs)"
            name="monto"
            type="number"
            step="0.01"
            value={form.monto}
            onChange={handleChange}
            required
            error={errors.monto}
          />
          <FormInput
            label="Referencia / Nº transacción"
            name="referencia_transaccion"
            value={form.referencia_transaccion}
            onChange={handleChange}
          />
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setFormModal({ open: false })} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-amber-500 text-slate-900 font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
