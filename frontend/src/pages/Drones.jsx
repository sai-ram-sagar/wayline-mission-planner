import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TbAlertHexagon, TbDrone, TbPlayerTrackNext, TbPlus, TbRefresh, TbTrash } from 'react-icons/tb';
import StatusBadge from '../components/StatusBadge';
import AssignWaylineDialog from '../components/AssignWaylineDialog';
import { ConfirmDialog } from '../components/Modal';
import { EmptyState, ErrorState, Spinner } from '../components/status';
import { ASSIGNMENT_FLOW, ASSIGNMENT_STATUS_LABELS } from '../constants';
import { assignmentsApi, describeError, dronesApi, waylinesApi } from '../api';

const TABS = [
  { key: 'incomplete', label: 'Incomplete' },
  { key: 'completed', label: 'Completed' },
];

/** The status this assignment advances to, or null when it is already done. */
const nextStatus = (status) => {
  const index = ASSIGNMENT_FLOW.indexOf(status);
  if (index === -1 || index === ASSIGNMENT_FLOW.length - 1) return null;
  return ASSIGNMENT_FLOW[index + 1];
};

const formatWhen = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function DroneCard({ drone }) {
  return (
    <article className="panel flex items-center gap-3 p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-panel-700 text-slate-300">
        <TbDrone className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-slate-100">{drone.name}</h3>
        <p className="truncate text-xs text-slate-500">{drone.model}</p>
      </div>
      <StatusBadge status={drone.status} kind="drone" />
    </article>
  );
}

