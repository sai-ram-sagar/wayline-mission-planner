# Wayline Mission Planner — Feature Reference

**Source of truth for this build.**

Compiled from hands-on exploration of a live DJI FlightHub 2 *Wayline / Flight Route Editor*
(org `KSPL-Dev-Team`, project `DEMO-A Warehouse`) on 2026-09-01. Five routes were created
end-to-end during exploration, covering four different route types, three altitude modes and
five different aircraft models:

| # | Route created | Type | Aircraft | Notable settings exercised |
|---|---|---|---|---|
| 1 | `WMP-Explore-01-Waypoint` | Waypoint | Matrice 30 T | ASL altitude, 4 waypoints, attitude actions, route reverse |
| 2 | `WMP-Explore-02-Waypoint-Mavic3T` | Waypoint | Mavic 3T | Safe Takeoff, ALT altitude, 12 m/s, curved-continuous, Manual yaw, per-waypoint gimbal, Land on completion, 6 waypoints, Take Photo action |
| 3 | `WMP-Explore-03-Patrol-M4T` | Patrol | Matrice 4T | Smart Capture Alerts, people threshold, polygon patrol area |
| 4 | `WMP-Explore-04-Area-M3TD` | Area (mapping) | Matrice 3TD | AGL altitude, GSD 5 cm/px, 70/80 overlap, ortho collection |
| 5 | `WMP-Explore-05-Linear-Mavic3E` | Linear (mapping) | Mavic 3E | Zigzag band, 50 m extensions, 1000 m cutting distance |

> **Scope note.** This document records *observed functionality and UX patterns*. No DJI branding,
> logos, iconography, copy or code is reproduced in the product being built. Feature names used in
> our implementation are generic equivalents (see section 12 mapping table).

---

## 1. Application shell and navigation

The reference product is a project-scoped workspace with a persistent left icon rail
(collapsible to labelled text via a hamburger) and a full-bleed 3D map canvas behind
floating panels.

**Modules in the rail** (grouped, with dividers):

- *Group 1 — situational:* Team, Map Annotations, Map Photos, Map Models, Design files, Airspace Safety
- *Group 2 — planning:* **Flight Route Library**, **Task Plan Library**, Automated Task
- *Group 3 — data:* Resource Library, Analyzer

**Relevant to this build:** Flight Route Library (our *Library*), the route editor
(our *Editor*), and Task Plan Library (our *Drones and Assignments*).

### 1.1 Map canvas conventions

- Satellite/3D basemap filling the viewport; panels float above it.
- Status bar (bottom): scale bar, **ASL** (above sea level), **HAE** (height above ellipsoid),
  coordinate system label (**WGS 84**), tile-load percentage.
- Right-edge tool rail: search, annotation tools (**point / line / polygon / circle**, each with a
  5-colour swatch picker), the waypoint tool, compass with numeric heading, **2D/3D toggle**,
  connectivity, info, airspace, locate-me, zoom +/-, basemap switcher.
- Map shortcut legend shown on first load:

  | Action | Mouse | Keyboard |
  |---|---|---|
  | Move map horizontally | LMB drag | arrow keys |
  | Rotate map | RMB drag, or Ctrl+LMB | Ctrl + arrows |
  | Zoom map | scroll wheel | `-` / `+` |
  | Look around | Alt + LMB | Alt + arrows |
  | View 3D model surface | Shift + LMB | Shift + arrows |

---

## 2. Flight Route Library

The library is a three-column panel: **filters → folders → route cards**, with the map showing a
preview of the selected route.

### 2.1 Header and filtering

| Control | Behaviour |
|---|---|
| Title | "Flight Route Library" |
| Header actions | Download, Delete, Merge (bulk, act on selection) |
| Model filter | Dropdown: *All Models* plus each aircraft series |
| Sort toggle | **New-Old** / **Old-New** (by updated-at) |
| Route-type filter | Row of 8 type icons (toggle filters) |
| Search | Magnifier, free-text search on route name |

### 2.2 Folder column

- Header "Folder" with an info tooltip and a **new folder** button.
- Tree of folders; **Default Folder** always present. Routes belong to exactly one folder.

