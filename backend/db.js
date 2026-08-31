import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema is created on first run and is safe to re-run. Enum-ish columns are
// constrained with CHECK so bad data cannot reach the DB even if a route
// forgets to validate. The vocabularies mirror docs/feature-reference.md.
db.exec(`
  CREATE TABLE IF NOT EXISTS waylines (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    aircraft_model TEXT NOT NULL DEFAULT 'Generic Quadcopter',
    settings      TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS waypoints (
    id            TEXT PRIMARY KEY,
    wayline_id    TEXT NOT NULL REFERENCES waylines(id) ON DELETE CASCADE,
    order_index   INTEGER NOT NULL,
    lat           REAL NOT NULL,
    lng           REAL NOT NULL,
    altitude      REAL NOT NULL,
    speed         REAL,
    heading_mode  TEXT NOT NULL DEFAULT 'alongRoute'
                  CHECK (heading_mode IN ('alongRoute', 'manual', 'lockYawAxis')),
    heading_value REAL NOT NULL DEFAULT 0,
    turn_mode     TEXT NOT NULL DEFAULT 'straightStop'
                  CHECK (turn_mode IN (
                    'coordinatedTurnSkip', 'straightStop', 'earlyTurnThrough',
                    'curvedStop', 'curvedContinue'
                  ))
  );

  CREATE TABLE IF NOT EXISTS waypoint_actions (
    id           TEXT PRIMARY KEY,
    waypoint_id  TEXT NOT NULL REFERENCES waypoints(id) ON DELETE CASCADE,
    order_index  INTEGER NOT NULL,
    action_type  TEXT NOT NULL
                 CHECK (action_type IN (
                   'takePhoto', 'startRecord', 'stopRecord', 'hover',
                   'gimbalPitch', 'gimbalYaw', 'aircraftYaw', 'zoom',
                   'timedIntervalShot', 'distanceIntervalShot', 'endIntervalShot'
                 )),
    params       TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS drones (
    id     TEXT PRIMARY KEY,
    name   TEXT NOT NULL,
    model  TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle'
           CHECK (status IN ('idle', 'flying', 'offline'))
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id          TEXT PRIMARY KEY,
    wayline_id  TEXT NOT NULL REFERENCES waylines(id) ON DELETE CASCADE,
    drone_id    TEXT NOT NULL REFERENCES drones(id) ON DELETE CASCADE,
    assigned_at TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'synced', 'in_progress', 'complete', 'failed'))
  );

  CREATE INDEX IF NOT EXISTS idx_waypoints_wayline
    ON waypoints (wayline_id, order_index);
  CREATE INDEX IF NOT EXISTS idx_actions_waypoint
    ON waypoint_actions (waypoint_id, order_index);
  CREATE INDEX IF NOT EXISTS idx_assignments_wayline ON assignments (wayline_id);
  CREATE INDEX IF NOT EXISTS idx_assignments_drone   ON assignments (drone_id);
`);

// Mock fleet. Models are drawn from the aircraft families catalogued in
// docs/feature-reference.md section 3.2 so the UI has realistic variety.
const SEED_FLEET = [
  { id: 'drone-alpha', name: 'Alpha-01', model: 'Matrice 30 T', status: 'idle' },
  { id: 'drone-bravo', name: 'Bravo-02', model: 'Mavic 3T', status: 'idle' },
  { id: 'drone-charlie', name: 'Charlie-03', model: 'Matrice 4T', status: 'flying' },
  { id: 'drone-delta', name: 'Delta-04', model: 'Matrice 3TD', status: 'offline' },
];

function seedDrones() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM drones').get();
  if (count > 0) return;

  const insert = db.prepare(
    'INSERT INTO drones (id, name, model, status) VALUES (@id, @name, @model, @status)',
  );
  db.transaction((fleet) => fleet.forEach((drone) => insert.run(drone)))(SEED_FLEET);
}

if (config.seedDrones) seedDrones();

export default db;
