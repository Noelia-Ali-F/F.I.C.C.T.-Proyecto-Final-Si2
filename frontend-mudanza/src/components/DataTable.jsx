export default function DataTable({ columns, data, loading, onRowClick, onEdit, onDelete, extraActions = [], emptyMessage = 'No hay datos' }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="text-center py-12 text-slate-400">{emptyMessage}</div>
    )
  }

  const getExtraActions = (row) => {
    const arr = typeof extraActions === 'function' ? extraActions(row) : (Array.isArray(extraActions) ? extraActions : [])
    return Array.isArray(arr) ? arr : []
  }
  const hasActions = onEdit || onDelete || (Array.isArray(extraActions) && extraActions.length > 0) || (typeof extraActions === 'function' && data?.[0] && getExtraActions(data[0]).length > 0)

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full">
        <thead className="bg-slate-800/50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-sm font-medium text-slate-300"
              >
                {col.label}
              </th>
            ))}
            {hasActions && (
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-300 w-24">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {data.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={(e) => {
                if (!onRowClick || e.target.closest('button, a')) return
                onRowClick(row)
              }}
              className={`hover:bg-slate-800/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-slate-300">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
              {hasActions && (
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2 justify-end flex-wrap">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="px-3 py-1 text-sm bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30"
                      >
                        Editar
                      </button>
                    )}
                    {getExtraActions(row).map((action, i) => (
                      <button
                        key={i}
                        onClick={() => action.onClick(row)}
                        className={`px-3 py-1 text-sm rounded-lg ${action.className || 'bg-slate-600 hover:bg-slate-500'}`}
                      >
                        {action.label}
                      </button>
                    ))}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