### 2.3 Route list

- Header shows **`Route (N)`** — a live count — plus an import/move icon and a primary
  **`+ Create Route`** button.
- Each **route card** shows:
  - Route name (bold), with an inline **pencil** for rename and a **overflow menu**
  - Aircraft model line (e.g. "Matrice 30 T")
  - `Updated at YYYY-MM-DD HH:MM:SS`
  - A small **route-type glyph** in the corner
- **Invalid/unsupported routes render in orange with a warning badge** (observed on a Slope Route
  whose aircraft model no longer supports that route type).
- Selecting a card draws it on the map and shows an overlay header with **route name and owner email**.

### 2.4 Card overflow menu

`Rename` / `Move` (to folder) / `Copy` (duplicate) / `Download` / `Lock` / `Delete` / `Merge`

---

## 3. Create Route dialog

Opened by `+ Create Route`. Four sections, then a name field.

### 3.1 Route type

| Group | Types |
|---|---|
| Patrol and Inspection Routes | **Waypoint Route**, **Patrol Route** |
| Mapping Routes | **Area Route**, **Linear Route** |
| Detailed Mapping Routes | **Slope Route**, **Geometric Route**, **Smart 3D Capture** |

Waypoint Route is preselected.

### 3.2 Aircraft series to model

| Series | Models | Extras |
|---|---|---|
| Matrice 30 Series *(default)* | Matrice 30, Matrice 30 T | — |
| Mavic 3 Enterprise Series | Mavic 3E, Mavic 3T, Mavic 3TA | — |
| Matrice 3D series | Matrice 3D, Matrice 3TD | — |
| Matrice 4 Enterprise Series | Matrice 4E, Matrice 4T | Accessories: **AS1 Speaker**, **AL1 SpotLight** |
| Matrice 4D Series | Matrice 4D, Matrice 4TD | Accessories: **AS1 Speaker**, **AL1 SpotLight** |
| Matrice 400 | *(no model list)* | **Payload bays 1-3**, assigned from: H30 Series (H30, H30T); P1 (P1-24mm, P1-35mm, P1-50mm); LiDAR (L2, L3). Click arrow or drag payload to a bay. |

### 3.3 Compatibility rules (observed)

- **Route type gates aircraft.** Selecting **Patrol Route** disables Matrice 30 Series,
  Mavic 3 Enterprise Series and Matrice 3D series — only Matrice 4 Enterprise / 4D / 400 remain.
  Selecting **Linear Route** disables Matrice 30 Series.
- Disabled aircraft show the tooltip **"Not supported by current aircraft"**.
- **Area Route** allows every series.

### 3.4 Route name

- Auto-generated and **type-aware**: `New Waypoint Route(3)`, `New Patrol Route`,
  `New Area Route`, `New Linear Route(1)` — the numeric suffix disambiguates duplicates.
- Editable before creation. `Cancel` / `OK`.

Creating a route navigates straight into the editor at `#/editor/edit?id=<uuid>`.

---

## 4. Editor shell (all route types)

- **Top bar:** back arrow, save icon (tooltip "Saving"), centre = *route name* plus *aircraft model chip*,
  right = notifications, settings gear, keyboard-shortcuts icon.
- **Left, top:** a collapsible settings panel whose title is the route type
  ("Flight Route Settings" for waypoint routes, "Patrol Route", "Area Route", "Linear Route").
- **Left, below:** the **Waypoint List** panel (waypoint routes only).
- **Right:** the **action / parameter inspector** (context-sensitive).
- **Bottom centre:** the virtual-flight HUD.

### 4.1 Summary statistics strip

Every route type shows a live stats strip; the metrics vary by type:

| Route type | Metrics shown |
|---|---|
| Waypoint | total distance, estimated duration, waypoint count, photo count |
| Patrol | area (m2), distance (m), duration, detection-target icon |
| Area | area (m2), distance (m), duration, photo count |
| Linear | band length (m), area (m2), route length (m), duration, photo count |

Observed live values: waypoint route `994.1 m / 2 m 5 s / 4 / 0`;
patrol `4855.94 m2 / 78.6 m / 11 s`; area `2270.48 m2 / 76.3 m / 1 m 10 s / 9`;
linear `130 m / 12975.99 m2 / 456.5 m / 56 s / 15`.

