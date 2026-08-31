# Progress Log — Wayline Mission Planner

Running project memory. **Read this before starting any phase.** Append after finishing each phase.

---

## Phase 0 — Reference exploration and spec (COMPLETE, 2026-09-01)

### What was built

- `docs/feature-reference.md` — the build spec, written from hands-on exploration of a live
  DJI FlightHub 2 Wayline / Flight Route Editor.
- `docs/_explore-notes.md` — raw observation notes kept during exploration (kept for traceability).
- This log.

### How exploration was done

Driven through the Claude-in-Chrome extension against the user's own logged-in FlightHub 2 session
(`sairamn@krishnasoft.in`, org `KSPL-Dev-Team`, project `DEMO-A Warehouse`). Five routes were
created and saved, taking the library from 14 to 19 routes:

1. `WMP-Explore-01-Waypoint` — Waypoint, Matrice 30 T
2. `WMP-Explore-02-Waypoint-Mavic3T` — Waypoint, Mavic 3T
3. `WMP-Explore-03-Patrol-M4T` — Patrol, Matrice 4T
4. `WMP-Explore-04-Area-M3TD` — Area, Matrice 3TD
5. `WMP-Explore-05-Linear-Mavic3E` — Linear, Mavic 3E

These remain in the user's FlightHub account and can be deleted there at any time; they are not
needed by this repo.

### Key decisions

- **Scope: Waypoint Route only for v1.** The reference product also has Patrol, Area, Linear, Slope,
  Geometric and Smart 3D route types. All are documented, but only the Waypoint workflow is being
  built. Mapping-route generation (grid/corridor synthesis, GSD-driven altitude, overlap rates) is a
  substantially different product and is explicitly deferred. See feature-reference section 12.2.
- **2D map, not 3D.** The reference uses a 3D globe with a virtual-flight HUD. We use Leaflet with
  free OpenStreetMap tiles (no API key, no paid tier). Consequence: per-waypoint editing moves from
  a flight HUD into a conventional side panel, and altitude modes become plain numeric fields rather
  than terrain-aware ones.
- **AGL/ASL/ALT are stored as a mode plus a number.** Without a terrain/elevation service we cannot
  convert between them, so the mode is recorded and the number is interpreted against it. This is a
  documented simplification, not an oversight.
- **Actions are typed rows with a JSON `params` blob.** Matches the reference model, where each
  action has its own tiny parameter editor, and keeps the schema open for the action types we have
  not built editors for yet.
- **Model-dependent action availability is real** and worth honouring: the reference hides
  `Gimbal Yaw` on aircraft whose gimbal has no yaw axis, and disables `Hover` when the waypoint type
  never stops. We reproduce both rules.

### Deviations from the original brief

- The brief's fallback schema lists 7 action types; the reference exposes 12. We implement the
  superset listed in feature-reference section 12.1.
- The brief calls the third page "Drones"; the reference calls the equivalent "Task Plan Library".
  We keep the brief's naming (`/drones`) with assignment records, since no real docks exist.

### Notes for later

- Exploration could not read FlightHub's own API payloads (network capture started too late and the
  save button did not re-fire while instrumented), so the schema below is derived from the UI, not
  from their wire format. That is fine — we are not interoperating with them.
- The Hover / interval-shot parameter editors were not opened successfully (the action menu closes
  on the first click of a click-pair). Their controls follow the same slider-plus-stepper pattern as
  the other actions; units are inferred (seconds for Hover and timed interval, metres for distance
  interval). Flagged as inferred in the feature reference.

### Next

Phase 1 — backend scaffold: Express + better-sqlite3, schema, seed drones, REST routes with Zod
validation, transactional nested wayline writes.

---

## Phase 1 — Backend scaffold (COMPLETE, 2026-09-01)

### What was built

`backend/` — Express + better-sqlite3 API on port 4000.

- `config.js` — dotenv loader with working defaults, so the server runs with no `.env` at all.
  `.env.example` documents `PORT`, `DB_PATH`, `CORS_ORIGIN`, `SEED_DRONES`.
