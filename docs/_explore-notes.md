# Raw exploration notes — FlightHub 2 Wayline Editor
(scratch; folded into feature-reference.md at end of Step 1)

## Project context
- Org: KSPL-Dev-Team / Project: "DEMO-A Warehouse"
- Left rail = project-level nav icons; wayline (route) module selected.
- Map: 3D-capable satellite globe. Status bar: scale bar, ASL (above sea level), HAE (height above ellipsoid), coord system "WGS 84", tile-load %.
- Map shortcut overlay on load: Move map horizontally (LMB drag / arrows), Rotate map (RMB or Ctrl+LMB / Ctrl+arrows), Zoom (scroll / -,+), Look around (Alt+LMB / Alt+arrows), View 3D model surface (Shift+LMB / Shift+arrows).

## Flight Route Library (left panel)
- Header "Flight Route Library" + icons: import/download, delete, share/merge.
- Filters: "All Models" dropdown, sort "New-Old" dropdown.
- Row of 8 route-type filter icons (waypoint, patrol, area, linear, slope, geometric, smart3d, +1) + search icon.
- Folder tree column: "Folder" with info tooltip, new-folder button, "Default Folder".
- Route list column: "Route (14)", an import/move icon, "+ Create Route" button.
- Route card: name, inline rename (pencil), "..." overflow menu, aircraft model line (e.g. "Matrice 30 T"), "Updated at YYYY-MM-DD HH:MM:SS", route-type icon.

## Create Route dialog
### Route types
- Patrol and Inspection Routes: **Waypoint Route**, **Patrol Route**
- Mapping Routes: **Area Route**, **Linear Route**
- Detailed Mapping Routes: **Slope Route**, **Geometric Route**, **Smart 3D Capture**
### Select Aircraft (series) -> Select Model
- Matrice 30 Series -> Matrice 30, Matrice 30 T   (default selection)
- Mavic 3 Enterprise Series -> Mavic 3E, Mavic 3T, Mavic 3TA
- Matrice 3D series -> Matrice 3D, Matrice 3TD
- Matrice 4 Enterprise Series -> Matrice 4E, Matrice 4T   + Accessories: AS1 Speaker, AL1 SpotLight
- Matrice 4D Series -> Matrice 4D, Matrice 4TD           + Accessories: AS1 Speaker, AL1 SpotLight
- Matrice 400 -> no model list; instead **Select payload** (3 payload bays, drag/arrow to assign)
    - H30 Series: H30, H30T
    - P1: P1-24mm, P1-35mm, P1-50mm
    - LiDAR: L2, L3
- Route Name field, default auto-numbered "New Waypoint Route(N)"
- Cancel / OK

## Tooltip seen (Verification and Flight Route Operation)
"Quickly send immediate task after flight route is planned. Parameter check: Check the flight route parameters. Battery estimate: Is the battery sufficient to complete the task at this speed? (Estimates are for reference only). Clarity: Can text on the ground be captured clearly at current altitude? Real-time weather: Unable to obtain real-time data such as wind speed. Planned task: Unable to send timed tasks."

## Editor shell (route id in URL: /editor/edit?id=<uuid>)
- Top bar: back arrow, save icon, centre = route name + aircraft model chip, right = notifications, settings gear, keyboard-shortcuts icon.
- Top-left toggle button: "Flight Route Settings" (collapsible global panel).
- Left edge collapsed tab labelled "Wayp..." = Waypoint list panel (collapsed).
- Onboarding modal "Two ways to add waypoints":
  1. **Click on the map to add waypoints** — select the waypoint tool on the right side of the map, left-click to quickly add waypoints; *altitude of waypoints defaults to the global altitude of the route*.
  2. **Create precise route with virtual flight** — control the virtual aircraft with keyboard, press **[Space]** to add waypoints, add waypoint actions on the right side of the map. Press **[?]** for help.
- Warning modal: "The current web page resolution is too low, adjust the system display scaling or shrink the web page [Control]+[-] to avoid abnormal display".
- "Flight Route Editor Settings" popover (gear): "Set visibility and quick settings of elements in flight route editor".

