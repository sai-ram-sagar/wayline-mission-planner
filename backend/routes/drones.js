import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { droneCreateSchema } from '../lib/schemas.js';
import { asyncHandler, validateBody } from '../lib/http.js';

export const dronesRouter = Router();

// GET /api/drones
dronesRouter.get(
  '/',
  asyncHandler((_req, res) => {
    res.json(db.prepare('SELECT * FROM drones ORDER BY name').all());
  }),
);

// POST /api/drones — optional, lets the fleet be extended with more mock drones.
dronesRouter.post(
  '/',
  validateBody(droneCreateSchema),
  asyncHandler((req, res) => {
    const drone = { id: uuid(), ...req.body };
    db.prepare(
      'INSERT INTO drones (id, name, model, status) VALUES (@id, @name, @model, @status)',
    ).run(drone);
    res.status(201).json(drone);
  }),
);
