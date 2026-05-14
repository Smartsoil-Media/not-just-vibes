import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '../env.js';
import * as schema from './schema.js';

export { schema };

export function createDb(url: string = env.DATABASE_URL) {
  const fileUrl = url.startsWith('file:') ? url.slice('file:'.length) : null;
  if (fileUrl) {
    mkdirSync(dirname(fileUrl), { recursive: true });
  }
  const client = createClient({ url });
  return drizzle(client, { schema });
}

/**
 * Default app-wide db, configured from the environment.
 * Kept for legacy imports; new code should accept `Deps` and use `deps.db`.
 */
export const db = createDb();