### 4.2 Onboarding and guard dialogs

- First-run modal **"Two ways to add waypoints"**:
  1. *Click on the map to add waypoints* — select the waypoint tool on the right of the map, then
     left-click; **the altitude of new waypoints defaults to the route's global altitude**.
  2. *Create precise route with virtual flight* — fly a virtual aircraft with the keyboard and press
     **`Space`** to drop a waypoint; add actions from the right side. Press **`?`** for help.
- A gear popover: "Flight Route Editor Settings — set visibility and quick settings of elements in
  flight route editor".
- **Unsaved-changes guard** on leaving: *"Returning to previous page will exit Flight Route Editor.
  Any unsaved changes will be lost. Save changes?"* with `Cancel` / `Do not save` / `Save`.

---

## 5. Global route settings — Waypoint Route

Panel order, top to bottom:

### 5.1 Reference takeoff point

Button reading **"Reference takeoff point not set"**. Activating it shows the map banner
*"Click on map to set reference takeoff point"*; after picking, the row becomes
**"Reference takeoff point set / Reset Takeoff Point"**. This point is the datum for ALT altitudes
and for Safe Takeoff Altitude.

### 5.2 Camera settings *(model dependent)*

Multi-select lens chips — **WIDE / Zoom / IR** — plus a **Smart Low-Light** toggle (default off).
Observed on Matrice 30 T. **Mavic 3T shows no lens chips**, only Smart Low-Light.

### 5.3 Takeoff mode

Tabs **Direct Ascent** *(default)* / **Safe Takeoff**, with a **Safe Takeoff Altitude** stepper
(default **20 m**, steps `+100 / +10 / -10 / -100`).

> Tooltip: *Direct Ascent: aircraft ascends to start-point altitude and flies to the start point
> directly. Safe Takeoff: aircraft ascends to the safe takeoff altitude before flying to the start
> point. Safe Takeoff Altitude is relative to the takeoff point.*

### 5.4 Waypoint Altitude Mode

Segmented **ASL / ALT / AGL** plus a value stepper (`+100 / +10 / -10 / -100`, unit m).

| Mode | Meaning | Diagram label |
|---|---|---|
| **ASL** *(default for waypoint routes)* | Above mean sea level | "Altitude Above Sea Level" |
| **ALT** | Relative to the reference takeoff point (may be negative) | "Relative to Takeoff Point" |
| **AGL** *(default for mapping routes)* | Above ground level | "Above Ground Level" |

Switching mode **re-bases the number for the same physical height** (observed: 209 m ASL becomes
82.7 m ALT when the takeoff point sits at 292 m ASL).

### 5.5 Global Flight Speed

Stepper, default **10 m/s**.

### 5.6 Advanced Settings *(collapsed by default)*

| Setting | Default | Options / range |
|---|---|---|
| **Takeoff Speed** | 15 m/s | `+` disabled at 15, so 15 is a hard maximum |
| **Waypoint Type** (global turn behaviour) | *Straight route. Aircraft stops* | 5 options, see 5.7 |
| **Aircraft Yaw** | *Along Route* | Along Route / Manual / Lock Yaw Axis |
| **Gimbal Control** | *Manual* | Manual / For Each Waypoint |
| **Upon Completion** | *Return to Home* | Return to Home / Return to Start Point and Hover / Exit Task / Land |

### 5.7 Waypoint Type options

Each is presented with an explanatory diagram:

1. **Coordinated turn. Skips waypoint** — smooth turn, aircraft does not pass through the waypoint.
2. **Straight route. Aircraft stops** *(default)* — flies straight in, stops at the waypoint.
3. **Turns before waypoint. Flies through** — begins turning early, still passes through.
4. **Curved route. Aircraft stops** — curved approach, stops at the waypoint.
5. **Curved route. Aircraft continues** — curved, never stops.

### 5.8 Tooltip semantics

- **Aircraft Yaw** — *Along Route*: aircraft follows the route direction toward the next waypoint.
  *Manual*: heading is manually controlled while flying to the next waypoint.
  *Lock Yaw Axis*: aircraft keeps its yaw from the previous waypoint.
