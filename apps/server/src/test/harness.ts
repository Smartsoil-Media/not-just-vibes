import { createApp } from '../app.js';
import type { Db } from '../types.js';
import { createTestDb } from './db.js';
import { mockAI, type MockAI, type MockAIOptions } from './ai.js';

export interface TestApp {
  app: ReturnType<typeof createApp>;
  db: Db;
  ai: MockAI;
}

export async function makeTestApp(aiOpts: MockAIOptions = {}): Promise<TestApp> {
  const db = await createTestDb();
  const ai = mockAI(aiOpts);
  const app = createApp({ db, ai: ai.ai }, { enableLogger: false });
  return { app, db, ai };
}

/** Convenience: parse JSON from a Hono Response and assert status. */
export async function expectJson<T = unknown>(
  res: Response,
  status: number = 200,
): Promise<T> {
  if (res.status !== status) {
    const body = await res.text();
    throw new Error(`expected ${status}, got ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}
