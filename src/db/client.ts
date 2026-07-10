import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { config } from '../config.js';
import * as schema from './schema.js';

// Neon (serverless Postgres) via the HTTP driver — suits per-request queries
// (long polling and future serverless/webhook). One client per process.
const sql = neon(config.databaseUrl);

export const db = drizzle(sql, { schema });

export { schema };