- **Gimbal Control** — *Manual*: gimbal tilt is manually controlled in transit and otherwise holds
  the previous waypoint's angle. *For Each Waypoint*: tilt interpolates evenly between waypoints.
- **Upon Completion** — *Return to Home*: fly to the takeoff point immediately after the task;
  the signal-lost action applies if still disconnected. *Return to Start Point and Hover*: fly to
  point S and hover. *Exit Task*: exit immediately and hover in place. *Land*: land at the current
  location.

---

## 6. Waypoint List panel

- Header **"Waypoint List"** with an info tooltip and a **Reverse Flight Route** button
  (toast: *"Flight route reversed"*).
- The summary strip (see 4.1).
- One row per waypoint: index plus coloured marker glyph, followed by a **chip per attached action**.
- Selecting a row selects the waypoint and shows a small on-map toolbar:
  **index / edit (pencil) / delete (trash)**.
- **Edit** enters a repositioning mode: an orange banner **"Editing waypoint"** with
  **confirm `[Space]`** / **cancel `[Esc]`**, and the list row reads *"Changing waypoint location"*.

### 6.1 Per-waypoint properties

Editable while a waypoint is selected, via the HUD at the bottom of the map:

- **Longitude** and **Latitude** (numeric text inputs, 6 decimal places)
- **Speed** (`SPD m/s`) — overrides the global flight speed
- **Altitude** — shown simultaneously as **ALT** (relative) and **ASL**
- **Aircraft heading** — compass dial with numeric degrees
- **Gimbal pitch / yaw** — numeric degree readouts

Waypoints also inherit, and may override, the global **Waypoint Type**, **Aircraft Yaw** and
**Gimbal Control** behaviours.

---

## 7. Waypoint actions

Actions attach to a waypoint and execute in order when the aircraft reaches it.

### 7.1 Quick bar

Always visible on the map, headed **"Based on aircraft location"**:

| Item | Shortcut | Notes |
|---|---|---|
| **Add waypoint** | `Space` | drops a waypoint at the virtual aircraft |
| **Take Photo (Fixed Angle)** | `F` | verified working — adds a photo action |
| **Pano** | — | panorama capture |
| **Record Current Attitude** | — | snapshots current aircraft yaw, gimbal yaw/tilt and zoom as actions |
| **More** | — | opens the full action list |

### 7.2 Full action list

Matrice 30 T exposes **12** actions:

1. Start Recording
2. Stop Recording
3. Start Timed Interval Shot
4. Start Distance Interval Shot
5. End Interval Shot
6. Hover
7. Aircraft Yaw
8. Gimbal Yaw
9. Gimbal Tilt
10. Take Photo
11. Camera Zoom
12. Create Folder

**Mavic 3T exposes 11 — `Gimbal Yaw` is absent** (its gimbal has no independent yaw axis),
so the available action set is a function of the selected payload/model.

### 7.3 Conditional availability

- **Hover is disabled** while Waypoint Type is *"Curved route. Aircraft continues"* — the aircraft
  never stops, so hovering is impossible. It re-enables for stopping waypoint types.

### 7.4 Action parameter inspector (right panel)

Common chrome: action icon and name, a **`waypointIndex-actionIndex`** navigator with previous/next
arrows, and a **delete (trash)** button. Observed editors:

| Action | Control | Default |
|---|---|---|
| **Aircraft Yaw** | slider plus -/+ steppers, degrees | 0 deg |
| **Gimbal Yaw** | slider plus -/+ steppers, degrees | 0 deg |
| **Gimbal Tilt** | slider plus -/+ steppers, degrees | 0 deg |
| **Camera Zoom** | "Zoom Ratio" slider plus -/+, `X` | 2x (M30T) / 1x (Mavic 3T) |
| **Take Photo (Fixed Angle)** | editable **filename template** (default `DJI_YYYYMMDDhhmmss_XXXX_`) plus a **Snapshot Preview** thumbnail with an active-lens chip ("Visible 1X") and a capture timestamp | — |
| **Hover** | duration | — |
| **Start Timed Interval Shot** | time interval | — |
| **Start Distance Interval Shot** | distance interval | — |

