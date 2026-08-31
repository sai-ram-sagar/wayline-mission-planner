import { TbAlertTriangle, TbRefresh } from 'react-icons/tb';

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-slate-600 border-t-accent-400 ${className}`}
    />
  );
}

/** Placeholder card used while a list is loading, sized like the real thing. */
export function SkeletonCard() {
  return (
    <div className="panel animate-pulse p-3">
      <div className="h-24 rounded bg-panel-700" />
      <div className="mt-3 h-3.5 w-2/3 rounded bg-panel-700" />
      <div className="mt-2 h-3 w-full rounded bg-panel-700" />
      <div className="mt-3 h-3 w-1/2 rounded bg-panel-700" />
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-8 text-center">
      <TbAlertTriangle className="h-6 w-6 text-amber-400" />
      <p className="max-w-md text-sm leading-relaxed text-slate-300">{message}</p>
      {onRetry && (
        <button type="button" className="btn-ghost" onClick={onRetry}>
          <TbRefresh className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="panel flex flex-col items-center gap-2 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-200">{title}</p>
      {children && <p className="max-w-md text-sm leading-relaxed text-slate-400">{children}</p>}
      {action}
    </div>
  );
}
