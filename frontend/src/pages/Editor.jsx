import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TbArrowBackUp,
  TbArrowsSort,
  TbDeviceFloppy,
  TbFilePlus,
  TbFocusCentered,
  TbHelicopterLanding,
  TbMapPinPlus,
  TbTrash,
} from 'react-icons/tb';
import MapCanvas from '../components/MapCanvas';
import StatsStrip from '../components/StatsStrip';
import WaypointList from '../components/WaypointList';
import SettingsPanel from '../components/SettingsPanel';
import WaypointInspector from '../components/WaypointInspector';
import SaveMissionDialog from '../components/SaveMissionDialog';
import { ConfirmDialog } from '../components/Modal';
import { useMissionStore } from '../store';
import { describeError, waylinesApi } from '../api';
import {
  estimatedDuration,
  formatDistance,
  formatDuration,
  photoCount,
  totalDistance,
} from '../lib/geo';

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

const TABS = [
  { key: 'waypoints', label: 'Waypoints' },
  { key: 'settings', label: 'Settings' },
];

function ToolbarButton({ Icon, label, title, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
      className={danger ? 'btn-danger' : 'btn-ghost'}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

export default function Editor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const idParam = searchParams.get('id');

  const [tool, setTool] = useState('addWaypoint');
  const [tab, setTab] = useState('waypoints');
  // Bumping this token asks the map to fit the route into view.
  const [fitToken, setFitToken] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [flash, setFlash] = useState(null);

  const waylineId = useMissionStore((s) => s.waylineId);
  const name = useMissionStore((s) => s.name);
  const description = useMissionStore((s) => s.description);
  const aircraftModel = useMissionStore((s) => s.aircraftModel);
  const waypoints = useMissionStore((s) => s.waypoints);
  const settings = useMissionStore((s) => s.settings);
  const selectedKey = useMissionStore((s) => s.selectedKey);
  const dirty = useMissionStore((s) => s.dirty);
  const historyDepth = useMissionStore((s) => s.history.length);

  const addWaypoint = useMissionStore((s) => s.addWaypoint);
  const moveWaypoint = useMissionStore((s) => s.moveWaypoint);
  const updateWaypoint = useMissionStore((s) => s.updateWaypoint);
  const removeWaypoint = useMissionStore((s) => s.removeWaypoint);
  const reorderWaypoints = useMissionStore((s) => s.reorderWaypoints);
  const selectWaypoint = useMissionStore((s) => s.selectWaypoint);
  const reverseRoute = useMissionStore((s) => s.reverseRoute);
  const clearWaypoints = useMissionStore((s) => s.clearWaypoints);
  const setTakeoffPoint = useMissionStore((s) => s.setTakeoffPoint);
  const updateSettings = useMissionStore((s) => s.updateSettings);
  const setAircraftModel = useMissionStore((s) => s.setAircraftModel);
  const addAction = useMissionStore((s) => s.addAction);
  const updateAction = useMissionStore((s) => s.updateAction);
  const removeAction = useMissionStore((s) => s.removeAction);
  const moveAction = useMissionStore((s) => s.moveAction);
  const undo = useMissionStore((s) => s.undo);
  const newMission = useMissionStore((s) => s.newMission);
  const loadWayline = useMissionStore((s) => s.loadWayline);
  const markSaved = useMissionStore((s) => s.markSaved);

  const selectedIndex = waypoints.findIndex((waypoint) => waypoint.key === selectedKey);
  const selected = selectedIndex >= 0 ? waypoints[selectedIndex] : null;

  const stats = useMemo(
    () => ({
      distance: formatDistance(totalDistance(waypoints)),
      duration: formatDuration(estimatedDuration(waypoints, settings.globalSpeed)),
      waypointCount: waypoints.length,
      photoCount: photoCount(waypoints),
    }),
    [waypoints, settings.globalSpeed],
  );

  // Load a wayline when the URL carries ?id= and it is not already open.
  //
  // The id we have fetched lives in a ref rather than in the dependency list.
  // Depending on the store's waylineId would re-run this effect the moment the
  // fetch resolves and loadWayline sets it, cancelling the in-flight run before
  // its finally could clear the loading flag — leaving the overlay stuck.
  const loadedIdRef = useRef(null);

  useEffect(() => {
    if (!idParam) {
      loadedIdRef.current = null;
      return undefined;
    }
    if (idParam === loadedIdRef.current) return undefined;
    // Already in the store — e.g. the id the save we just made put in the URL.
    if (idParam === useMissionStore.getState().waylineId) {
      loadedIdRef.current = idParam;
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    waylinesApi
      .get(idParam)
      .then((dto) => {
        if (cancelled) return;
        loadedIdRef.current = dto.id;
        loadWayline(dto);
        setFitToken(Date.now());
      })
      .catch((error) => {
        if (!cancelled) setLoadError(describeError(error, 'Could not load that wayline.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idParam, loadWayline]);

  // Native guard for closing or reloading the tab with unsaved work. In-app
  // navigation cannot be blocked without a data router, so the top bar shows a
  // persistent "unsaved changes" badge instead.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(timer);
  }, [flash]);

  // Keyboard shortcuts. Ignored while the user is typing, so Delete still
  // edits text in the inspector and the save dialog.
  useEffect(() => {
    const isTyping = (target) =>
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

    const onKeyDown = (event) => {
      if (isTyping(event.target)) return;

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedKey) {
        event.preventDefault();
        removeWaypoint(selectedKey);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
        return;
      }
      if (event.key === 'Escape' && selectedKey) {
        selectWaypoint(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedKey, removeWaypoint, undo, selectWaypoint]);

  const handleMapClick = (latlng) => {
    if (tool === 'addWaypoint') addWaypoint(latlng);
    else if (tool === 'setTakeoff') setTakeoffPoint(latlng);
  };

  const handleSave = async ({ name: nextName, description: nextDescription }) => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        ...useMissionStore.getState().toPayload(),
        name: nextName.trim(),
        description: nextDescription.trim(),
      };
      const isUpdate = Boolean(waylineId);
      const dto = isUpdate
        ? await waylinesApi.update(waylineId, payload)
        : await waylinesApi.create(payload);

      loadWayline(dto);
      markSaved(dto);
      setSearchParams({ id: dto.id }, { replace: true });
      setSaveOpen(false);
      setFlash(`${isUpdate ? 'Updated' : 'Saved'} "${dto.name}".`);
    } catch (error) {
      setSaveError(describeError(error, 'Could not save the wayline.'));
    } finally {
      setSaving(false);
    }
  };

  const handleNewMission = () => {
    newMission();
    setSearchParams({}, { replace: true });
    setConfirmNew(false);
    setFlash('Started a new mission.');
  };

  // Stable identities keep the inspector's watch subscription from re-binding
  // on every render.
  const handleWaypointChange = useCallback(
    (patch) => selectedKey && updateWaypoint(selectedKey, patch),
    [selectedKey, updateWaypoint],
  );
  const handleAddAction = useCallback(
    (actionType) => selectedKey && addAction(selectedKey, actionType),
    [selectedKey, addAction],
  );
  const handleUpdateAction = useCallback(
    (actionKey, params) => selectedKey && updateAction(selectedKey, actionKey, params),
    [selectedKey, updateAction],
  );
  const handleRemoveAction = useCallback(
    (actionKey) => selectedKey && removeAction(selectedKey, actionKey),
    [selectedKey, removeAction],
  );
  const handleMoveAction = useCallback(
    (from, to) => selectedKey && moveAction(selectedKey, from, to),
    [selectedKey, moveAction],
  );

  return (
    <div className="relative flex h-full">
      {/* Waypoints / settings */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-panel-600 bg-panel-800 md:w-72">
        <div className="flex h-10 shrink-0 items-center border-b border-panel-600">
          <div className="flex flex-1">
            {TABS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setTab(entry.key)}
                className={[
                  'flex-1 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors',
                  tab === entry.key
                    ? 'border-b-2 border-accent-500 text-slate-100'
                    : 'text-slate-500 hover:text-slate-300',
                ].join(' ')}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={reverseRoute}
            disabled={waypoints.length < 2}
            title="Reverse flight route"
            aria-label="Reverse flight route"
            className="mr-2 rounded p-1 text-slate-400 hover:bg-panel-600 hover:text-slate-100
                       disabled:cursor-not-allowed disabled:opacity-30"
          >
            <TbArrowsSort className="h-4 w-4" />
          </button>
        </div>

        <StatsStrip {...stats} />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === 'waypoints' ? (
            <WaypointList
              waypoints={waypoints}
              selectedKey={selectedKey}
              globalSpeed={settings.globalSpeed}
              onSelect={selectWaypoint}
              onRemove={removeWaypoint}
              onReorder={reorderWaypoints}
            />
          ) : (
            <SettingsPanel
              settings={settings}
              aircraftModel={aircraftModel}
              onChangeSettings={updateSettings}
              onChangeAircraft={setAircraftModel}
              onClearTakeoffPoint={() => setTakeoffPoint(null)}
            />
          )}
        </div>
      </aside>

      {/* Map + toolbar */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-panel-600 bg-panel-800 px-3">
          <div className="segmented shrink-0">
            {Object.entries(TOOLS).map(([key, { label, Icon }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTool(key)}
                className={[
                  'segmented-option flex items-center gap-1.5 whitespace-nowrap',
                  tool === key ? 'segmented-option-on' : 'segmented-option-off',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <span className="min-w-0 flex-1 truncate px-2 text-sm text-slate-300" title={name}>
            {name || <span className="italic text-slate-500">Untitled mission</span>}
          </span>

          <div className="flex shrink-0 items-center gap-2">
            <ToolbarButton
              Icon={TbFilePlus}
              label="New"
              onClick={() => (dirty ? setConfirmNew(true) : handleNewMission())}
            />
            <ToolbarButton
              Icon={TbArrowBackUp}
              label="Undo"
              title="Undo (Ctrl+Z)"
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
            <button
              type="button"
              className="btn-primary"
              onClick={() => setSaveOpen(true)}
              disabled={waypoints.length === 0 || saving}
              title={
                waypoints.length === 0 ? 'Add at least one waypoint before saving' : 'Save wayline'
              }
            >
              <TbDeviceFloppy className="h-4 w-4" />
              {waylineId ? 'Update' : 'Save'}
            </button>
          </div>
        </div>

        {(flash || loadError) && (
          <div
            className={[
              'shrink-0 px-3 py-1.5 text-xs',
              loadError
                ? 'border-b border-red-900/60 bg-red-950/50 text-red-300'
                : 'border-b border-emerald-900/60 bg-emerald-950/40 text-emerald-300',
            ].join(' ')}
          >
            {loadError ?? flash}
          </div>
        )}

        <div className="relative min-h-0 flex-1">
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
          {loading && (
            <div className="absolute inset-0 z-[1200] grid place-items-center bg-panel-900/70">
              <span className="rounded bg-panel-800 px-4 py-2 text-sm text-slate-200 shadow-lg">
                Loading wayline…
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Waypoint inspector. Below xl there is not enough width for a third
          column, so it overlays the map instead of squeezing it. */}
      {selected && (
        <aside
          className="absolute inset-y-0 right-0 z-[1100] w-80 shrink-0 border-l border-panel-600
                     bg-panel-800 shadow-2xl xl:static xl:z-auto xl:shadow-none"
        >
          <WaypointInspector
            key={selected.key}
            waypoint={selected}
            index={selectedIndex}
            total={waypoints.length}
            aircraftModel={aircraftModel}
            globalSpeed={settings.globalSpeed}
            onChange={handleWaypointChange}
            onAddAction={handleAddAction}
            onUpdateAction={handleUpdateAction}
            onRemoveAction={handleRemoveAction}
            onMoveAction={handleMoveAction}
            onClose={() => selectWaypoint(null)}
          />
        </aside>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear waypoints"
        message={`Remove all ${waypoints.length} waypoint${
          waypoints.length === 1 ? '' : 's'
        } from this mission? Mission settings are kept, and this can be undone.`}
        confirmLabel="Clear waypoints"
        onConfirm={() => {
          clearWaypoints();
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />

      <ConfirmDialog
        open={confirmNew}
        title="Start a new mission"
        message="This mission has unsaved changes. Starting a new one discards them."
        confirmLabel="Discard and start new"
        onConfirm={handleNewMission}
        onCancel={() => setConfirmNew(false)}
      />

      <SaveMissionDialog
        open={saveOpen}
        initialName={name}
        initialDescription={description}
        isUpdate={Boolean(waylineId)}
        saving={saving}
        error={saveError}
        onSubmit={handleSave}
        onCancel={() => {
          setSaveOpen(false);
          setSaveError(null);
        }}
      />
    </div>
  );
}
