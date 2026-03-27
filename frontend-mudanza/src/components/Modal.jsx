export default function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const sizeClass = size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-4xl' : 'max-w-lg'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl ${sizeClass} w-full max-h-[90vh] overflow-auto`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