- `db.js` — creates the schema on first run (`CREATE TABLE IF NOT EXISTS`), enables WAL and
  foreign keys, seeds a 4-drone mock fleet (Alpha-01 / Bravo-02 / Charlie-03 / Delta-04) only when
  the table is empty.
- `lib/schemas.js` — the Zod vocabulary and all request schemas.
- `lib/http.js` — `HttpError`, `asyncHandler`, `validateBody` middleware.
- `routes/waylines.js`, `routes/drones.js`, `routes/assignments.js`.
- `server.js` — helmet, CORS allow-list, JSON body limit, `/api/health`, central error handler.

### Endpoints

`GET|POST /api/waylines` · `GET|PUT|DELETE /api/waylines/:id` ·
`GET|POST /api/drones` ·
`GET|POST /api/assignments` · `PATCH|DELETE /api/assignments/:id` · `GET /api/health`

### Key decisions

- **Enums are enforced twice** — as Zod enums and as SQLite `CHECK` constraints — so bad data cannot
  land even if a future route forgets to validate.
- **Action params are a discriminated union on `action_type`.** A `zoom` cannot carry a `duration`.
  Each branch is `.strict()`, so typos in params are rejected rather than silently stored.
- **The reference's conditional rule is enforced server-side**: a `hover` action on a waypoint whose
  `turn_mode` is `curvedContinue` is a 400, because the aircraft never stops there.
- **`takeoffSpeed` is capped at 15 m/s**, matching the disabled "+" stepper observed in the reference.
- **`waypoints.speed` is nullable** and null means "inherit the mission's global speed" — this is how
  the reference behaves, and it keeps the global-speed control meaningful after per-waypoint edits.
- **PUT is a full replace.** Waypoints and actions are deleted and reinserted inside a
  `better-sqlite3` transaction, so ordering is always `order_index = array index` and a failed write
  cannot leave a half-updated tree.
- **`GET /api/waylines` returns a `path` array** of `{lat,lng}` per wayline. This lets the Library
  draw an SVG route thumbnail per card without N+1 detail fetches.
- **Assignments join wayline and drone names** in the list query, so the status table needs one call.
- Deleting a wayline cascades to waypoints, actions and assignments.
- **No duplicate endpoint.** The brief's API list does not include one; the Library will duplicate
  client-side with `GET /:id` followed by `POST /`.

### Testing

A 39-assertion smoke script exercised every endpoint against the running server: nested create,
ordered action round-trip, defaults applied to sparse payloads, PUT replacing rather than appending
the tree, seven distinct validation rejections (empty name, out-of-range latitude, unknown action
type, mismatched action params, hover-on-curvedContinue, takeoff speed > 15, unknown top-level key),
assignment fan-out with duplicate collapsing, 404s for unknown wayline/drone, the full status
progression, and cascade deletion. **39 passed, 0 failed.** The dev database was then deleted so the
next run re-seeds cleanly.

### Deviations

None from the plan. The schema adds `aircraft_model` to `waylines` and `order_index` to
`waypoint_actions` beyond the brief's outline — the first because the reference makes the aircraft
model a first-class property of a route, the second because actions execute in order.

### Next

Phase 2 — frontend scaffold: Vite + React + Tailwind, react-router with `/editor`, `/library`,
`/drones`, the Zustand mission store, the Leaflet map with click-to-add and draggable waypoints.

---

## Phase 2 — Frontend scaffold and map editor (COMPLETE, 2026-09-01)

### What was built

`frontend/` — Vite + React 18 + Tailwind 3, dev server on 5173 with `/api` proxied to 4000.

- `constants.js` — the display vocabulary (altitude modes, takeoff modes, the five turn modes,
  heading modes, gimbal control, finish actions, the eleven action types with their single editable
  parameter, and the aircraft catalogue). Values mirror the backend enums exactly.
- `api.js` — axios client plus `describeError`, which flattens `{error, details[]}` responses into
  one readable sentence.
