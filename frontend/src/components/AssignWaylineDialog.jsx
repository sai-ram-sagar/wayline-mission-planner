import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import { Spinner } from './status';

/**
 * Pick one saved wayline and one or more drones, mirroring the reference's
 * "select route, then select device" plan flow.
 *
 * Offline drones can still be selected — an assignment is a queued instruction,
 * not a live command — but they are flagged so the choice is deliberate.
 */
export default function AssignWaylineDialog({
  open,
  waylines,
  drones,
  submitting,
  error,
  onSubmit,
  onCancel,
}) {
  const [waylineId, setWaylineId] = useState('');
  const [droneIds, setDroneIds] = useState([]);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setWaylineId(waylines[0]?.id ?? '');
    setDroneIds([]);
  }, [open, waylines]);

  const selectedWayline = useMemo(
    () => waylines.find((wayline) => wayline.id === waylineId) ?? null,
    [waylines, waylineId],
  );

  const toggleDrone = (id) =>
    setDroneIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  const canSubmit = Boolean(waylineId) && droneIds.length > 0 && !submitting;
  const offlineSelected = drones.filter(
    (drone) => droneIds.includes(drone.id) && drone.status === 'offline',
  );

  return (
    <Modal
      open={open}
      title="Assign a wayline"
      onClose={submitting ? undefined : onCancel}
      width="max-w-lg"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canSubmit}
            onClick={() => onSubmit(waylineId, droneIds)}
          >
            {submitting && <Spinner className="h-3.5 w-3.5" />}
            {submitting
              ? 'Assigning…'
              : `Assign to ${droneIds.length || 'no'} drone${droneIds.length === 1 ? '' : 's'}`}
          </button>
        </>
      }
    >
      {waylines.length === 0 ? (
        <p className="text-sm text-slate-400">
          There are no saved waylines yet. Plan and save a mission in the editor first.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="field-label" htmlFor="assign-wayline">
              Flight route
            </label>
            <select
              id="assign-wayline"
              className="input"
              value={waylineId}
              onChange={(event) => setWaylineId(event.target.value)}
            >
              {waylines.map((wayline) => (
                <option key={wayline.id} value={wayline.id}>
                  {wayline.name}
                </option>
              ))}
            </select>
            {selectedWayline && (
              <p className="mt-1 text-[11px] text-slate-500">
                {selectedWayline.waypoint_count} waypoint
                {selectedWayline.waypoint_count === 1 ? '' : 's'} &middot;{' '}
                {selectedWayline.aircraft_model}
              </p>
            )}
          </div>

          <fieldset>
            <legend className="field-label">Drones</legend>
            <ul className="max-h-56 space-y-1 overflow-y-auto rounded border border-panel-600 p-1">
              {drones.map((drone) => {
                const checked = droneIds.includes(drone.id);
                return (
                  <li key={drone.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm
                                  ${checked ? 'bg-accent-600/20' : 'hover:bg-panel-700'}`}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-sky-500"
                        checked={checked}
                        onChange={() => toggleDrone(drone.id)}
                      />
                      <span className="min-w-0 flex-1 truncate text-slate-200">{drone.name}</span>
                      <span className="truncate text-[11px] text-slate-500">{drone.model}</span>
                      <StatusBadge status={drone.status} kind="drone" />
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          {offlineSelected.length > 0 && (
            <p className="rounded border border-amber-900/60 bg-amber-950/40 px-2 py-1.5 text-[11px] leading-snug text-amber-300">
              {offlineSelected.map((drone) => drone.name).join(', ')}{' '}
              {offlineSelected.length === 1 ? 'is' : 'are'} offline. The assignment is queued and
              will stay pending until the drone comes back online.
            </p>
          )}

          {error && (
            <p className="rounded border border-red-900/60 bg-red-950/50 px-2 py-1.5 text-[11px] text-red-300">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
