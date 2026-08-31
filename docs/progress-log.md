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

## Phase plan

| Phase | Contents | Status |
|---|---|---|
| 0 | Reference exploration, `feature-reference.md`, progress log | **Complete** |
| 1 | Backend scaffold, DB schema, seeds, REST API, Zod validation | Not started |
| 2 | Frontend scaffold, routing, Leaflet map, click-to-add waypoints, store | Not started |
| 3 | Waypoint editing, actions, global settings, live stats | Not started |
| 4 | Wayline library: list, search, sort, load, duplicate, delete, thumbnails | Not started |
| 5 | Drone fleet and assignments | Not started |
| 6 | Polish, error handling, loading states, README | Not started |