- `lib/geo.js` — Turf-based `totalDistance`, `estimatedDuration`, `photoCount`, formatters, and
  `pathToSvgPoints` for the Library thumbnails coming in Phase 4.
- `store.js` — the Zustand mission store: waypoints, settings, selection, dirty flag, and a bounded
  50-step undo history.
- `components/` — `MapCanvas`, `WaypointList`, `StatsStrip`, `Modal`/`ConfirmDialog`, `ComingSoon`.
- `pages/` — `Editor` (built), `Library` and `Drones` (placeholders until Phases 4 and 5).
- App shell with the three routes and an "unsaved changes" indicator.

### Key decisions

- **Waypoint markers are Leaflet `divIcon`s, not the default sprite.** The default marker's image
  paths break under bundlers, and a numbered badge (S, 2, 3 …) reads far better on a dense route.
  No icon-path shimming needed.
- **Reordering uses pointer events, not HTML5 drag-and-drop.** The first implementation used the
  native drag API; it silently did nothing under synthetic events, so it could not be verified, and
  it behaves poorly on touch. The pointer-event version works for mouse, pen and touch, is testable,
  and the grip additionally accepts Arrow Up/Down for keyboard-only reordering.
- **No `window.confirm`.** An in-app `ConfirmDialog` replaced it — consistent chrome, and native
  modals block automated verification. The same `Modal` will carry the save and delete flows.
- **Map fitting is token-driven.** `MapCanvas` refits only when `fitToken` changes, so the map never
  fights the user by recentring on every marker drag.
- **`null` speed renders as "10 m/s (global)"** so an inherited value is visibly distinct from an
  override.
- **New waypoints inherit the mission's global altitude, turn mode and yaw mode**, matching the
  reference's stated behaviour.
- **Changing the aircraft to a model without a yaw gimbal strips existing `gimbalYaw` actions** in
  the store, so the UI cannot hold state the backend would reject.
- A `ResizeObserver` calls `map.invalidateSize()` so the canvas stays correct when panels resize.

### Testing

Driven in a real browser: added four waypoints by clicking the map (polyline and numbered markers
drew correctly, stats read 1.54 km / 2 m 42 s / 4 / 0); dragged a marker and watched the coordinates
and totals recompute (1.51 km / 2 m 39 s); undo restored the exact prior position and totals; set a
reference takeoff point with the takeoff tool ("H" marker); reordered row 4 to position 1 by
dragging the grip and confirmed the route, the S marker and the totals all followed (1.65 km /
2 m 53 s); cleared all waypoints through the confirm dialog and undid it. `npm run build` succeeds
(415 modules, 354 kB JS / 109 kB gzipped).

### Deviations from the plan

- The **live stats strip** was pulled forward from Phase 3 into Phase 2. Without it the map had no
  feedback and the phase could not be meaningfully tested end to end. Turf was already in the stack.
- Reordering moved from HTML5 drag-and-drop to pointer events, as described above.
- `.claude/launch.json` exists locally for driving the dev servers and is gitignored as agent tooling.

### Known gaps (intentional, land next phase)

The editor cannot yet save; there is no global-settings panel and no per-waypoint inspector; the
mission store is in memory only, so a page reload discards the mission.

### Next

Phase 3 — the global settings panel, the per-waypoint inspector with actions, and save
(create/update) wired to the API.

---

## Phase plan

| Phase | Contents | Status |
|---|---|---|
| 0 | Reference exploration, `feature-reference.md`, progress log | **Complete** |
| 1 | Backend scaffold, DB schema, seeds, REST API, Zod validation | **Complete** |
| 2 | Frontend scaffold, routing, Leaflet map, click-to-add waypoints, store | **Complete** |
| 3 | Waypoint editing, actions, global settings, live stats | Not started |
| 4 | Wayline library: list, search, sort, load, duplicate, delete, thumbnails | Not started |
| 5 | Drone fleet and assignments | Not started |
| 6 | Polish, error handling, loading states, README | Not started |
