import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const menuItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/clientes', label: 'Clientes', icon: '👥' },
  { path: '/cotizaciones', label: 'Cotizaciones', icon: '📋' },
  { path: '/crm/pipeline', label: 'Pipeline CRM', icon: '📶', perm: 'crm.pipeline_solicitudes' },
  { path: '/reservas', label: 'Reservas', icon: '📅' },
  { path: '/mudanzas', label: 'Mudanzas', icon: '🚚' },
  { path: '/pagos', label: 'Pagos', icon: '💳' },
  { path: '/zonas', label: 'Zonas', icon: '📍' },
  { path: '/servicios', label: 'Servicios', icon: '🛠️' },
  { path: '/inventario', label: 'Inventario', icon: '📦' },
  { path: '/vehiculos', label: 'Vehículos', icon: '🚛' },
  { path: '/personal', label: 'Personal', icon: '👷' },
  { path: '/chatbot', label: 'Chatbot', icon: '💬' },
  { path: '/reportes', label: 'Reportes', icon: '📈' },
  { path: '/crm/informes', label: 'Informes CRM', icon: '📉', perm: 'crm.reportes_comportamiento' },
]

const operativoAdminItems = [
  { path: '/usuarios', label: 'Usuarios', icon: '👤' },
]

const systemAdminItems = [
  { path: '/roles', label: 'Roles y permisos', icon: '🔐' },
  { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
  { path: '/bitacora', label: 'Bitácora', icon: '📜' },
]

const clientMenuItems = [
  { path: '/', label: 'Inicio', icon: '🏠' },
  { path: '/mis-cotizaciones', label: 'Mis Cotizaciones', icon: '📋' },
  { path: '/mis-reservas', label: 'Mis Reservas', icon: '📅' },
  { path: '/inventario', label: 'Mi inventario', icon: '📦' },
  { path: '/mis-pagos', label: 'Mis Pagos', icon: '💳' },
  { path: '/chatbot', label: 'Chat', icon: '💬' },
]

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout, isAdmin, isSystemAdmin, hasRole, hasPermission } = useAuth()
  const navigate = useNavigate()

  const isCliente = hasRole('cliente')
  const staffMenu = menuItems.filter(
    (item) => !item.perm || user?.is_staff || hasPermission(item.perm)
  )
  const items = isCliente ? clientMenuItems : [
    ...staffMenu,
    ...(isAdmin() ? operativoAdminItems : []),
    ...(isSystemAdmin() ? systemAdminItems : []),
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-900 border-r border-slate-800 transition-all duration-200 flex flex-col`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <Link to="/" className="font-bold text-amber-400 text-xl truncate">
            {sidebarOpen ? 'CRM Mudanzas' : 'CRM'}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {items.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-slate-800'
                }`
              }
            >
              <span className="text-lg">{icon}</span>
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-6">
          <h1 className="text-lg font-medium text-slate-300">Sistema de Gestión</h1>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800"
            >
              <div className="w-8 h-8 rounded-full bg-amber-500/30 flex items-center justify-center">
                {user?.nombre?.[0] || '?'}
              </div>
              <span>{user?.nombre} {user?.apellido}</span>
              <span className="text-slate-500 text-sm">({user?.rol_nombre})</span>
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 py-1">
                  <Link
                    to="/perfil"
                    className="block px-4 py-2 hover:bg-slate-700"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Mi perfil
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-slate-700 text-red-400"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
