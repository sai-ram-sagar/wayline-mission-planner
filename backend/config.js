import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const backendDir = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(backendDir, '.env') });

const DEFAULT_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173';

export const config = {
  backendDir,
  port: Number(process.env.PORT ?? 4000),
  dbPath: path.resolve(backendDir, process.env.DB_PATH ?? 'data/wayline.sqlite'),
  corsOrigins: (process.env.CORS_ORIGIN ?? DEFAULT_ORIGINS)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Anything other than an explicit "false" seeds the mock fleet.
  seedDrones: (process.env.SEED_DRONES ?? 'true').toLowerCase() !== 'false',
};
