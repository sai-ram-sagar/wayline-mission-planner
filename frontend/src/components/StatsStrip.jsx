import { TbCamera, TbClock, TbMapPin, TbRulerMeasure } from 'react-icons/tb';

function Stat({ Icon, value, label }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2" title={label}>
      <Icon className="h-3.5 w-3.5 text-slate-500" />
      <span className="whitespace-nowrap font-mono text-[13px] leading-none text-slate-100">
        {value}
      </span>
      <span className="text-[10px] uppercase leading-none tracking-wide text-slate-500">
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
