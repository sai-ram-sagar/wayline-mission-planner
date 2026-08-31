import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { waylineSchema } from '../lib/schemas.js';
import { asyncHandler, notFound, validateBody } from '../lib/http.js';

export const waylinesRouter = Router();

const nowIso = () => new Date().toISOString();

const selectWayline = db.prepare('SELECT * FROM waylines WHERE id = ?');
const selectWaypoints = db.prepare(
  'SELECT * FROM waypoints WHERE wayline_id = ? ORDER BY order_index',
);
const selectActions = db.prepare(
  'SELECT * FROM waypoint_actions WHERE waypoint_id = ? ORDER BY order_index',
);

const insertWayline = db.prepare(`
  INSERT INTO waylines (id, name, description, aircraft_model, settings, created_at, updated_at)
  VALUES (@id, @name, @description, @aircraft_model, @settings, @created_at, @updated_at)
`);
const updateWayline = db.prepare(`
  UPDATE waylines
     SET name = @name, description = @description, aircraft_model = @aircraft_model,
         settings = @settings, updated_at = @updated_at
   WHERE id = @id
`);
const deleteWaypointsFor = db.prepare('DELETE FROM waypoints WHERE wayline_id = ?');
const insertWaypoint = db.prepare(`
  INSERT INTO waypoints
    (id, wayline_id, order_index, lat, lng, altitude, speed, heading_mode, heading_value, turn_mode)
  VALUES
    (@id, @wayline_id, @order_index, @lat, @lng, @altitude, @speed, @heading_mode, @heading_value, @turn_mode)
`);
const insertAction = db.prepare(`
  INSERT INTO waypoint_actions (id, waypoint_id, order_index, action_type, params)
  VALUES (@id, @waypoint_id, @order_index, @action_type, @params)
`);

/** Writes the waypoint/action tree for a wayline, replacing whatever was there. */
function writeWaypoints(waylineId, waypoints) {
  deleteWaypointsFor.run(waylineId); // cascades to waypoint_actions
  waypoints.forEach((waypoint, waypointIndex) => {
    const waypointId = uuid();
    insertWaypoint.run({
      id: waypointId,
      wayline_id: waylineId,
      order_index: waypointIndex,
      lat: waypoint.lat,
      lng: waypoint.lng,
      altitude: waypoint.altitude,
      speed: waypoint.speed,
      heading_mode: waypoint.heading_mode,
      heading_value: waypoint.heading_value,
      turn_mode: waypoint.turn_mode,
    });
    waypoint.actions.forEach((action, actionIndex) => {
      insertAction.run({
        id: uuid(),
        waypoint_id: waypointId,
        order_index: actionIndex,
        action_type: action.action_type,
        params: JSON.stringify(action.params),
      });
    });
  });
}

const createWaylineTx = db.transaction((payload) => {
  const timestamp = nowIso();
  const id = uuid();
  insertWayline.run({
    id,
    name: payload.name,
    description: payload.description,
    aircraft_model: payload.aircraft_model,
    settings: JSON.stringify(payload.settings),
    created_at: timestamp,
    updated_at: timestamp,
  });
  writeWaypoints(id, payload.waypoints);
  return id;
});

const updateWaylineTx = db.transaction((id, payload) => {
  updateWayline.run({
    id,
    name: payload.name,
    description: payload.description,
    aircraft_model: payload.aircraft_model,
    settings: JSON.stringify(payload.settings),
    updated_at: nowIso(),
  });
  writeWaypoints(id, payload.waypoints);
});

/** Assembles the nested representation the editor consumes. */
function readWayline(id) {
  const row = selectWayline.get(id);
  if (!row) return null;

  const waypoints = selectWaypoints.all(id).map((waypoint) => ({
    id: waypoint.id,
    order_index: waypoint.order_index,
    lat: waypoint.lat,
    lng: waypoint.lng,
    altitude: waypoint.altitude,
    speed: waypoint.speed,
    heading_mode: waypoint.heading_mode,
    heading_value: waypoint.heading_value,
    turn_mode: waypoint.turn_mode,
    actions: selectActions.all(waypoint.id).map((action) => ({
      id: action.id,
      order_index: action.order_index,
      action_type: action.action_type,
      params: JSON.parse(action.params),
    })),
  }));

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    aircraft_model: row.aircraft_model,
    settings: JSON.parse(row.settings),
    created_at: row.created_at,
    updated_at: row.updated_at,
    waypoints,
  };
}

// GET /api/waylines — summary list for the Library page.
// Includes a lightweight coordinate path so cards can draw a route thumbnail
// without fetching each wayline in full.
waylinesRouter.get(
  '/',
  asyncHandler((req, res) => {
    const rows = db
      .prepare(
        `SELECT w.*, COUNT(p.id) AS waypoint_count
           FROM waylines w
           LEFT JOIN waypoints p ON p.wayline_id = w.id
          GROUP BY w.id
          ORDER BY w.updated_at DESC`,
      )
      .all();

    const pathsFor = db.prepare(
      'SELECT lat, lng FROM waypoints WHERE wayline_id = ? ORDER BY order_index',
    );

    res.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        aircraft_model: row.aircraft_model,
        settings: JSON.parse(row.settings),
        created_at: row.created_at,
        updated_at: row.updated_at,
        waypoint_count: row.waypoint_count,
        path: pathsFor.all(row.id),
      })),
    );
  }),
);

// GET /api/waylines/:id — full nested wayline.
waylinesRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const wayline = readWayline(req.params.id);
    if (!wayline) throw notFound('Wayline');
    res.json(wayline);
  }),
);

// POST /api/waylines
waylinesRouter.post(
  '/',
  validateBody(waylineSchema),
  asyncHandler((req, res) => {
    const id = createWaylineTx(req.body);
    res.status(201).json(readWayline(id));
  }),
);

// PUT /api/waylines/:id — full replace, including the waypoint tree.
waylinesRouter.put(
  '/:id',
  validateBody(waylineSchema),
  asyncHandler((req, res) => {
    if (!selectWayline.get(req.params.id)) throw notFound('Wayline');
    updateWaylineTx(req.params.id, req.body);
    res.json(readWayline(req.params.id));
  }),
);

// DELETE /api/waylines/:id
waylinesRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const result = db.prepare('DELETE FROM waylines WHERE id = ?').run(req.params.id);
    if (result.changes === 0) throw notFound('Wayline');
    res.status(204).end();
  }),
);
