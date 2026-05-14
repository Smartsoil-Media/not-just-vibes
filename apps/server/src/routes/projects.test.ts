import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema } from '../db/client.js';
import { expectJson, makeTestApp } from '../test/harness.js';

async function postJson(app: ReturnType<typeof makeTestApp> extends Promise<{ app: infer A }> ? A : never, url: string, body: unknown) {
  return app.request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('projects routes', () => {
  it('rejects missing fields on POST', async () => {
    const { app } = await makeTestApp();
    const res = await postJson(app, '/api/projects', { name: 'x' });
    expect(res.status).toBe(400);
  });

  it('creates a project and round-trips files via GET /:id', async () => {
    const { app } = await makeTestApp();
    const create = await postJson(app, '/api/projects', {
      name: 'Counter',
      goal: 'learn useState',
      files: { '/App.tsx': 'export default () => null;' },
    });
    const { id } = await expectJson<{ id: string }>(create, 200);
    expect(id).toBeTypeOf('string');

    const get = await app.request(`/api/projects/${id}`);
    const project = await expectJson<{
      id: string;
      name: string;
      goal: string;
      files: Record<string, string>;
    }>(get);
    expect(project.id).toBe(id);
    expect(project.name).toBe('Counter');
    expect(project.files['/App.tsx']).toBe('export default () => null;');
  });

  it('returns 404 for a missing project', async () => {
    const { app } = await makeTestApp();
    const res = await app.request('/api/projects/nope123');
    expect(res.status).toBe(404);
  });

  it('lists projects', async () => {
    const { app } = await makeTestApp();
    await postJson(app, '/api/projects', { name: 'A', goal: 'a' });
    await postJson(app, '/api/projects', { name: 'B', goal: 'b' });
    const res = await app.request('/api/projects');
    const list = await expectJson<Array<{ name: string }>>(res);
    expect(list).toHaveLength(2);
    expect(list.map((p) => p.name).sort()).toEqual(['A', 'B']);
  });

  it('PATCH upserts files and updates name', async () => {
    const { app, db } = await makeTestApp();
    const { id } = await expectJson<{ id: string }>(
      await postJson(app, '/api/projects', {
        name: 'A',
        goal: 'a',
        files: { '/App.tsx': 'v1' },
      }),
    );
    const patch = await app.request(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A renamed',
        files: { '/App.tsx': 'v2', '/extra.ts': 'new file' },
      }),
    });
    expect(patch.status).toBe(200);

    const reread = await expectJson<{
      name: string;
      files: Record<string, string>;
    }>(await app.request(`/api/projects/${id}`));
    expect(reread.name).toBe('A renamed');
    expect(reread.files['/App.tsx']).toBe('v2');
    expect(reread.files['/extra.ts']).toBe('new file');

    // Sanity: only the two files in the table.
    const fileRows = await db
      .select()
      .from(schema.files)
      .where(eq(schema.files.projectId, id));
    expect(fileRows).toHaveLength(2);
  });

  it('DELETE /:id cascades file rows', async () => {
    const { app, db } = await makeTestApp();
    const { id } = await expectJson<{ id: string }>(
      await postJson(app, '/api/projects', {
        name: 'A',
        goal: 'a',
        files: { '/App.tsx': 'v1', '/b.ts': 'x' },
      }),
    );
    const del = await app.request(`/api/projects/${id}`, { method: 'DELETE' });
    expect(del.status).toBe(200);

    const filesAfter = await db
      .select()
      .from(schema.files)
      .where(eq(schema.files.projectId, id));
    expect(filesAfter).toHaveLength(0);
  });

  it('DELETE /:id/files/:path removes a single file', async () => {
    const { app, db } = await makeTestApp();
    const { id } = await expectJson<{ id: string }>(
      await postJson(app, '/api/projects', {
        name: 'A',
        goal: 'a',
        files: { '/keep.ts': 'k', '/drop.ts': 'd' },
      }),
    );
    const del = await app.request(`/api/projects/${id}/files/drop.ts`, {
      method: 'DELETE',
    });
    expect(del.status).toBe(200);

    const remaining = await db
      .select()
      .from(schema.files)
      .where(eq(schema.files.projectId, id));
    expect(remaining.map((r) => r.path)).toEqual(['/keep.ts']);
  });
});
