import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TbChevronDown, TbChevronUp, TbPlus, TbTrash, TbX } from 'react-icons/tb';
import {
  ACTION_BY_TYPE,
  ACTION_TYPES,
  AIRCRAFT_BY_MODEL,
  HEADING_MODES,
  TURN_MODES,
  TURN_MODE_BY_VALUE,
} from '../constants';
import { Collapsible, FieldLabel, LabeledSelect, NumberStepper } from './controls';

const HEADING_MODE_VALUES = HEADING_MODES.map((mode) => mode.value);
const TURN_MODE_VALUES = TURN_MODES.map((mode) => mode.value);

/**
 * Mirrors backend/lib/schemas.js `waypointSchema` for the fields this panel
 * edits, so the client rejects the same values the API would.
 */
const waypointFormSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  altitude: z.coerce.number().min(-500).max(1500),
  // null means "inherit the mission's global speed".
  speed: z.union([z.null(), z.coerce.number().min(0.1).max(20)]),
  heading_mode: z.enum(HEADING_MODE_VALUES),
  heading_value: z.coerce.number().min(-180).max(180),
  turn_mode: z.enum(TURN_MODE_VALUES),
});

const FORM_FIELDS = ['lat', 'lng', 'altitude', 'speed', 'heading_mode', 'heading_value', 'turn_mode'];

const sameWaypoint = (a, b) => FORM_FIELDS.every((field) => a[field] === b[field]);

/** Editor for the single parameter an action exposes. */
function ActionParams({ action, onChange }) {
  const field = ACTION_BY_TYPE[action.action_type]?.field;
  if (!field) {
    return <p className="text-[11px] italic text-slate-500">No parameters.</p>;
  }

  if (field.kind === 'text') {
    return (
      <div>
        <FieldLabel>{field.label}</FieldLabel>
        <input
          type="text"
          className="input font-mono text-[11px]"
          maxLength={field.maxLength}
          value={action.params?.[field.name] ?? field.default}
          onChange={(event) => onChange({ [field.name]: event.target.value })}
        />
      </div>
    );
  }

  return (
    <NumberStepper
      label={field.label}
      value={action.params?.[field.name] ?? field.default}
      onChange={(value) => onChange({ [field.name]: value })}
      min={field.min}
      max={field.max}
      step={field.step}
      unit={field.unit}
      steps={[1, 10]}
    />
  );
}