## Global panel — "Flight Route Settings"
1. **Reference takeoff point** — button "Reference takeoff point not set"; activating shows map banner "Click on map to set reference takeoff point".
2. **Camera Settings** — multi-select chips: WIDE, Zoom, IR (all on by default for M30T). Toggle: **Smart Low-Light** (off).
3. **Takeoff mode tabs** — **Direct Ascent** (default) | **Safe Takeoff**; numeric "Safe Takeoff Altitude" = 20 m, steppers +100 / +10 / -10 / -100. Diagram contrasts "Direct ascent flight route" vs "Safe takeoff flight route".
4. **Waypoint Altitude Mode** — **ASL** (default) | **ALT** | **AGL**; value 209 m with +100/+10/-10/-100 steppers. Diagram labels: Altitude Above Sea Level / Ground / Sea Level.
   - ASL = above sea level, ALT = relative to takeoff point, AGL = above ground level.
5. **Global Flight Speed** — 10 m/s, - / + steppers.
6. **Advanced Settings** (collapsible, collapsed by default):
   - **Takeoff Speed** — 15 m/s (+ disabled at 15 => max 15).
   - **Waypoint Type** (global default turn behaviour) — 5 options, each with a diagram:
     1. Coordinated turn. Skips waypoint
     2. Straight route. Aircraft stops  *(default)*
     3. Turns before waypoint. Flies through
     4. Curved route. Aircraft stops
     5. Curved route. Aircraft continues
   - **Aircraft Yaw** — Along Route *(default)* | Manual | Lock Yaw Axis
     tooltip: "Along Route: Aircraft will follow flight route direction and fly to next waypoint. Manual: Allows manual control of aircraft heading when aircraft flies towards next waypoint. Lock Yaw Axis: Aircraft maintains its yaw angle from last waypoint and flies to the next waypoint"
   - **Gimbal Control** — Manual *(default)* | For Each Waypoint
     tooltip: "Manual: Allows manual control of gimbal tilt when aircraft flies towards next waypoint. Aircraft will maintain its original gimbal tilt angle from last waypoint if not controlled manually. For Each Waypoint: Gimbal tilt angle changes evenly when aircraft flies from one waypoint to the next"
   - **Upon Completion** — Return to Home *(default)* | Return to Start Point and Hover | Exit Task | Land
     tooltip: "Return to Home: Aircraft will fly to its takeoff point immediately after completing flight route task. Signal lost action will be performed if aircraft remains disconnected after completing the task or loses signal when flying to takeoff point. Return to Start Point and Hover: Aircraft flies to start point (Point S) immediately after completing flight route task... Exit Task: Aircraft exits task immediately after completing task and hovers in place... Land: Aircraft will land in current location after completing flight route task..."

## App navigation rail (expanded via hamburger)
Group 1: Team | Map Annotations | Map Photos | Map Models | Design files | Airspace Safety
Group 2: **Flight Route Library** | **Task Plan Library** | Automated (Task)
Group 3: Resource Library | Analyzer
Team page: Search device; sections "Dock/Ground Station", "Online Devices", "My Call Sign" (editable), "Online Members". Footer: Livestream, Livestream Sharing, +.

## Waypoint List panel (editor, left)
- Header "Waypoint List ⓘ" + **Reverse Flight Route** button (toast: "Flight route reversed").
- Summary strip: **total distance** (994.1 m) | **estimated duration** (2 m 5 s) | **waypoint count** (4) | **photo count** (0).
- One row per waypoint: index + colour marker, then one chip per attached action.
- Selecting a row selects the waypoint; map shows a mini toolbar: index, **edit (pencil)**, **delete (trash)**.
- Edit -> orange banner "Editing waypoint" with confirm ✓ [Space] / cancel ✗ [Esc]; list shows "Changing waypoint location".

## Waypoint-level editing (HUD at bottom of map)
Editable per waypoint: **Longitude**, **Latitude**, **Speed (SPD m/s)**, **Altitude** (both ALT relative and ASL shown), **aircraft heading** (compass dial), **gimbal pitch/yaw** readouts. Virtual aircraft is driven with Q/W/E and A/S/D keys; **[V]** toggles "Enable mouselook".

## Waypoint actions
Quick bar (always visible, "Based on aircraft location"):
- **Add waypoint** [Space]
- **Take Photo (Fixed Angle)** [F]
- **Pano**
- **Record Current Attitude**  (captures current aircraft yaw + gimbal yaw/tilt + zoom as actions on the waypoint)
- **More …**
"More" full action list (12):
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

