import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { TbDrone, TbMap2, TbRoute } from 'react-icons/tb';
import Editor from './pages/Editor';
import Library from './pages/Library';
import Drones from './pages/Drones';
import ErrorBoundary from './components/ErrorBoundary';
import { useMissionStore } from './store';

const NAV = [
  { to: '/editor', label: 'Editor', Icon: TbMap2 },
  { to: '/library', label: 'Library', Icon: TbRoute },
  { to: '/drones', label: 'Drones', Icon: TbDrone },
];

function TopBar() {
  const dirty = useMissionStore((s) => s.dirty);
  const name = useMissionStore((s) => s.name);

  return (
    <header className="flex h-12 shrink-0 items-center gap-6 border-b border-panel-600 bg-panel-800 px-4">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded bg-accent-600 text-xs font-bold text-white">
          W
        </span>
        <span className="text-sm font-semibold tracking-tight text-slate-100">
          Wayline Mission Planner
        </span>
      </div>

      <nav className="flex items-center gap-1">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-panel-600 text-slate-100'
                  : 'text-slate-400 hover:bg-panel-700 hover:text-slate-200',
              ].join(' ')
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {dirty && (
        <span className="ml-auto flex items-center gap-1.5 text-xs text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Unsaved changes{name ? ` in "${name}"` : ''}
        </span>
      )}
    </header>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <main className="min-h-0 flex-1">
        {/* Keyed by pathname so navigating away from a crashed page clears the
            boundary instead of stranding the user on the error screen. */}
        <ErrorBoundary key={location.pathname}>
          <Routes>
            <Route path="/" element={<Navigate to="/editor" replace />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/library" element={<Library />} />
            <Route path="/drones" element={<Drones />} />
            <Route
              path="*"
              element={
                <div className="grid h-full place-items-center px-6 text-center text-sm text-slate-400">
                  That page does not exist. Use the links above to reach the editor, library or
                  fleet.
                </div>
              }
            />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}
