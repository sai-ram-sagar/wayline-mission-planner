import { useRef, useState } from 'react';
import { TbGripVertical, TbTrash } from 'react-icons/tb';
import { ACTION_BY_TYPE } from '../constants';
import { formatCoord } from '../lib/geo';

/**
 * Ordered waypoint list.
 *
 * Reordering uses pointer events rather than HTML5 drag-and-drop: pointer
 * events work identically for mouse, pen and touch, and — unlike the native
 * drag API — they are driveable in tests. The grip also accepts Arrow Up/Down
 * from the keyboard so reordering does not require a pointer at all.
 */
export default function WaypointList({
  waypoints,
  selectedKey,
  globalSpeed,
  onSelect,
  onRemove,
  onReorder,
}) {
  const listRef = useRef(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  if (waypoints.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-xs leading-relaxed text-slate-500">
        No waypoints yet.
        <br />
        Click the map to add the first one.
      </p>
    );
  }

  /** Index of the row whose upper half contains `clientY`. */
  const indexFromPoint = (clientY) => {
    const rows = listRef.current?.querySelectorAll('[data-wp-row]');
    if (!rows?.length) return null;
    for (let i = 0; i < rows.length; i += 1) {
      const rect = rows[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return rows.length - 1;
  };

  const endDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const startDrag = (index) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragIndex(index);
    setOverIndex(index);
  };

  const duringDrag = (event) => {
    if (dragIndex === null) return;
    const next = indexFromPoint(event.clientY);
    if (next !== null) setOverIndex(next);
  };

  const finishDrag = (event) => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      onReorder(dragIndex, overIndex);
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    endDrag();
  };

  const handleGripKey = (index) => (event) => {
    if (event.key === 'ArrowUp' && index > 0) {
      event.preventDefault();
      onReorder(index, index - 1);
    } else if (event.key === 'ArrowDown' && index < waypoints.length - 1) {
      event.preventDefault();
      onReorder(index, index + 1);
    }
  };

  return (
    <ul ref={listRef} className="divide-y divide-panel-700 select-none">
      {waypoints.map((waypoint, index) => {
        const isSelected = waypoint.key === selectedKey;
        const isDragging = dragIndex === index;
        const isDropTarget = dragIndex !== null && overIndex === index && dragIndex !== index;

        return (
          <li
            key={waypoint.key}
            data-wp-row
            onClick={() => onSelect(waypoint.key)}
            className={[
              'group cursor-pointer px-2 py-2 transition-colors',
              isSelected ? 'bg-accent-600/20' : 'hover:bg-panel-700',
              isDragging ? 'opacity-40' : '',
              isDropTarget ? 'ring-1 ring-inset ring-accent-400' : '',
            ].join(' ')}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Reorder waypoint ${index + 1}. Use arrow up and arrow down.`}
                title="Drag to reorder, or focus and use the arrow keys"
                onPointerDown={startDrag(index)}
                onPointerMove={duringDrag}
                onPointerUp={finishDrag}
                onPointerCancel={endDrag}
                onKeyDown={handleGripKey(index)}
                onClick={(event) => event.stopPropagation()}
                className="shrink-0 cursor-grab touch-none rounded p-0.5 text-slate-600
                           hover:text-slate-300 group-hover:text-slate-400 active:cursor-grabbing"
              >
                <TbGripVertical className="h-4 w-4" />
              </button>

              <span
                className={[
                  'grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                  index === 0 ? 'bg-emerald-600 text-white' : 'bg-accent-600 text-white',
                ].join(' ')}
              >
                {index === 0 ? 'S' : index + 1}
              </span>

              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate font-mono text-[11px] text-slate-300">
                  {formatCoord(waypoint.lat)}, {formatCoord(waypoint.lng)}
                </div>
                <div className="text-[11px] text-slate-500">
                  {waypoint.altitude} m &middot;{' '}
                  {waypoint.speed == null ? `${globalSpeed} m/s (global)` : `${waypoint.speed} m/s`}
                </div>
              </div>

              <button
                type="button"
                title="Delete waypoint"
                aria-label={`Delete waypoint ${index + 1}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(waypoint.key);
                }}
                className="shrink-0 rounded p-1 text-slate-600 hover:bg-red-950/60 hover:text-red-400"
              >
                <TbTrash className="h-4 w-4" />
              </button>
            </div>

            {waypoint.actions.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1 pl-11">
                {waypoint.actions.map((action) => (
                  <span
                    key={action.key}
                    className="rounded bg-panel-600 px-1.5 py-0.5 text-[10px] text-slate-300"
                  >
                    {ACTION_BY_TYPE[action.action_type]?.label ?? action.action_type}
                  </span>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
