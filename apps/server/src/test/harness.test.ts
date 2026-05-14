import { describe, expect, it } from 'vitest';
import { makeTestApp, expectJson } from './harness.js';

describe('test harness', () => {
  it('boots, applies migrations, and serves /health', async () => {
    const { app } = await makeTestApp();
    const res = await app.request('/health');
    const body = await expectJson<{ ok: boolean }>(res);
    expect(body.ok).toBe(true);
  });

  it('gives each call a fresh, isolated db', async () => {
    const a = await makeTestApp();
    const b = await makeTestApp();
    expect(a.db).not.toBe(b.db);
  });
});