The photo-count statistic increments as photo actions are added.

---

## 8. Patrol Route (reference only)

Drawn as a **polygon** on the map (banner *"Click on map to draw a patrol area"*). While drawing,
each edge shows a live length label and each midpoint offers a handle to insert a vertex;
`Esc` exits *"mapping area editing"* and the app shows *"Generating flight route"* before
producing a route with a start point **S**.

Settings panel:

- **Smart Capture Alerts** master toggle (on)
- **Smart Detection Type** — dropdown, default *Visible Light*
- **Warning Threshold** — per-class chips **People / Vehicles / Boats**, each with a comparator
  (`>=`) and a count (default 1); only People enabled by default
- **Confidence Level** — slider 0-100 %, default **55 %**, poles labelled *Complete* and *Accurate*
- **Alert Interval** — default **2 s**, steppers `-10 -5 -1 / +1 +5 +10`
- **Camera for Recognition** — *Wide Angle* / *3x Visible* / *7x Visible*
- **Photo Storage Settings** — checkboxes *Visible* (on) / *IR*
- **Full Route Recording** — toggle (off)
- **Terrain Follow File Management** — *Global Elevation Data*, with the warning
  *"Global elevation data is for reference only. Fly with caution"*
- Direct Ascent / Safe Takeoff (20 m), Global Flight Speed 10 m/s
- **Course Angle** slider, default 0 deg
- **Gimbal Tilt Angle** slider, default **-45 deg**
- **Upon Completion** dropdown, **Advanced Settings**

---

## 9. Area Route (mapping, reference only)

Drawn as a polygon; the app generates a boustrophedon (lawnmower) grid inside it.

- **Select Lens** — *Visible* / *IR*
- **Photo Collection** — *Ortho Collection* / *Oblique Collection*
- **GSD** — ground sample distance, default **5 cm/pixel**, steppers `-1 -0.1 / +0.1 +1`
- **Waypoint Altitude Mode** — defaults to **AGL** for mapping (observed 142.2 m)
- **Terrain Follow File Management** — Global Elevation Data plus caution note
- **Safe Takeoff Altitude** 20 m, **Global Flight Speed** 15 m/s
- **Course Angle** slider 0 deg, **Elevation Optimization** toggle (**on**)
- **Upon Completion** dropdown

**Advanced Settings:** Takeoff Speed 15 m/s, **Side Overlap Rate 70 %**, **Forward Overlap Rate 80 %**,
**Margin 0 m**, **Photo Mode** (*Timed Interval Shot*), **Custom Camera Angle** toggle,
**Route Start Point** ("Set route start point"), **Custom GEO Zone Obstacle Bypassing** toggle,
**Bypass Obstacle** toggle.

---

## 10. Linear Route (mapping, reference only)

Drawn as a **polyline** ("flight band") which is buffered into a corridor.

- **Select Lens** — *Visible* (only option on Mavic 3E)
- **Zigzag Route** / **Single Route** tabs
- **Left Extension Length** and **Right Extension Length** — default **50 m** each, linked by a
  lock toggle so they can move together
- **Cutting Distance** — default **1000 m**
- **Merge Mapping Area** link, **Flip Mapping Area** button
- **GSD** 5 cm/pixel, Waypoint Altitude Mode, then the same tail as Area Route

---

## 11. Task Plan Library (our drone assignment model)

This is where a saved route is bound to an aircraft and executed. It is the direct analogue of our
*assignments* feature.

### 11.1 List view

- Primary action **`Create Plan`**
- Filters: **Start Date - End Date**, *All Sources*, *All Tasks*, *All Statuses*,
  *All Storage Locations*, free-text *"Search flight route or plan name"*, refresh
- Tabs: **Incomplete** / **Completed**
- Table columns: **Planned/Actual Time, Status, Type, Plan Name, Route Name, Device Name,
  Creator, Media File Upload, Actions**
- Empty state: "No Data"
- Left sub-panel: **Devices** (with select-all N/N) and **History**

### 11.2 Create Plan form