### Action parameter editor (right panel)
Header: action icon + name, **< waypointIndex-actionIndex >** navigator, **delete (trash)**.
Observed editors:
- **Aircraft Yaw** — "Aircraft Yaw", slider + -/+ , value in ° (default 0°)
- **Gimbal Yaw** — slider + -/+ , ° (default 0°)
- **Gimbal Tilt** — slider + -/+ , ° (default 0°)
- **Camera Zoom** — "Zoom Ratio", slider + -/+ , X (default 2X)
(Hover -> duration; interval shots -> interval value; these follow the same slider/stepper pattern.)

## Flight Route Library — details
- Sort toggle: **New-Old** <-> **Old-New**
- Model filter: All Models / Matrice 30 Series / Mavic 3 Enterprise Series / Matrice 3D series / Matrice 4 Enterprise Series / Matrice 4D Series / Matrice 400
- Route-type icon filter row (8 icons) + search
- Header actions: Download, Delete, Merge
- Folder column: Default Folder, new-folder button
- Card overflow "..." menu: **Rename, Move, Copy, Download, Lock, Delete, Merge**
- Card inline **pencil** = rename
- Cards with problems render in orange with a warning badge (e.g. a Slope Route whose model is unsupported)
- Selecting a card shows an overlay header on the map: route name + owner email

## Model-dependent behaviour (confirmed)
- **Matrice 30 T**: global panel has "Camera Settings: WIDE / Zoom / IR" chips; action menu has **12** entries (includes **Gimbal Yaw**).
- **Mavic 3T**: **no** Camera Settings chip row (only Smart Low-Light); action menu has **11** entries (**no Gimbal Yaw** — gimbal has no independent yaw axis).
=> camera/payload capabilities drive which global settings and which actions are offered.

## Conditional rules (confirmed)
- **Hover** action is **disabled** while Waypoint Type = "Curved route. Aircraft continues" (aircraft never stops at the waypoint). It becomes available for stopping waypoint types.
- Takeoff Speed "+" is disabled at 15 m/s (hard max).
- "Upon Completion" dropdown is disabled in the Create Plan form (inherited from the route).

## Reference takeoff point
- Button toggles a map pick mode, banner "Click on map to set reference takeoff point".
- Once set, panel shows "Reference takeoff point set  ⟲ Reset Takeoff Point".
- Tooltip on takeoff mode: "Direct Ascent: Aircraft will ascend to start point altitude and fly to start point directly. Safe Takeoff: Aircraft will ascend to safe takeoff altitude before flying to start point. Safe Takeoff Altitude: Altitude relative to takeoff point. Aircraft will ascend to safe takeoff altitude after takeoff and fly to start point."

## Altitude mode labels
- **ASL** -> diagram label "Altitude Above Sea Level"
- **ALT** -> diagram label "Relative to Takeoff Point" (value may be negative, e.g. -17.3 m)
- **AGL** -> above ground level
Changing mode re-bases the number (209 ASL <-> 82.7 ALT for the same physical height).

## Take Photo (Fixed Angle) action editor  [shortcut F]
- Header: action name + < waypoint-action > navigator + delete
- **Filename template** field, default `DJI_YYYYMMDDhhmmss_XXXX_`, editable (pencil)
- **Snapshot Preview** — thumbnail of what the camera sees at that waypoint, overlaid with the active lens chip (e.g. "Visible 1X"), plus a capture timestamp
- Waypoint List "photo count" stat increments when photo actions exist

## Map / view controls (editor right rail)
search | annotation tools (point / line / polygon / circle with 5-colour picker) | waypoint tool
compass + N/000 heading | **2D / 3D toggle** | wifi | info | airspace | locate | zoom + / - | basemap switcher
Bottom-left of map: **Enable mouselook [V]**, fit/zoom-to-route
Status bar: scale, ASL, HAE, coordinate system (WGS 84), tile-load %

## Virtual flight HUD (bottom centre)
- Q / W / E and A / S / D key pads for translating & rotating the virtual aircraft
- Compass rose with heading, "SPD m/s" readout, altitude readouts (ALT m + ASL), gimbal pitch readout
- Editable Longitude / Latitude fields
- Label "Virtual flight"
