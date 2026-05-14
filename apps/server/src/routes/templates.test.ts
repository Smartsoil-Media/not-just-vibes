import { describe, expect, it } from 'vitest';
import { expectJson, makeTestApp } from '../test/harness.js';

describe('templates routes', () => {
  it('GET / lists templates with the public fields', async () => {
    const { app } = await makeTestApp();
    const res = await app.request('/api/templates');
    const list = await expectJson<Array<{ id: string; name: string; entry: string }>>(res);
    expect(list.length).toBeGreaterThan(0);
    for (const t of list) {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('name');
      expect(t).toHaveProperty('entry');
      // The list view shouldn't include files (those come from GET /:id).
      expect(t).not.toHaveProperty('files');
    }
  });

  it('GET /:id returns the full template definition', async () => {
    const { app } = await makeTestApp();
    const list = await expectJson<Array<{ id: string }>>(
      await app.request('/api/templates'),
    );
    const first = list[0]!;
    const res = await app.request(`/api/templates/${first.id}`);
    const full = await expectJson<{ id: string; files: Record<string, string> }>(res);
    expect(full.id).toBe(first.id);
    expect(full.files).toBeDefined();
    expect(Object.keys(full.files).length).toBeGreaterThan(0);
  });

  it('GET /:id returns 404 for unknown id', async () => {
    const { app } = await makeTestApp();
    const res = await app.request('/api/templates/does-not-exist');
    expect(res.status).toBe(404);
  });
});
