import { Link } from 'react-router-dom'

export default function Reportes() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reportes</h1>
      <p className="text-slate-400 mb-6">Accede al dashboard para ver las métricas principales.</p>
      <Link to="/" className="inline-block px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium">
        Ir al Dashboard
      </Link>
    </div>
  )
}
