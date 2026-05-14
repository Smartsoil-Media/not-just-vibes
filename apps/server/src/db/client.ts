import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '../env.js';
import * as schema from './schema.js';

const fileUrl = env.DATABASE_URL.startsWith('file:')
  ? env.DATABASE_URL.slice('file:'.length)
  : null;
if (fileUrl) {
  mkdirSync(dirname(fileUrl), { recursive: true });
}

const client = createClient({ url: env.DATABASE_URL });
export const db = drizzle(client, { schema });
export { schema };
