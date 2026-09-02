// Display vocabularies for the mission editor.
//
// The `value` of every option must stay in step with backend/lib/schemas.js and
// the CHECK constraints in backend/db.js. Labels and hints are paraphrased from
// docs/feature-reference.md sections 5.4, 5.6, 5.7, 5.8 and 7.

export const ALTITUDE_MODES = [
  { value: 'ASL', label: 'ASL', hint: 'Altitude above mean sea level.' },
  { value: 'ALT', label: 'ALT', hint: 'Relative to the reference takeoff point. May be negative.' },
  { value: 'AGL', label: 'AGL', hint: 'Above ground level.' },
];

export const TAKEOFF_MODES = [
  {
    value: 'directAscent',
    label: 'Direct Ascent',
    hint: 'Ascend to the start-point altitude and fly straight to the start point.',
  },
  {
    value: 'safeTakeoff',
    label: 'Safe Takeoff',
    hint: 'Ascend to the safe takeoff altitude first, then fly to the start point.',
  },
];

export const TURN_MODES = [
  {
    value: 'coordinatedTurnSkip',
    label: 'Coordinated turn. Skips waypoint',
    hint: 'Smooth turn; the aircraft does not pass through the waypoint.',
    stops: false,
  },
  {
    value: 'straightStop',
    label: 'Straight route. Aircraft stops',
    hint: 'Flies straight in and stops at the waypoint.',
    stops: true,
  },
  {
    value: 'earlyTurnThrough',
    label: 'Turns before waypoint. Flies through',
    hint: 'Begins turning early but still passes through the waypoint.',
    stops: false,
  },
  {
    value: 'curvedStop',
    label: 'Curved route. Aircraft stops',
    hint: 'Curved approach, stopping at the waypoint.',
    stops: true,
  },
  {
    value: 'curvedContinue',
    label: 'Curved route. Aircraft continues',
    hint: 'Curved path; the aircraft never stops. Hover actions are not available.',
    stops: false,
  },
];

export const HEADING_MODES = [
  {
    value: 'alongRoute',
    label: 'Along Route',
    hint: 'Heading follows the route direction toward the next waypoint.',
    usesValue: false,
  },
  {
    value: 'manual',
    label: 'Manual',
    hint: 'Hold a fixed heading while flying to the next waypoint.',
    usesValue: true,
  },
  {
    value: 'lockYawAxis',
    label: 'Lock Yaw Axis',
    hint: 'Keep the yaw angle carried over from the previous waypoint.',
    usesValue: false,
  },
];

export const GIMBAL_CONTROL_MODES = [
  {
    value: 'manual',
    label: 'Manual',
    hint: 'Gimbal holds the previous waypoint angle unless an action changes it.',
  },
  {
    value: 'forEachWaypoint',
    label: 'For Each Waypoint',
    hint: 'Gimbal tilt interpolates evenly between waypoints.',
  },
];

export const FINISH_ACTIONS = [
  { value: 'returnToHome', label: 'Return to Home', hint: 'Fly to the takeoff point when the route ends.' },
  { value: 'returnToStartAndHover', label: 'Return to Start Point and Hover', hint: 'Fly back to point S and hover.' },
  { value: 'exitTask', label: 'Exit Task', hint: 'End the task immediately and hover in place.' },
  { value: 'land', label: 'Land', hint: 'Land at the current location.' },
];

/**
 * Waypoint actions. `field` describes the single parameter each action edits;
 * actions with no field are fire-and-forget.
 *
 * `requiresStop` marks actions that only make sense where the aircraft halts —
 * the reference disables Hover on non-stopping waypoint types.
 * `payload` names the gimbal axis an action needs, so models without that axis
 * can hide it (the reference omits Gimbal Yaw on aircraft with no yaw gimbal).
 */
