import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { HttpError } from './lib/http.js';
import { waylinesRouter } from './routes/waylines.js';
import { dronesRouter } from './routes/drones.js';
import { assignmentsRouter } from './routes/assignments.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin/non-browser callers (curl, tests) which send no Origin.
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new HttpError(403, `Origin ${origin} is not allowed`));
    },
  }),
);
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/waylines', waylinesRouter);
app.use('/api/drones', dronesRouter);
app.use('/api/assignments', assignmentsRouter);

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

// Central error handler. Express needs all four parameters to recognise it.
// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  const status = error.status ?? 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: error.message ?? 'Internal server error',
    ...(error.details ? { details: error.details } : {}),
  });
});

app.listen(config.port, () => {
  console.log(`Wayline Mission Planner API listening on http://localhost:${config.port}`);
  console.log(`Database: ${config.dbPath}`);
});
