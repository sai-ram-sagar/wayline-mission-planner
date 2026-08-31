import { distance as turfDistance, point, bearing as turfBearing } from '@turf/turf';
import { ACTION_BY_TYPE, TURN_MODE_BY_VALUE } from '../constants';

const toPoint = (waypoint) => point([waypoint.lng, waypoint.lat]);

/** Great-circle distance between two waypoints, in metres. */
export function legDistance(from, to) {
  return turfDistance(toPoint(from), toPoint(to), { units: 'meters' });
}

/** Compass bearing from one waypoint to the next, normalised to 0-360. */
export function legBearing(from, to) {
  return (turfBearing(toPoint(from), toPoint(to)) + 360) % 360;
}

/** Sum of every leg, in metres. Returns 0 for fewer than two waypoints. */
export function totalDistance(waypoints) {
  let metres = 0;
  for (let i = 1; i < waypoints.length; i += 1) {
    metres += legDistance(waypoints[i - 1], waypoints[i]);
  }
  return metres;
}

/**
 * Rough flight-time estimate, in seconds.
 *
 * Each leg is flown at the destination waypoint's speed, falling back to the
 * mission's global speed — this mirrors how a per-waypoint speed override
 * behaves. Hover durations are added, and every waypoint whose turn mode brings
 * the aircraft to a stop costs a fixed deceleration/acceleration penalty.
 *
 * This is an estimate for planning only: it ignores wind, battery, climb rate
 * and the actual curve geometry of non-stopping turns.
 */
const STOP_PENALTY_SECONDS = 2;

export function estimatedDuration(waypoints, globalSpeed) {
  const cruise = Number(globalSpeed) > 0 ? Number(globalSpeed) : 10;
  let seconds = 0;

  for (let i = 1; i < waypoints.length; i += 1) {
    const speed = Number(waypoints[i].speed) > 0 ? Number(waypoints[i].speed) : cruise;
    seconds += legDistance(waypoints[i - 1], waypoints[i]) / speed;
  }

  waypoints.forEach((waypoint) => {
    if (TURN_MODE_BY_VALUE[waypoint.turn_mode]?.stops) seconds += STOP_PENALTY_SECONDS;
    waypoint.actions?.forEach((action) => {
      if (action.action_type === 'hover') seconds += Number(action.params?.duration) || 0;
    });
  });

  return seconds;
}

/** Count of actions that capture imagery, shown in the stats strip. */
export function photoCount(waypoints) {
  return waypoints.reduce(
    (total, waypoint) =>
      total +
      (waypoint.actions?.filter((action) => ACTION_BY_TYPE[action.action_type]?.countsAsPhoto)
        .length ?? 0),
    0,
  );
}

/** "994.1 m" / "1.24 km" */
export function formatDistance(metres) {
  if (!Number.isFinite(metres) || metres <= 0) return '0 m';
  return metres < 1000 ? `${metres.toFixed(1)} m` : `${(metres / 1000).toFixed(2)} km`;
}

/** "0 s" / "45 s" / "2 m 5 s" / "1 h 04 m" */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 s';
  const total = Math.round(seconds);
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes} m ${total % 60} s`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} m`;
}

/** Signed degrees to a 6-decimal string, e.g. "-37.804998". */
export const formatCoord = (value) => Number(value).toFixed(6);

/**
 * Projects a coordinate list into an SVG viewBox, preserving aspect ratio and
 * leaving a margin. Used for Library route thumbnails.
 * Returns null when there is nothing worth drawing.
 */
export function pathToSvgPoints(path, width, height, margin = 6) {
  if (!Array.isArray(path) || path.length === 0) return null;

  const lats = path.map((p) => p.lat);
  const lngs = path.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const spanLat = maxLat - minLat;
  const spanLng = maxLng - minLng;
  const innerW = width - margin * 2;
  const innerH = height - margin * 2;

  // A single point, or a perfectly straight north-south / east-west line, has a
  // zero span on one axis; fall back to centring on that axis.
  const scale = Math.min(
    spanLng > 0 ? innerW / spanLng : Infinity,
    spanLat > 0 ? innerH / spanLat : Infinity,
  );
  const usableScale = Number.isFinite(scale) ? scale : 1;

  const drawnW = spanLng * usableScale;
  const drawnH = spanLat * usableScale;
  const offsetX = margin + (innerW - drawnW) / 2;
  const offsetY = margin + (innerH - drawnH) / 2;

  return path.map((p) => ({
    x: offsetX + (p.lng - minLng) * usableScale,
    // SVG y grows downward; latitude grows north, so invert.
    y: offsetY + (maxLat - p.lat) * usableScale,
  }));
}