function AssignmentRow({ assignment, busy, onAdvance, onFail, onDelete }) {
  const next = nextStatus(assignment.status);

  return (
    <tr className="border-b border-panel-700 last:border-0">
      <td className="px-3 py-2 text-slate-200">
        <Link
          to={`/editor?id=${assignment.wayline_id}`}
          className="hover:text-accent-400 hover:underline"
          title="Open this wayline in the editor"
        >
          {assignment.wayline_name}
        </Link>
      </td>
      <td className="px-3 py-2 text-slate-300">
        {assignment.drone_name}
        <span className="ml-1.5 text-[11px] text-slate-500">{assignment.drone_model}</span>
      </td>
      <td className="px-3 py-2">
        <StatusBadge status={assignment.status} />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-500">
        {formatWhen(assignment.assigned_at)}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1.5">
          {busy && <Spinner className="h-3.5 w-3.5" />}
          {next && (
            <button
              type="button"
              className="btn-ghost px-2 py-1 text-xs"
              disabled={busy}
              onClick={() => onAdvance(assignment, next)}
              title={`Advance to ${ASSIGNMENT_STATUS_LABELS[next]}`}
            >
              <TbPlayerTrackNext className="h-3.5 w-3.5" />
              {ASSIGNMENT_STATUS_LABELS[next]}
            </button>
          )}
          {assignment.status !== 'complete' && assignment.status !== 'failed' && (
            <button
              type="button"
              className="btn-ghost px-2 py-1 text-xs"
              disabled={busy}
              onClick={() => onFail(assignment)}
              title="Mark as failed"
              aria-label={`Mark ${assignment.wayline_name} on ${assignment.drone_name} as failed`}
            >
              <TbAlertHexagon className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            className="btn-danger px-2 py-1 text-xs"
            disabled={busy}
            onClick={() => onDelete(assignment)}
            title="Remove assignment"
            aria-label={`Remove assignment of ${assignment.wayline_name} to ${assignment.drone_name}`}
          >
            <TbTrash className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Drones() {
  const [drones, setDrones] = useState([]);
  const [waylines, setWaylines] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('incomplete');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [flash, setFlash] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return Promise.all([dronesApi.list(), waylinesApi.list(), assignmentsApi.list()])
      .then(([fleet, routes, tasks]) => {
        setDrones(fleet);
        setWaylines(routes);
        setAssignments(tasks);
      })
      .catch((err) => setError(describeError(err, 'Could not load the fleet.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(timer);
  }, [flash]);

  // "Completed" holds the terminal states, matching the reference's split of
  // the task list into Incomplete and Completed.
  const { incomplete, completed } = useMemo(() => {
    const done = new Set(['complete', 'failed']);
    return {
      incomplete: assignments.filter((a) => !done.has(a.status)),
      completed: assignments.filter((a) => done.has(a.status)),
    };
  }, [assignments]);

  const rows = tab === 'incomplete' ? incomplete : completed;

  const replaceAssignment = (updated) =>
    setAssignments((current) => current.map((a) => (a.id === updated.id ? updated : a)));

  const setStatus = async (assignment, status) => {
    setBusyId(assignment.id);
    setError(null);
    try {
      replaceAssignment(await assignmentsApi.setStatus(assignment.id, status));
    } catch (err) {
      setError(describeError(err, 'Could not update that assignment.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleAssign = async (waylineId, droneIds) => {
    setAssigning(true);
    setAssignError(null);
    try {
      const created = await assignmentsApi.create(waylineId, droneIds);
      setAssignments((current) => [...created, ...current]);
      setAssignOpen(false);
      setTab('incomplete');
      setFlash(
        `Assigned "${created[0].wayline_name}" to ${created.length} drone${
          created.length === 1 ? '' : 's'
        }.`,
      );
    } catch (err) {
      setAssignError(describeError(err, 'Could not create those assignments.'));
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    try {
      await assignmentsApi.remove(pendingDelete.id);
      setAssignments((current) => current.filter((a) => a.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setError(describeError(err, 'Could not remove that assignment.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-panel-600 bg-panel-800 px-4 py-3">
        <h1 className="text-sm font-semibold text-slate-100">Drone fleet</h1>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="btn-ghost" onClick={load} disabled={loading}>
            <TbRefresh className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setAssignError(null);
              setAssignOpen(true);
            }}
            disabled={loading || drones.length === 0}
          >
            <TbPlus className="h-4 w-4" />
            Assign wayline
          </button>
        </div>
      </div>

      {flash && (
        <div className="border-b border-emerald-900/60 bg-emerald-950/40 px-4 py-1.5 text-xs text-emerald-300">
          {flash}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Spinner />
            Loading fleet…
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Fleet ({drones.length})
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
                {drones.map((drone) => (
                  <DroneCard key={drone.id} drone={drone} />
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center gap-1">
                {TABS.map((entry) => {
                  const count = entry.key === 'incomplete' ? incomplete.length : completed.length;
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={() => setTab(entry.key)}
                      className={[
                        'rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
                        tab === entry.key
                          ? 'bg-panel-600 text-slate-100'
                          : 'text-slate-500 hover:text-slate-300',
                      ].join(' ')}
                    >
                      {entry.label}
                      <span className="ml-1.5 font-normal">{count}</span>
                    </button>
                  );
                })}
              </div>

              {rows.length === 0 ? (
                <EmptyState
                  title={
                    tab === 'incomplete'
                      ? 'No assignments in progress'
                      : 'Nothing has finished yet'
                  }
                >
                  {tab === 'incomplete'
                    ? 'Use "Assign wayline" to send a saved mission to one or more drones.'
                    : 'Completed and failed assignments appear here.'}
                </EmptyState>
              ) : (
                <div className="panel overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-panel-600 text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2 font-medium">Wayline</th>
                        <th className="px-3 py-2 font-medium">Drone</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Assigned</th>
                        <th className="px-3 py-2 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((assignment) => (
                        <AssignmentRow
                          key={assignment.id}
                          assignment={assignment}
                          busy={busyId === assignment.id}
                          onAdvance={(item, status) => setStatus(item, status)}
                          onFail={(item) => setStatus(item, 'failed')}
                          onDelete={setPendingDelete}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <AssignWaylineDialog
        open={assignOpen}
        waylines={waylines}
        drones={drones}
        submitting={assigning}
        error={assignError}
        onSubmit={handleAssign}
        onCancel={() => setAssignOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove assignment"
        message={
          pendingDelete
            ? `Remove the assignment of "${pendingDelete.wayline_name}" to ${pendingDelete.drone_name}? The wayline itself is not affected.`
            : ''
        }
        confirmLabel="Remove"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
