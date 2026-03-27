export default function FormCheckbox({ label, ...props }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/50"
        {...props}
      />
      {label && <span className="text-slate-400">{label}</span>}
    </label>
  )
}
