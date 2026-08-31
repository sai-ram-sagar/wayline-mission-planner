import { useMemo, useState } from 'react';
import {
  TbArrowBackUp,
  TbArrowsSort,
  TbFocusCentered,
  TbHelicopterLanding,
  TbMapPinPlus,
  TbTrash,
} from 'react-icons/tb';
import MapCanvas from '../components/MapCanvas';
import StatsStrip from '../components/StatsStrip';
import WaypointList from '../components/WaypointList';
import { ConfirmDialog } from '../components/Modal';
import { useMissionStore } from '../store';
import { estimatedDuration, formatDistance, formatDuration, photoCount, totalDistance } from '../lib/geo';

/** Map interaction modes. Only one is active at a time. */
const TOOLS = {
  addWaypoint: {
    label: 'Add waypoint',
    Icon: TbMapPinPlus,
    hint: 'Click the map to add a waypoint. Drag any marker to reposition it.',
  },
  setTakeoff: {
    label: 'Takeoff point',
    Icon: TbHelicopterLanding,
    hint: 'Click the map to set the reference takeoff point.',
  },
};

function ToolbarButton({ Icon, label, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={danger ? 'btn-danger' : 'btn-ghost'}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

export default function Editor() {
  const [tool, setTool] = useState('addWaypoint');
  // Bumping this token asks the map to fit the route into view.
  const [fitToken, setFitToken] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const waypoints = useMissionStore((s) => s.waypoints);
  const settings = useMissionStore((s) => s.settings);
  const selectedKey = useMissionStore((s) => s.selectedKey);
  const historyDepth = useMissionStore((s) => s.history.length);

  const addWaypoint = useMissionStore((s) => s.addWaypoint);
  const moveWaypoint = useMissionStore((s) => s.moveWaypoint);
  const removeWaypoint = useMissionStore((s) => s.removeWaypoint);
  const reorderWaypoints = useMissionStore((s) => s.reorderWaypoints);
  const selectWaypoint = useMissionStore((s) => s.selectWaypoint);
  const reverseRoute = useMissionStore((s) => s.reverseRoute);
  const clearWaypoints = useMissionStore((s) => s.clearWaypoints);
  const setTakeoffPoint = useMissionStore((s) => s.setTakeoffPoint);
  const undo = useMissionStore((s) => s.undo);

  const stats = useMemo(
    () => ({
      distance: formatDistance(totalDistance(waypoints)),
      duration: formatDuration(estimatedDuration(waypoints, settings.globalSpeed)),
      waypointCount: waypoints.length,
      photoCount: photoCount(waypoints),
    }),
    [waypoints, settings.globalSpeed],
  );

  const handleMapClick = (latlng) => {
    if (tool === 'addWaypoint') addWaypoint(latlng);
    else if (tool === 'setTakeoff') setTakeoffPoint(latlng);
  };

  const handleClearConfirmed = () => {
    clearWaypoints();
    setConfirmClear(false);
  };

  return (
    <div className="flex h-full">
      {/* Waypoint list */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-panel-600 bg-panel-800">
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-panel-600 px-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Waypoint list
          </h2>
          <button
            type="button"
            onClick={reverseRoute}
            disabled={waypoints.length < 2}
            title="Reverse flight route"
            aria-label="Reverse flight route"
            className="rounded p-1 text-slate-400 hover:bg-panel-600 hover:text-slate-100
                       disabled:cursor-not-allowed disabled:opacity-30"
          >
            <TbArrowsSort className="h-4 w-4" />
          </button>
        </div>

        <StatsStrip {...stats} />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <WaypointList
            waypoints={waypoints}
            selectedKey={selectedKey}
            globalSpeed={settings.globalSpeed}
            onSelect={selectWaypoint}
            onRemove={removeWaypoint}
            onReorder={reorderWaypoints}
          />
        </div>
      </aside>

      {/* Map + toolbar */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 flex-wrap items-center gap-2 border-b border-panel-600 bg-panel-800 px-3">
          <div className="segmented">
            {Object.entries(TOOLS).map(([key, { label, Icon }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTool(key)}
                className={[
                  'segmented-option flex items-center gap-1.5',
                  tool === key ? 'segmented-option-on' : 'segmented-option-off',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ToolbarButton
              Icon={TbArrowBackUp}
              label="Undo"
              onClick={undo}
              disabled={historyDepth === 0}
            />
            <ToolbarButton
              Icon={TbFocusCentered}
              label="Fit route"
              onClick={() => setFitToken(Date.now())}
              disabled={waypoints.length === 0 && !settings.takeoffPoint}
            />
            <ToolbarButton
              Icon={TbTrash}
              label="Clear"
              onClick={() => setConfirmClear(true)}
              disabled={waypoints.length === 0}
              danger
            />
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <MapCanvas
            waypoints={waypoints}
            takeoffPoint={settings.takeoffPoint}
            selectedKey={selectedKey}
            onMapClick={handleMapClick}
            onWaypointClick={selectWaypoint}
            onWaypointDragEnd={moveWaypoint}
            fitToken={fitToken}
            interactionHint={TOOLS[tool].hint}
          />
        </div>
      </section>

      <ConfirmDialog
        open={confirmClear}
        title="Clear waypoints"
        message={`Remove all ${waypoints.length} waypoint${
          waypoints.length === 1 ? '' : 's'
        } from this mission? Mission settings are kept, and this can be undone.`}
        confirmLabel="Clear waypoints"
        onConfirm={handleClearConfirmed}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