export const ACTION_TYPES = [
  {
    value: 'takePhoto',
    label: 'Take Photo',
    countsAsPhoto: true,
    field: {
      name: 'filenameTemplate',
      label: 'Filename template',
      kind: 'text',
      default: 'WMP_YYYYMMDDhhmmss',
      maxLength: 120,
    },
  },
  { value: 'startRecord', label: 'Start Recording' },
  { value: 'stopRecord', label: 'Stop Recording' },
  {
    value: 'hover',
    label: 'Hover',
    requiresStop: true,
    field: { name: 'duration', label: 'Duration', unit: 's', kind: 'number', min: 0, max: 3600, step: 1, default: 3 },
  },
  {
    value: 'gimbalPitch',
    label: 'Gimbal Tilt',
    field: { name: 'angle', label: 'Tilt', unit: '°', kind: 'number', min: -120, max: 45, step: 1, default: 0 },
  },
  {
    value: 'gimbalYaw',
    label: 'Gimbal Yaw',
    payload: 'gimbalYaw',
    field: { name: 'angle', label: 'Yaw', unit: '°', kind: 'number', min: -180, max: 180, step: 1, default: 0 },
  },
  {
    value: 'aircraftYaw',
    label: 'Aircraft Yaw',
    field: { name: 'angle', label: 'Yaw', unit: '°', kind: 'number', min: -180, max: 180, step: 1, default: 0 },
  },
  {
    value: 'zoom',
    label: 'Camera Zoom',
    field: { name: 'ratio', label: 'Zoom ratio', unit: '×', kind: 'number', min: 1, max: 200, step: 0.1, default: 1 },
  },
  {
    value: 'timedIntervalShot',
    label: 'Start Timed Interval Shot',
    countsAsPhoto: true,
    field: { name: 'interval', label: 'Interval', unit: 's', kind: 'number', min: 0.5, max: 600, step: 0.5, default: 2 },
  },
  {
    value: 'distanceIntervalShot',
    label: 'Start Distance Interval Shot',
    countsAsPhoto: true,
    field: { name: 'interval', label: 'Interval', unit: 'm', kind: 'number', min: 0.5, max: 1000, step: 0.5, default: 10 },
  },
  { value: 'endIntervalShot', label: 'End Interval Shot' },
];

export const ACTION_BY_TYPE = Object.fromEntries(ACTION_TYPES.map((a) => [a.value, a]));
export const TURN_MODE_BY_VALUE = Object.fromEntries(TURN_MODES.map((t) => [t.value, t]));

/**
 * Aircraft the planner offers, and what their payload supports. Drawn from the
 * families catalogued in docs/feature-reference.md section 3.2. `gimbalYaw`
 * marks models whose gimbal has an independent yaw axis; models without it hide
 * the Gimbal Yaw action, exactly as the reference does for Mavic 3T.
 */
export const AIRCRAFT_MODELS = [
  { value: 'Matrice 30 T', lenses: ['Wide', 'Zoom', 'IR'], gimbalYaw: true },
  { value: 'Matrice 30', lenses: ['Wide', 'Zoom'], gimbalYaw: true },
  { value: 'Mavic 3E', lenses: ['Wide'], gimbalYaw: false },
  { value: 'Mavic 3T', lenses: ['Wide', 'Zoom', 'IR'], gimbalYaw: false },
  { value: 'Matrice 3D', lenses: ['Wide'], gimbalYaw: false },
  { value: 'Matrice 3TD', lenses: ['Wide', 'IR'], gimbalYaw: false },
  { value: 'Matrice 4E', lenses: ['Wide', 'Zoom'], gimbalYaw: true },
  { value: 'Matrice 4T', lenses: ['Wide', 'Zoom', 'IR'], gimbalYaw: true },
  { value: 'Generic Quadcopter', lenses: ['Wide'], gimbalYaw: true },
];

export const AIRCRAFT_BY_MODEL = Object.fromEntries(AIRCRAFT_MODELS.map((a) => [a.value, a]));

export const DRONE_STATUSES = ['idle', 'flying', 'offline'];

/** Assignment lifecycle, in the order the UI advances through it. */
export const ASSIGNMENT_FLOW = ['pending', 'synced', 'in_progress', 'complete'];
export const ASSIGNMENT_STATUSES = [...ASSIGNMENT_FLOW, 'failed'];

export const ASSIGNMENT_STATUS_LABELS = {
  pending: 'Pending',
  synced: 'Synced',
  in_progress: 'In progress',
  complete: 'Complete',
  failed: 'Failed',
};

/** Defaults for a brand-new mission, matching the reference's out-of-box state. */
export const DEFAULT_SETTINGS = {
  takeoffPoint: null,
  takeoffMode: 'directAscent',
  safeTakeoffAltitude: 20,
  altitudeMode: 'ASL',
  globalAltitude: 100,
  globalSpeed: 10,
  takeoffSpeed: 15,
  waypointType: 'straightStop',
  aircraftYaw: 'alongRoute',
  gimbalControl: 'manual',
  finishAction: 'returnToHome',
  rthAltitude: 100,
};

export const MAX_TAKEOFF_SPEED = 15;

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// `import.meta.env` only exists under Vite. Falling back to an empty object
// keeps this module importable from plain Node, so the pure helpers that
// depend on it can be unit-tested without a bundler.
const env = import.meta.env ?? {};

export const DEFAULT_MAP_VIEW = {
  lat: num(env.VITE_DEFAULT_MAP_LAT, -37.805),
  lng: num(env.VITE_DEFAULT_MAP_LNG, 145.278),
  zoom: num(env.VITE_DEFAULT_MAP_ZOOM, 16),
};
