import { create } from 'zustand';
import { ACTION_BY_TYPE, DEFAULT_SETTINGS, TURN_MODE_BY_VALUE } from './constants';

const newKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `k_${Math.random().toString(36).slice(2)}_${Date.now()}`;

const HISTORY_LIMIT = 50;

/** Everything an undo snapshot needs to restore. */
const snapshotOf = (state) => ({
  name: state.name,
  description: state.description,
  aircraftModel: state.aircraftModel,
  settings: state.settings,
  waypoints: state.waypoints,
  selectedKey: state.selectedKey,
});

const emptyMission = () => ({
  waylineId: null,
  name: '',
  description: '',
  aircraftModel: 'Matrice 30 T',
  settings: { ...DEFAULT_SETTINGS },
  waypoints: [],
  selectedKey: null,
  dirty: false,
  history: [],
});

/** Default params for a newly added action, taken from its constants entry. */
export function defaultParamsFor(actionType) {
  const field = ACTION_BY_TYPE[actionType]?.field;
  if (!field) return {};
  return { [field.name]: field.default };
}

export const useMissionStore = create((set, get) => ({
  ...emptyMission(),

  // --- internal -----------------------------------------------------------

  /** Runs `mutate` against the current state, recording an undo snapshot. */
  _commit: (mutate) =>
    set((state) => ({
      ...mutate(state),
      dirty: true,
      history: [...state.history, snapshotOf(state)].slice(-HISTORY_LIMIT),
    })),

  // --- mission metadata ---------------------------------------------------

  setMeta: (patch) => get()._commit((state) => ({ ...state, ...patch })),

  setAircraftModel: (aircraftModel) =>
    get()._commit((state) => {
      // Dropping to a model without a yaw gimbal must not leave orphaned
      // gimbalYaw actions behind, mirroring how the reference hides them.
      const supportsGimbalYaw = (model) =>
        model !== 'Mavic 3E' &&
        model !== 'Mavic 3T' &&
        model !== 'Matrice 3D' &&
        model !== 'Matrice 3TD';
      if (supportsGimbalYaw(aircraftModel)) return { ...state, aircraftModel };
      return {
        ...state,
        aircraftModel,
        waypoints: state.waypoints.map((waypoint) => ({
          ...waypoint,
          actions: waypoint.actions.filter((action) => action.action_type !== 'gimbalYaw'),
        })),
      };
    }),

  updateSettings: (patch) =>
    get()._commit((state) => ({ ...state, settings: { ...state.settings, ...patch } })),

  setTakeoffPoint: (latlng) =>
    get()._commit((state) => ({
      ...state,
      settings: {
        ...state.settings,
        takeoffPoint: latlng ? { lat: latlng.lat, lng: latlng.lng } : null,
      },
    })),

  // --- waypoints ----------------------------------------------------------

  addWaypoint: ({ lat, lng }) =>
    get()._commit((state) => {
      const key = newKey();
      const waypoint = {
        key,
        lat,
        lng,
        // New waypoints inherit the mission's global altitude, as in the reference.
        altitude: state.settings.globalAltitude,
        speed: null, // null = inherit global speed
        heading_mode: state.settings.aircraftYaw,
        heading_value: 0,
        turn_mode: state.settings.waypointType,
        actions: [],
      };
      return { ...state, waypoints: [...state.waypoints, waypoint], selectedKey: key };
    }),

  moveWaypoint: (key, { lat, lng }) =>
    get()._commit((state) => ({
      ...state,
      waypoints: state.waypoints.map((w) => (w.key === key ? { ...w, lat, lng } : w)),
    })),

  updateWaypoint: (key, patch) =>
    get()._commit((state) => ({
      ...state,
      waypoints: state.waypoints.map((waypoint) => {
        if (waypoint.key !== key) return waypoint;
        const next = { ...waypoint, ...patch };
        // Changing to a turn mode where the aircraft never stops invalidates
        // any hover action on this waypoint (the backend rejects that pairing).
        if (patch.turn_mode && !TURN_MODE_BY_VALUE[patch.turn_mode]?.stops) {
          next.actions = next.actions.filter((action) => action.action_type !== 'hover');
        }
        return next;
      }),
    })),

  removeWaypoint: (key) =>
    get()._commit((state) => ({
      ...state,
      waypoints: state.waypoints.filter((w) => w.key !== key),
      selectedKey: state.selectedKey === key ? null : state.selectedKey,
    })),

  /** Moves the waypoint at `from` to index `to`, shifting the rest. */
  reorderWaypoints: (from, to) =>
    get()._commit((state) => {
      if (from === to || from < 0 || to < 0) return state;
      if (from >= state.waypoints.length || to >= state.waypoints.length) return state;
      const waypoints = [...state.waypoints];
      const [moved] = waypoints.splice(from, 1);
      waypoints.splice(to, 0, moved);
      return { ...state, waypoints };
    }),

  reverseRoute: () =>
    get()._commit((state) => ({ ...state, waypoints: [...state.waypoints].reverse() })),

  selectWaypoint: (key) => set({ selectedKey: key }),

  // --- actions on a waypoint ---------------------------------------------

  addAction: (waypointKey, actionType) =>
    get()._commit((state) => ({
      ...state,
      waypoints: state.waypoints.map((waypoint) =>
        waypoint.key === waypointKey
          ? {
              ...waypoint,
              actions: [
                ...waypoint.actions,
                { key: newKey(), action_type: actionType, params: defaultParamsFor(actionType) },
              ],
            }
          : waypoint,
      ),
    })),

  updateAction: (waypointKey, actionKey, params) =>
    get()._commit((state) => ({
      ...state,
      waypoints: state.waypoints.map((waypoint) =>
        waypoint.key === waypointKey
          ? {
              ...waypoint,
              actions: waypoint.actions.map((action) =>
                action.key === actionKey ? { ...action, params: { ...action.params, ...params } } : action,
              ),
            }
          : waypoint,
      ),
    })),

  removeAction: (waypointKey, actionKey) =>
    get()._commit((state) => ({
      ...state,
      waypoints: state.waypoints.map((waypoint) =>
        waypoint.key === waypointKey
          ? { ...waypoint, actions: waypoint.actions.filter((a) => a.key !== actionKey) }
          : waypoint,
      ),
    })),

  moveAction: (waypointKey, from, to) =>
    get()._commit((state) => ({
      ...state,
      waypoints: state.waypoints.map((waypoint) => {
        if (waypoint.key !== waypointKey) return waypoint;
        if (to < 0 || to >= waypoint.actions.length) return waypoint;
        const actions = [...waypoint.actions];
        const [moved] = actions.splice(from, 1);
        actions.splice(to, 0, moved);
        return { ...waypoint, actions };
      }),
    })),

  // --- history and lifecycle ---------------------------------------------

  undo: () =>
    set((state) => {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];
      return { ...state, ...previous, history: state.history.slice(0, -1), dirty: true };
    }),

  canUndo: () => get().history.length > 0,

  /** Clears the waypoints but keeps the mission's name and settings. */
  clearWaypoints: () =>
    get()._commit((state) => ({ ...state, waypoints: [], selectedKey: null })),

  /** Starts a brand-new, unsaved mission. */
  newMission: () => set(emptyMission()),

  /** Replaces the editor contents with a wayline fetched from the API. */
  loadWayline: (dto) =>
    set({
      waylineId: dto.id,
      name: dto.name,
      description: dto.description ?? '',
      aircraftModel: dto.aircraft_model ?? 'Matrice 30 T',
      settings: { ...DEFAULT_SETTINGS, ...(dto.settings ?? {}) },
      waypoints: (dto.waypoints ?? []).map((waypoint) => ({
        key: newKey(),
        lat: waypoint.lat,
        lng: waypoint.lng,
        altitude: waypoint.altitude,
        speed: waypoint.speed,
        heading_mode: waypoint.heading_mode,
        heading_value: waypoint.heading_value,
        turn_mode: waypoint.turn_mode,
        actions: (waypoint.actions ?? []).map((action) => ({
          key: newKey(),
          action_type: action.action_type,
          params: action.params ?? {},
        })),
      })),
      selectedKey: null,
      dirty: false,
      history: [],
    }),

  /** Called after a successful save so the dirty flag and id stay accurate. */
  markSaved: (dto) => set({ waylineId: dto.id, dirty: false, history: [] }),

  /** Serialises the mission into the shape POST/PUT /api/waylines expects. */
  toPayload: () => {
    const state = get();
    return {
      name: state.name.trim(),
      description: state.description.trim(),
      aircraft_model: state.aircraftModel,
      settings: state.settings,
      waypoints: state.waypoints.map((waypoint) => ({
        lat: waypoint.lat,
        lng: waypoint.lng,
        altitude: waypoint.altitude,
        speed: waypoint.speed,
        heading_mode: waypoint.heading_mode,
        heading_value: waypoint.heading_value,
        turn_mode: waypoint.turn_mode,
        actions: waypoint.actions.map((action) => ({
          action_type: action.action_type,
          params: action.params,
        })),
      })),
    };
  },
}));
