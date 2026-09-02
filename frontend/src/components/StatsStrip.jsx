import { TbCamera, TbClock, TbMapPin, TbRulerMeasure } from 'react-icons/tb';

function Stat({ Icon, value, label }) {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2"
      title={`${label}: ${value}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      {/* Truncate rather than wrap or overflow: a very long route can push the
          distance and duration past their column, and the full value is still
          available from the tooltip. */}
      <span className="w-full truncate text-center font-mono text-[13px] leading-none text-slate-100">
        {value}
      </span>
      <span className="w-full truncate text-center text-[10px] uppercase leading-none tracking-wide text-slate-500">
        {label}
      </span>
    </div>
  );
}

/** Live mission totals, mirroring the reference editor's summary strip. */
export default function StatsStrip({ distance, duration, waypointCount, photoCount }) {
  return (
    <div className="flex divide-x divide-panel-600 border-b border-panel-600 bg-panel-800">
      <Stat Icon={TbRulerMeasure} value={distance} label="Distance" />
      <Stat Icon={TbClock} value={duration} label="Duration" />
      <Stat Icon={TbMapPin} value={waypointCount} label="Waypoints" />
      <Stat Icon={TbCamera} value={photoCount} label="Photos" />
    </div>
  );
}
