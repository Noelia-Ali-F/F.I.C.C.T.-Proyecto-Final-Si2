export default function FormInput({ label, error, required, ...props }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-400">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 bg-slate-800 border rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none ${
          error ? 'border-red-500' : 'border-slate-700'
        }`}
        required={required}
        {...props}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
