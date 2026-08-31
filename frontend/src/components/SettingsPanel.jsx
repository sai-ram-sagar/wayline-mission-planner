import { TbMapPinOff } from 'react-icons/tb';
import {
  AIRCRAFT_BY_MODEL,
  AIRCRAFT_MODELS,
  ALTITUDE_MODES,
  FINISH_ACTIONS,
  GIMBAL_CONTROL_MODES,
  HEADING_MODES,
  MAX_TAKEOFF_SPEED,
  TAKEOFF_MODES,
  TURN_MODES,
} from '../constants';
import { formatCoord } from '../lib/geo';
import { Collapsible, FieldLabel, LabeledSelect, NumberStepper, Segmented } from './controls';

const ALTITUDE_MODE_LABEL = {
  ASL: 'Altitude above sea level',
  ALT: 'Relative to takeoff point',
  AGL: 'Above ground level',
};

/**
 * Global mission settings, grouped the way the reference editor groups them
 * (see docs/feature-reference.md section 5).
 */
export default function SettingsPanel({
  settings,
  aircraftModel,
  onChangeSettings,
  onChangeAircraft,
  onClearTakeoffPoint,
}) {
  const aircraft = AIRCRAFT_BY_MODEL[aircraftModel];
  const set = (key) => (value) => onChangeSettings({ [key]: value });

  return (
    <div>
      <Collapsible title="Aircraft">
        <LabeledSelect
          label="Model"
          hint="The payload a model carries decides which lenses and waypoint actions are available."
          options={AIRCRAFT_MODELS.map((model) => ({ value: model.value, label: model.value }))}
          value={aircraftModel}
          onChange={onChangeAircraft}
        />
        {aircraft && (
          <div>
            <FieldLabel>Lenses</FieldLabel>
            <div className="flex flex-wrap gap-1">
              {aircraft.lenses.map((lens) => (
                <span
                  key={lens}
                  className="rounded bg-panel-600 px-2 py-0.5 text-[11px] text-slate-300"
                >
                  {lens}
                </span>
              ))}
              {!aircraft.gimbalYaw && (
                <span
                  className="rounded bg-panel-700 px-2 py-0.5 text-[11px] text-slate-500"
                  title="This gimbal has no independent yaw axis, so the Gimbal Yaw action is hidden."
                >
                  no gimbal yaw
                </span>
              )}
            </div>
          </div>
        )}
      </Collapsible>

      <Collapsible title="Takeoff">
        <div>
          <FieldLabel hint="The datum for ALT altitudes and for the safe takeoff altitude.">
            Reference takeoff point
          </FieldLabel>
          {settings.takeoffPoint ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate rounded bg-panel-700 px-2 py-1.5 font-mono text-[11px] text-slate-300">
                {formatCoord(settings.takeoffPoint.lat)}, {formatCoord(settings.takeoffPoint.lng)}
              </span>
              <button
                type="button"
                onClick={onClearTakeoffPoint}
                title="Reset takeoff point"
                aria-label="Reset takeoff point"
                className="btn-ghost px-2 py-1.5"
              >
                <TbMapPinOff className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <p className="rounded border border-dashed border-panel-500 px-2 py-2 text-[11px] text-slate-500">
              Not set. Choose the <span className="text-slate-300">Takeoff point</span> tool and
              click the map.
            </p>
          )}
        </div>

        <Segmented
          label="Takeoff mode"
          options={TAKEOFF_MODES}
          value={settings.takeoffMode}
          onChange={set('takeoffMode')}
        />

        <NumberStepper
          label="Safe takeoff altitude"
          hint="Height the aircraft climbs to before heading for the start point. Relative to the takeoff point."
          value={settings.safeTakeoffAltitude}
          onChange={set('safeTakeoffAltitude')}
          min={0}
          max={1500}
          unit="m"
          steps={[10, 100]}
          disabled={settings.takeoffMode !== 'safeTakeoff'}
        />

        <NumberStepper
          label="Takeoff speed"
          hint={`Climb speed on departure. Capped at ${MAX_TAKEOFF_SPEED} m/s.`}
          value={settings.takeoffSpeed}
          onChange={set('takeoffSpeed')}
          min={0.1}
          max={MAX_TAKEOFF_SPEED}
          unit="m/s"
          steps={[1]}
        />
      </Collapsible>

      <Collapsible title="Altitude and speed">
        <Segmented
          label="Waypoint altitude mode"
          hint="How every waypoint's altitude number is interpreted."
          options={ALTITUDE_MODES}
          value={settings.altitudeMode}
          onChange={set('altitudeMode')}
        />

        <NumberStepper
          label={`Global altitude — ${ALTITUDE_MODE_LABEL[settings.altitudeMode]}`}
          hint="New waypoints start at this altitude."
          value={settings.globalAltitude}
          onChange={set('globalAltitude')}
          min={-500}
          max={1500}
          unit="m"
          steps={[10, 100]}
        />

        <NumberStepper
          label="Global flight speed"
          hint="Cruise speed for every waypoint that has no speed override."
          value={settings.globalSpeed}
          onChange={set('globalSpeed')}
          min={0.1}
          max={20}
          unit="m/s"
          steps={[1]}
        />
      </Collapsible>

      <Collapsible title="Flight behaviour" defaultOpen={false}>
        <LabeledSelect
          label="Waypoint type"
          hint="Default turn behaviour. New waypoints inherit this; each waypoint can override it."
          options={TURN_MODES}
          value={settings.waypointType}
          onChange={set('waypointType')}
        />

        <LabeledSelect
          label="Aircraft yaw"
          hint="Default heading behaviour between waypoints."
          options={HEADING_MODES}
          value={settings.aircraftYaw}
          onChange={set('aircraftYaw')}
        />

        <LabeledSelect
          label="Gimbal control"
          options={GIMBAL_CONTROL_MODES}
          value={settings.gimbalControl}
          onChange={set('gimbalControl')}
        />
      </Collapsible>

      <Collapsible title="Finish and safety" defaultOpen={false}>
        <LabeledSelect
          label="Upon completion"
          hint="What the aircraft does once the last waypoint is reached."
          options={FINISH_ACTIONS}
          value={settings.finishAction}
          onChange={set('finishAction')}
        />

        <NumberStepper
          label="Return-to-home altitude"
          hint="Height the aircraft climbs to before returning home."
          value={settings.rthAltitude}
          onChange={set('rthAltitude')}
          min={0}
          max={1500}
          unit="m"
          steps={[10, 100]}
        />
      </Collapsible>
    </div>
  );
}
