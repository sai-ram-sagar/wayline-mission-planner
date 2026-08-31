import { useMemo } from 'react';
import { pathToSvgPoints } from '../lib/geo';

const WIDTH = 240;
const HEIGHT = 96;

/**
 * Static route preview for a Library card: the wayline's coordinates projected
 * into a fixed viewBox and drawn as a polyline, with the start point marked.
 *
 * Deliberately an inline SVG rather than a map snapshot — it needs no tile
 * requests, renders instantly for a whole grid of cards, and stays legible at
 * thumbnail size.
 */
export default function RouteThumbnail({ path, className = '' }) {
  const points = useMemo(() => pathToSvgPoints(path, WIDTH, HEIGHT), [path]);

  if (!points || points.length === 0) {
    return (
      <div
        className={`grid place-items-center rounded bg-panel-900 text-[10px] text-slate-600 ${className}`}
        style={{ height: HEIGHT }}
      >
        No waypoints
      </div>
    );
  }

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const start = points[0];
  const end = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Route preview with ${points.length} waypoint${points.length === 1 ? '' : 's'}`}
      className={`w-full rounded bg-panel-900 ${className}`}
      style={{ height: HEIGHT }}
    >
      {points.length > 1 && (
        <polyline
          points={polyline}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {points.map((p, index) => (
        <circle
          key={`${p.x}-${p.y}-${index}`}
          cx={p.x}
          cy={p.y}
          r={index === 0 ? 4 : 2.5}
          fill={index === 0 ? '#10b981' : '#38bdf8'}
        />
      ))}

      {points.length > 1 && <circle cx={end.x} cy={end.y} r="3.5" fill="none" stroke="#38bdf8" strokeWidth="1.5" />}
      <circle cx={start.x} cy={start.y} r="6" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}
