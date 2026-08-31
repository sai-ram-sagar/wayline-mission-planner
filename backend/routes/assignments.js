import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { assignmentCreateSchema, assignmentUpdateSchema } from '../lib/schemas.js';
import { HttpError, asyncHandler, notFound, validateBody } from '../lib/http.js';

export const assignmentsRouter = Router();

// Joined so the status table can show names without extra round trips.
const LIST_SQL = `
  SELECT a.id, a.wayline_id, a.drone_id, a.assigned_at, a.status,
         w.name  AS wayline_name,
         d.name  AS drone_name,
         d.model AS drone_model
    FROM assignments a
    JOIN waylines w ON w.id = a.wayline_id
    JOIN drones   d ON d.id = a.drone_id
`;

const selectOne = db.prepare(`${LIST_SQL} WHERE a.id = ?`);

// GET /api/assignments
assignmentsRouter.get(
  '/',
  asyncHandler((_req, res) => {
    res.json(db.prepare(`${LIST_SQL} ORDER BY a.assigned_at DESC`).all());
  }),
);

// POST /api/assignments — body: { wayline_id, drone_ids[] }
// Creates one assignment row per drone, in a single transaction.
assignmentsRouter.post(
  '/',
  validateBody(assignmentCreateSchema),
  asyncHandler((req, res) => {
    const { wayline_id: waylineId, drone_ids: droneIds } = req.body;

    if (!db.prepare('SELECT 1 FROM waylines WHERE id = ?').get(waylineId)) {
      throw notFound('Wayline');
    }

    const uniqueDroneIds = [...new Set(droneIds)];
    const missing = uniqueDroneIds.filter(
      (id) => !db.prepare('SELECT 1 FROM drones WHERE id = ?').get(id),
    );
    if (missing.length > 0) {
      throw new HttpError(404, 'One or more drones not found', { droneIds: missing });
    }

    const insert = db.prepare(`
      INSERT INTO assignments (id, wayline_id, drone_id, assigned_at, status)
      VALUES (@id, @wayline_id, @drone_id, @assigned_at, 'pending')
    `);

    const createAll = db.transaction((ids) =>
      ids.map((droneId) => {
        const id = uuid();
        insert.run({
          id,
          wayline_id: waylineId,
          drone_id: droneId,
          assigned_at: new Date().toISOString(),
        });
        return id;
      }),
    );

    const created = createAll(uniqueDroneIds).map((id) => selectOne.get(id));
    res.status(201).json(created);
  }),
);

// PATCH /api/assignments/:id — advance or set the status.
assignmentsRouter.patch(
  '/:id',
  validateBody(assignmentUpdateSchema),
  asyncHandler((req, res) => {
    const result = db
      .prepare('UPDATE assignments SET status = ? WHERE id = ?')
      .run(req.body.status, req.params.id);
    if (result.changes === 0) throw notFound('Assignment');
    res.json(selectOne.get(req.params.id));
  }),
);

// DELETE /api/assignments/:id — lets a mistaken assignment be removed.
assignmentsRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const result = db.prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id);
    if (result.changes === 0) throw notFound('Assignment');
    res.status(204).end();
  }),
);