| Field | Type | Default |
|---|---|---|
| **Plan Name** | text | `Untitled Plan` |
| **Task Type** | segmented | **Single-Dock** / Multi-Dock / Manual Flight Task |
| **Flight Route** | `+ Select Route`, opens an embedded Flight Route Library picker | — |
| **Select Device** | `+ Select Device`, opens a device picker | — |
| **Multimodal Detection** | toggle | off |
| **Positioning Accuracy** | segmented | **RTK** / GNSS |
| **Plan Timer** | segmented | **Immediate** / Timed / Recurring / Continuous |
| **Resume Flight from Breakpoint** | toggle | off |
| **Optimal RTH Route Planning** | toggle | off |
| **Min RTH Altitude (relative to dock)** | stepper `-100 -10 -1 / +1 +10 +100` m | — |
| **Signal Lost During Flight** | segmented | **Return to Home** / Continue Task |
| **Upon Completion** | dropdown, **disabled** (inherited from the route) | Return to Home |
| **Media File Storage Location** | folder picker | All Files |

`Cancel` / `OK`.

> The route picker only lists routes compatible with the chosen task type and device — the observed
> count dropped from 19 to 11 when opened from within Create Plan.

---

## 12. What we build, and how it maps

Our application is a self-contained, free/open-source planner. It implements the **Waypoint Route**
workflow in full (the core of this spec) and borrows the library and assignment models. Mapping
route types (Area/Linear/Slope/Geometric/Smart 3D) and the detection features of Patrol Route are
**out of scope for v1** — they are documented above for completeness and future work.

| Reference concept | Our implementation |
|---|---|
| Flight Route / Wayline | `wayline` |
| Flight Route Library | **Library** page |
| Wayline Editor plus virtual flight | **Editor** page (2D Leaflet map, click-to-add, drag-to-move) |
| Waypoint List panel | Waypoint list with reorder and per-row action chips |
| Waypoint actions | `waypoint_actions` with a typed `action_type` and JSON `params` |
| Task Plan Library / Create Plan | **Drones** page: fleet list plus assignments |
| Device / aircraft | `drones` (mock fleet) |
| Plan status | `assignments.status`: pending, synced, in_progress, complete, failed |

### 12.1 Features carried across (v1 scope)

**Editor**

- Click map to append a waypoint; drag a marker to reposition; drag list rows to reorder
- Per-waypoint panel: latitude, longitude, altitude, speed, heading mode plus value, turn/curve mode
- Global settings: reference takeoff point, takeoff mode plus safe-takeoff altitude, waypoint
  altitude mode (ASL/ALT/AGL), global altitude, global flight speed, takeoff speed (max 15),
  waypoint type (5 options), aircraft yaw (3 options), gimbal control (2 options), upon completion
  (4 options), RTH altitude
- Waypoint actions with parameter editors: `takePhoto`, `startRecord`, `stopRecord`, `hover`,
  `gimbalPitch`, `gimbalYaw`, `aircraftYaw`, `zoom`, `timedIntervalShot`, `distanceIntervalShot`,
  `endIntervalShot`
- Live stats strip: total distance, estimated duration, waypoint count, photo count
- Reverse route, delete waypoint, undo last, clear mission
- Unsaved-changes guard on navigation
- Save (name plus description)

**Library**

- Card grid: name, description, waypoint count, aircraft model, updated-at, route-type glyph
- Search by name; sort New-Old / Old-New; filter by model
- Load into editor, Duplicate (Copy), Rename, Delete
- SVG polyline route thumbnail per card

**Drones and assignments**

- Mock fleet: id, name, model, status (idle / flying / offline)
- Assign a saved wayline to one or more drones, creating assignment records
- Assignment table with manual status advance (pending, synced, in_progress, complete),
  plus a failed state

### 12.2 Deliberately deferred

Area / Linear / Slope / Geometric / Smart 3D route types; Smart Capture Alerts and object
detection; terrain-follow elevation files; obstacle bypassing; RTK/GNSS positioning; multi-dock
tasks; recurring and timed schedulers; media upload and storage locations; folders; route locking,
merging and download (KMZ); live telemetry and virtual flight.
