import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TbCopy, TbMapPin, TbPencil, TbSearch, TbTrash } from 'react-icons/tb';
import RouteThumbnail from '../components/RouteThumbnail';
import { ConfirmDialog } from '../components/Modal';
import { EmptyState, ErrorState, SkeletonCard, Spinner } from '../components/status';
import { describeError, waylinesApi } from '../api';

const SORTS = [
  { value: 'new-old', label: 'Newest first' },
  { value: 'old-new', label: 'Oldest first' },
  { value: 'name', label: 'Name (A–Z)' },
];

const formatUpdated = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function WaylineCard({ wayline, busy, onOpen, onDuplicate, onDelete }) {
  return (
    <article className="panel flex flex-col overflow-hidden transition-colors hover:border-panel-500">
      <button
        type="button"
        onClick={() => onOpen(wayline.id)}
        className="block p-3 pb-0 text-left"
        title="Open in the editor"
      >
        <RouteThumbnail path={wayline.path} />
      </button>

      <div className="flex min-h-0 flex-1 flex-col p-3">
        <h3 className="truncate text-sm font-semibold text-slate-100" title={wayline.name}>
          {wayline.name}
        </h3>

        {wayline.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-400">
            {wayline.description}
          </p>
        ) : (
          <p className="mt-1 text-xs italic text-slate-600">No description</p>
        )}

        <dl className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <TbMapPin className="h-3.5 w-3.5 text-slate-500" />
            <dt className="sr-only">Waypoints</dt>
            <dd>
              {wayline.waypoint_count} waypoint{wayline.waypoint_count === 1 ? '' : 's'}
            </dd>
          </div>
          <div>
            <dt className="sr-only">Aircraft</dt>
            <dd className="rounded bg-panel-700 px-1.5 py-0.5 text-slate-300">
              {wayline.aircraft_model}
            </dd>
          </div>
        </dl>

        <p className="mt-2 text-[11px] text-slate-500">
          Updated {formatUpdated(wayline.updated_at)}
        </p>

        <div className="mt-3 flex items-center gap-2 border-t border-panel-700 pt-3">
          <button type="button" className="btn-ghost flex-1" onClick={() => onOpen(wayline.id)}>
            <TbPencil className="h-4 w-4" />
            Open
          </button>
          <button
            type="button"
            className="btn-ghost px-2"
            title="Duplicate"
            aria-label={`Duplicate ${wayline.name}`}
            disabled={busy}
            onClick={() => onDuplicate(wayline)}
          >
            {busy ? <Spinner className="h-4 w-4" /> : <TbCopy className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="btn-danger px-2"
            title="Delete"
            aria-label={`Delete ${wayline.name}`}
            onClick={() => onDelete(wayline)}
          >
            <TbTrash className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Library() {
  const navigate = useNavigate();

  const [waylines, setWaylines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('new-old');
  const [model, setModel] = useState('all');
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return waylinesApi
      .list()
      .then(setWaylines)
      .catch((err) => setError(describeError(err, 'Could not load the wayline library.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(timer);
  }, [flash]);

  // Model options come from the data, so the filter only ever offers models
  // that are actually present.
  const models = useMemo(
    () => [...new Set(waylines.map((w) => w.aircraft_model))].sort(),
    [waylines],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = waylines.filter((wayline) => {
      if (model !== 'all' && wayline.aircraft_model !== model) return false;
      if (!term) return true;
      return (
        wayline.name.toLowerCase().includes(term) ||
        (wayline.description ?? '').toLowerCase().includes(term)
      );
    });

    const sorted = [...filtered];
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'old-new') sorted.sort((a, b) => a.updated_at.localeCompare(b.updated_at));
    else sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return sorted;
  }, [waylines, search, sort, model]);

  const handleOpen = (id) => navigate(`/editor?id=${id}`);

  // Duplicating is a client-side fetch-then-create: the API has no duplicate
  // endpoint, and the full nested payload is exactly what POST expects.
  const handleDuplicate = async (wayline) => {
    setDuplicatingId(wayline.id);
    setError(null);
    try {
      const full = await waylinesApi.get(wayline.id);
      const copy = await waylinesApi.create({
        name: `${full.name} (copy)`.slice(0, 120),
        description: full.description,
        aircraft_model: full.aircraft_model,
        settings: full.settings,
        waypoints: full.waypoints.map((waypoint) => ({
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
      });
      await load();
      setFlash(`Duplicated as "${copy.name}".`);
    } catch (err) {
      setError(describeError(err, 'Could not duplicate that wayline.'));
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await waylinesApi.remove(pendingDelete.id);
      setWaylines((current) => current.filter((w) => w.id !== pendingDelete.id));
      setFlash(`Deleted "${pendingDelete.name}".`);
      setPendingDelete(null);
    } catch (err) {
      setError(describeError(err, 'Could not delete that wayline.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-panel-600 bg-panel-800 px-4 py-3">
        <h1 className="text-sm font-semibold text-slate-100">
          Wayline library
          {!loading && (
            <span className="ml-2 font-normal text-slate-500">
              {visible.length}
              {visible.length !== waylines.length ? ` of ${waylines.length}` : ''}
            </span>
          )}
        </h1>

        <div className="relative ml-auto">
          <TbSearch className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            className="input w-56 pl-8"
            placeholder="Search name or description"
            aria-label="Search waylines"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          className="input w-44"
          aria-label="Filter by aircraft model"
          value={model}
          onChange={(event) => setModel(event.target.value)}
        >
          <option value="all">All models</option>
          {models.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          className="input w-40"
          aria-label="Sort waylines"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {flash && (
        <div className="border-b border-emerald-900/60 bg-emerald-950/40 px-4 py-1.5 text-xs text-emerald-300">
          {flash}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {Array.from({ length: 6 }, (_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : waylines.length === 0 ? (
          <EmptyState
            title="No waylines saved yet"
            action={
              <button type="button" className="btn-primary mt-2" onClick={() => navigate('/editor')}>
                Open the editor
              </button>
            }
          >
            Plan a mission on the map and save it — it will appear here.
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState title="Nothing matches those filters">
            Try a different search term, model or sort order.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {visible.map((wayline) => (
              <WaylineCard
                key={wayline.id}
                wayline={wayline}
                busy={duplicatingId === wayline.id}
                onOpen={handleOpen}
                onDuplicate={handleDuplicate}
                onDelete={setPendingDelete}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete wayline"
        message={
          pendingDelete
            ? `Delete "${pendingDelete.name}" permanently? Any drone assignments for it are removed too. This cannot be undone.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