export default function WaypointInspector({
  waypoint,
  index,
  total,
  aircraftModel,
  globalSpeed,
  onChange,
  onAddAction,
  onUpdateAction,
  onRemoveAction,
  onMoveAction,
  onClose,
}) {
  const [pendingAction, setPendingAction] = useState('');

  const defaults = useMemo(
    () => ({
      lat: waypoint.lat,
      lng: waypoint.lng,
      altitude: waypoint.altitude,
      speed: waypoint.speed,
      heading_mode: waypoint.heading_mode,
      heading_value: waypoint.heading_value,
      turn_mode: waypoint.turn_mode,
    }),
    [waypoint],
  );

  const {
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(waypointFormSchema),
    // `values` (not defaultValues) re-syncs the form when the selection changes.
    values: defaults,
    mode: 'onChange',
  });

  // Push valid edits into the store. The equality guard is essential: without
  // it, committing would change `values`, which would re-fire this subscription
  // and loop, growing the undo history without bound.
  useEffect(() => {
    const subscription = watch((formValues) => {
      const parsed = waypointFormSchema.safeParse(formValues);
      if (!parsed.success) return;
      if (sameWaypoint(parsed.data, waypoint)) return;
      onChange(parsed.data);
    });
    return () => subscription.unsubscribe();
  }, [watch, waypoint, onChange]);

  const headingMode = watch('heading_mode');
  const turnMode = watch('turn_mode');
  const stopsHere = TURN_MODE_BY_VALUE[turnMode]?.stops ?? false;
  const supportsGimbalYaw = AIRCRAFT_BY_MODEL[aircraftModel]?.gimbalYaw ?? true;

  // The reference hides actions the payload cannot perform and disables Hover
  // where the aircraft does not stop.
  const availableActions = ACTION_TYPES.filter((action) => {
    if (action.payload === 'gimbalYaw' && !supportsGimbalYaw) return false;
    if (action.requiresStop && !stopsHere) return false;
    return true;
  });

  const addPendingAction = () => {
    if (!pendingAction) return;
    onAddAction(pendingAction);
    setPendingAction('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-panel-600 px-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Waypoint {index + 1}
          <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-500">
            of {total}
          </span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close waypoint inspector"
          className="rounded p-1 text-slate-400 hover:bg-panel-600 hover:text-slate-100"
        >
          <TbX className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Collapsible title="Position">
          <div className="grid grid-cols-2 gap-2">
            <Controller
              name="lat"
              control={control}
              render={({ field }) => (
                <div>
                  <FieldLabel>Latitude</FieldLabel>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input font-mono text-[11px]"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </div>
              )}
            />
            <Controller
              name="lng"
              control={control}
              render={({ field }) => (
                <div>
                  <FieldLabel>Longitude</FieldLabel>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input font-mono text-[11px]"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </div>
              )}
            />
          </div>
          {(errors.lat || errors.lng) && (
            <p className="text-[11px] text-red-400">
              {errors.lat?.message ?? errors.lng?.message}
            </p>
          )}

          <Controller
            name="altitude"
            control={control}
            render={({ field }) => (
              <NumberStepper
                label="Altitude"
                value={field.value}
                onChange={field.onChange}
                min={-500}
                max={1500}
                unit="m"
                steps={[10, 100]}
              />
            )}
          />
          {errors.altitude && (
            <p className="text-[11px] text-red-400">{errors.altitude.message}</p>
          )}
        </Collapsible>

        <Collapsible title="Flight">
          <Controller
            name="speed"
            control={control}
            render={({ field }) => (
              <div>
                <NumberStepper
                  label="Speed"
                  hint="Leave empty to inherit the mission's global flight speed."
                  value={field.value}
                  onChange={field.onChange}
                  min={0.1}
                  max={20}
                  unit="m/s"
                  steps={[1]}
                  allowEmpty
                  placeholder={`${globalSpeed} (global)`}
                />
                {field.value === null && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Inheriting the global speed of {globalSpeed} m/s.
                  </p>
                )}
              </div>
            )}
          />

          <Controller
            name="turn_mode"
            control={control}
            render={({ field }) => (
              <LabeledSelect
                label="Waypoint type"
                options={TURN_MODES}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <Controller
            name="heading_mode"
            control={control}
            render={({ field }) => (
              <LabeledSelect
                label="Aircraft yaw"
                options={HEADING_MODES}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <Controller
            name="heading_value"
            control={control}
            render={({ field }) => (
              <NumberStepper
                label="Heading"
                hint="Only used when aircraft yaw is set to Manual."
                value={field.value}
                onChange={field.onChange}
                min={-180}
                max={180}
                unit="°"
                steps={[1, 10]}
                disabled={headingMode !== 'manual'}
              />
            )}
          />
        </Collapsible>

        <Collapsible title={`Actions (${waypoint.actions.length})`}>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <FieldLabel hint="Actions run in order when the aircraft reaches this waypoint.">
                Add action
              </FieldLabel>
              <select
                className="input"
                value={pendingAction}
                onChange={(event) => setPendingAction(event.target.value)}
              >
                <option value="">Select an action…</option>
                {availableActions.map((action) => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn-primary px-2 py-1.5"
              onClick={addPendingAction}
              disabled={!pendingAction}
              aria-label="Add action to waypoint"
            >
              <TbPlus className="h-4 w-4" />
            </button>
          </div>

          {!stopsHere && (
            <p className="rounded border border-panel-600 bg-panel-700/60 px-2 py-1.5 text-[11px] leading-snug text-slate-400">
              This waypoint type does not stop the aircraft, so the Hover action is unavailable.
            </p>
          )}

          {waypoint.actions.length === 0 ? (
            <p className="text-[11px] italic text-slate-500">No actions on this waypoint.</p>
          ) : (
            <ol className="space-y-2">
              {waypoint.actions.map((action, actionIndex) => (
                <li key={action.key} className="rounded border border-panel-600 bg-panel-700/50 p-2">
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-panel-500 text-[10px] font-bold text-slate-200">
                      {actionIndex + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-200">
                      {ACTION_BY_TYPE[action.action_type]?.label ?? action.action_type}
                    </span>
                    <button
                      type="button"
                      onClick={() => onMoveAction(actionIndex, actionIndex - 1)}
                      disabled={actionIndex === 0}
                      aria-label="Move action earlier"
                      className="rounded p-0.5 text-slate-500 hover:text-slate-200 disabled:opacity-25"
                    >
                      <TbChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveAction(actionIndex, actionIndex + 1)}
                      disabled={actionIndex === waypoint.actions.length - 1}
                      aria-label="Move action later"
                      className="rounded p-0.5 text-slate-500 hover:text-slate-200 disabled:opacity-25"
                    >
                      <TbChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveAction(action.key)}
                      aria-label={`Remove ${ACTION_BY_TYPE[action.action_type]?.label ?? 'action'}`}
                      className="rounded p-0.5 text-slate-500 hover:text-red-400"
                    >
                      <TbTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ActionParams
                    action={action}
                    onChange={(params) => onUpdateAction(action.key, params)}
                  />
                </li>
              ))}
            </ol>
          )}
        </Collapsible>
      </div>
    </div>
  );
}
