import { ASSIGNMENT_STATUS_LABELS } from '../constants';

const DRONE_STYLES = {
  idle: 'bg-emerald-950/60 text-emerald-300 ring-emerald-900/70',
  flying: 'bg-sky-950/60 text-sky-300 ring-sky-900/70',
  offline: 'bg-panel-700 text-slate-400 ring-panel-500',
};

const ASSIGNMENT_STYLES = {
  pending: 'bg-panel-700 text-slate-300 ring-panel-500',
  synced: 'bg-sky-950/60 text-sky-300 ring-sky-900/70',
  in_progress: 'bg-amber-950/60 text-amber-300 ring-amber-900/70',
  complete: 'bg-emerald-950/60 text-emerald-300 ring-emerald-900/70',
  failed: 'bg-red-950/60 text-red-300 ring-red-900/70',
};

const DRONE_LABELS = { idle: 'Idle', flying: 'Flying', offline: 'Offline' };

export default function StatusBadge({ status, kind = 'assignment' }) {
  const styles = kind === 'drone' ? DRONE_STYLES : ASSIGNMENT_STYLES;
  const labels = kind === 'drone' ? DRONE_LABELS : ASSIGNMENT_STATUS_LABELS;

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px]
                  font-medium ring-1 ${styles[status] ?? ASSIGNMENT_STYLES.pending}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
