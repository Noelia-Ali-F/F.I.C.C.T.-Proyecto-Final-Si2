import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/reportes/dashboard/')
      .then(({ data: d }) => setData(d))
      .catch(() => setData({ vista: 'admin', reservas_hoy: 0, cotizaciones_pendientes: 0, clientes_total: 0, ingresos_mes: 0, servicios_completados: 0 }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const vista = data?.vista || 'admin'
  const titulo =
    vista === 'cliente'
      ? 'Tu resumen'
      : vista === 'operativo'
        ? 'Panel operativo'
        : vista === 'operador'
          ? 'Panel operador'
          : 'Dashboard'

  let cards = []
  if (vista === 'cliente') {
    cards = [
      { label: 'Reservas activas', value: data?.reservas_activas ?? 0, color: 'from-amber-500/20 to-amber-600/10' },
      { label: 'Cotizaciones pendientes', value: data?.cotizaciones_pendientes ?? 0, color: 'from-blue-500/20 to-blue-600/10' },
      { label: 'Pagos pendientes', value: data?.pagos_pendientes ?? 0, color: 'from-rose-500/20 to-rose-600/10' },
      { label: 'Próximas mudanzas', value: data?.proximas_mudanzas ?? 0, color: 'from-emerald-500/20 to-emerald-600/10' },
    ]
  } else if (vista === 'operativo') {
    cards = [
      { label: 'Servicios asignados', value: data?.servicios_asignados ?? 0, color: 'from-amber-500/20 to-amber-600/10' },
      { label: 'En curso', value: data?.servicios_en_curso ?? 0, color: 'from-blue-500/20 to-blue-600/10' },
      { label: 'Completados (historial)', value: data?.servicios_completados_total ?? 0, color: 'from-emerald-500/20 to-emerald-600/10' },
    ]
  } else if (vista === 'operador') {
    cards = [
      { label: 'Reservas hoy', value: data?.reservas_hoy ?? 0, color: 'from-amber-500/20 to-amber-600/10' },
      { label: 'Cotizaciones pendientes', value: data?.cotizaciones_pendientes ?? 0, color: 'from-blue-500/20 to-blue-600/10' },
      { label: 'Clientes total', value: data?.clientes_total ?? 0, color: 'from-emerald-500/20 to-emerald-600/10' },
      { label: 'Ingresos del mes (Bs)', value: Number(data?.ingresos_mes ?? 0).toFixed(2), color: 'from-green-500/20 to-green-600/10' },
      { label: 'Servicios completados', value: data?.servicios_completados ?? 0, color: 'from-purple-500/20 to-purple-600/10' },
      { label: 'Mudanzas activas', value: data?.mudanzas_activas ?? 0, color: 'from-orange-500/20 to-orange-600/10' },
    ]
  } else {
    cards = [
      { label: 'Reservas hoy', value: data?.reservas_hoy ?? 0, color: 'from-amber-500/20 to-amber-600/10' },
      { label: 'Cotizaciones pendientes', value: data?.cotizaciones_pendientes ?? 0, color: 'from-blue-500/20 to-blue-600/10' },
      { label: 'Clientes total', value: data?.clientes_total ?? 0, color: 'from-emerald-500/20 to-emerald-600/10' },
      { label: 'Ingresos del mes (Bs)', value: Number(data?.ingresos_mes ?? 0).toFixed(2), color: 'from-green-500/20 to-green-600/10' },
      { label: 'Servicios completados', value: data?.servicios_completados ?? 0, color: 'from-purple-500/20 to-purple-600/10' },
    ]
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100 mb-2">{titulo}</h1>
      {user?.rol_nombre && (
        <p className="text-slate-500 text-sm mb-6 capitalize">Rol: {user.rol_nombre}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map(({ label, value, color }) => (
          <div
            key={label}
            className={`bg-gradient-to-br ${color} border border-slate-700 rounded-xl p-6`}
          >
            <p className="text-slate-400 text-sm">{label}</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
