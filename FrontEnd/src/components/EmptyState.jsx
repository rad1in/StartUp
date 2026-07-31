export default function EmptyState({ icon: Icon, title, hint, action, className = '' }) {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      {Icon && (
        <span className="w-14 h-14 rounded-2xl bg-black/[0.04] text-ink/25 flex items-center justify-center mx-auto mb-4">
          <Icon size={26} />
        </span>
      )}
      <p className="font-bold text-ink/60 text-sm">{title}</p>
      {hint && <p className="text-xs text-ink/40 mt-1 max-w-xs mx-auto">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
