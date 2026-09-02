# Wayline Mission Planner

A drone flight-mission planner: draw a waypoint route on a map, tune each waypoint and the actions
it triggers, save it to a library, and assign it to drones in a mock fleet.

Built entirely with free and open-source tooling — no API keys, no paid tiers, no accounts.

---

## What it does

**Editor** (`/editor`)

- Click the map to append waypoints; drag any marker to reposition it.
- Reorder waypoints by dragging the grip in the list (or focus it and use Arrow Up / Down).
- Per-waypoint settings: latitude, longitude, altitude, speed override, waypoint (turn) type,
  aircraft yaw mode and heading.
- Per-waypoint actions with their own parameters: take photo, start/stop recording, hover, gimbal
  tilt, gimbal yaw, aircraft yaw, camera zoom, timed and distance interval shots, end interval shot.
- Global mission settings: aircraft model, reference takeoff point, takeoff mode and safe-takeoff
  altitude, takeoff speed, altitude mode (ASL / ALT / AGL), global altitude and speed, default
  waypoint type, aircraft yaw, gimbal control, completion action and return-to-home altitude.
- Live totals: distance, estimated duration, waypoint count, photo count.
- Reverse route, undo (50 steps), fit-to-route, clear, and save or update.

**Library** (`/library`)

- Card grid with an SVG route thumbnail, description, waypoint count, aircraft and last-updated time.
- Search by name or description, filter by aircraft model, sort by newest / oldest / name.
- Open in the editor, duplicate, delete.

**Drones** (`/drones`)

- Mock fleet with per-drone status (idle / flying / offline).
- Assign a saved wayline to one or more drones at once.
- Assignment table split into Incomplete and Completed, advancing each assignment through
  pending → synced → in progress → complete, with a separate "mark failed".

Two rules from the reference product are enforced on both the client and the API:

- A **hover** action cannot sit on a waypoint whose turn type never stops the aircraft
  (*Curved route. Aircraft continues*).
- An aircraft whose gimbal has no independent yaw axis does not offer the **gimbal yaw** action.

---

## Requirements

- **Node.js 20 or newer** (developed on 22.12). `better-sqlite3` ships prebuilt binaries for
  current Node versions; if your platform has none, you will need a C++ toolchain for it to build.
- No database server, no API keys.

---

## Running it

Two processes: the API on **4000** and the web app on **5173**.

### 1. Backend

```bash
cd backend && npm install && npm run dev
```

The SQLite file is created at `backend/data/wayline.sqlite` on first run, the schema is applied,
and a four-drone mock fleet is seeded. `npm start` runs it without nodemon.

### 2. Frontend

```bash
cd frontend && npm install && npm run dev
```

Then open **http://localhost:5173**. The Vite dev server proxies `/api` to `http://localhost:4000`,
so the browser stays on one origin and no CORS round trip is needed in development.

To build for production:

```bash
cd frontend && npm run build
```

---

## Configuration

Both packages ship a `.env.example`. Every value has a working default, so **the app runs with no
`.env` file at all** — copy the example only when you want to change something.

`backend/.env`

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `DB_PATH` | `data/wayline.sqlite` | SQLite file, relative to `backend/` |
| `CORS_ORIGIN` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed origins |
| `SEED_DRONES` | `true` | Set to `false` to skip seeding the mock fleet |

`frontend/.env`

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Where the browser sends API calls; set an absolute URL in production |
| `VITE_API_PROXY_TARGET` | `http://localhost:4000` | What the dev proxy forwards `/api` to |
| `VITE_DEFAULT_MAP_LAT` / `_LNG` / `_ZOOM` | `-37.8050` / `145.2780` / `16` | Initial map view for a new mission |

`.env` files are gitignored; the `.env.example` files are committed.

---

## Map tiles and attribution

The map uses **OpenStreetMap** raster tiles directly from `tile.openstreetmap.org`, which need no
API key. The required attribution is rendered on the map.

This is fine for light development use, but OpenStreetMap's
[tile usage policy](https://operations.osmfoundation.org/policies/tiles/) explicitly excludes heavy
or commercial traffic. For anything beyond that, point the `TileLayer` in
`frontend/src/components/MapCanvas.jsx` at your own tile server or a provider's free tier —
[MapTiler](https://www.maptiler.com/) and [Stadia Maps](https://stadiamaps.com/) both offer one —
and update the attribution string to match.

---

## API

Base URL `http://localhost:4000/api`. All request bodies are validated with Zod; failures return
`400` with a `details` array naming the offending fields.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `GET` | `/waylines` | Summary list, including `waypoint_count` and a `path` for thumbnails |
| `GET` | `/waylines/:id` | Full wayline with nested waypoints and actions |
| `POST` | `/waylines` | Create from a nested payload |
| `PUT` | `/waylines/:id` | Full replace, including the waypoint tree |
| `DELETE` | `/waylines/:id` | Cascades to waypoints, actions and assignments |
| `GET` | `/drones` | The fleet |
| `POST` | `/drones` | Add another mock drone |
| `GET` | `/assignments` | Joined with wayline and drone names |
| `POST` | `/assignments` | Body `{ wayline_id, drone_ids[] }` — one row per drone |
| `PATCH` | `/assignments/:id` | Body `{ status }` |
| `DELETE` | `/assignments/:id` | Remove a single assignment |

Waypoints and actions are written inside a transaction, so a failed update cannot leave a
half-written route.

---

## Project layout

```
backend/
  server.js            Express app, middleware, error handler
  config.js            Environment with defaults
  db.js                Schema creation and mock-fleet seeding
  lib/schemas.js       Zod vocabulary and request schemas
  lib/http.js          HttpError, asyncHandler, validateBody
  routes/              waylines.js, drones.js, assignments.js

frontend/
  src/
    pages/             Editor.jsx, Library.jsx, Drones.jsx
    components/        Map, panels, dialogs and shared controls
    lib/geo.js         Turf distance/duration maths and formatters
    store.js           Zustand mission store with undo history
    api.js             Axios client and error formatting
    constants.js       Shared vocabularies, mirroring the backend enums

docs/
  feature-reference.md The spec this was built against
  progress-log.md      Phase-by-phase build log and decisions
```

---

## Tech stack

**Frontend** — React 18, Vite, React Router, Leaflet + react-leaflet, Turf, Zustand,
React Hook Form + Zod, Tailwind CSS, Axios, react-icons.

**Backend** — Node.js, Express, better-sqlite3, Zod, uuid, cors, helmet, dotenv, nodemon.

**Database** — SQLite, single file, zero configuration.

---

## Scope

`docs/feature-reference.md` is the specification this was built against, compiled from hands-on
exploration of a reference wayline editor. Section 12 of that document maps each borrowed concept
onto what is implemented here, and section 12.2 lists what is deliberately out of scope for v1 —
principally the mapping route types (area, linear, slope, geometric, 3D capture), object-detection
patrols, terrain-follow data, and live telemetry.

This project reproduces workflow and UX patterns only. It contains no third-party branding, assets
or code.
