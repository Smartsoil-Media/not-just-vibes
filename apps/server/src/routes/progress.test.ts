import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema } from '../db/client.js';
import { expectJson, makeTestApp } from '../test/harness.js';

async function makeProject(app: any) {
  const res = await app.request('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'P', goal: 'g' }),
  });
  return (await expectJson<{ id: string }>(res)).id;
}

describe('progress routes', () => {
  it('GET returns [] for a project with no steps', async () => {
    const { app } = await makeTestApp();
    const id = await makeProject(app);
    const rows = await expectJson<unknown[]>(await app.request(`/api/progress/${id}`));
    expect(rows).toEqual([]);
  });

  it('POST replaces all steps and marks the first in_progress', async () => {
    const { app, db } = await makeTestApp();
    const projectId = await makeProject(app);
    const res = await app.request(`/api/progress/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        steps: [
          { title: 'A', description: 'a' },
          { title: 'B', description: 'b' },
          { title: 'C', description: 'c' },
        ],
      }),
    });
    expect(res.status).toBe(200);

    const rows = await db
      .select()
      .from(schema.progressSteps)
      .where(eq(schema.progressSteps.projectId, projectId))
      .orderBy(schema.progressSteps.order);
    expect(rows).toHaveLength(3);
    expect(rows[0]!.status).toBe('in_progress');
    expect(rows[1]!.status).toBe('pending');
    expect(rows[2]!.status).toBe('pending');
  });

  it('POST replaces (does not append)', async () => {
    const { app, db } = await makeTestApp();
    const projectId = await makeProject(app);

    async function setSteps(steps: { title: string; description: string }[]) {
      await app.request(`/api/progress/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps }),
      });
    }
    await setSteps([
      { title: 'Old1', description: 'x' },
      { title: 'Old2', description: 'y' },
    ]);
    await setSteps([{ title: 'New', description: 'z' }]);

    const rows = await db
      .select()
      .from(schema.progressSteps)
      .where(eq(schema.progressSteps.projectId, projectId));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe('New');
  });

  it('PATCH updates a single step\'s status', async () => {
    const { app, db } = await makeTestApp();
    const projectId = await makeProject(app);
    await app.request(`/api/progress/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        steps: [
          { title: 'A', description: 'a' },
          { title: 'B', description: 'b' },
        ],
      }),
    });
    const [first] = await db
      .select()
      .from(schema.progressSteps)
      .where(eq(schema.progressSteps.projectId, projectId));
    expect(first).toBeDefined();

    const patch = await app.request(`/api/progress/${projectId}/${first!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });
    expect(patch.status).toBe(200);

    const reread = await db
      .select()
      .from(schema.progressSteps)
      .where(eq(schema.progressSteps.id, first!.id));
    expect(reread[0]!.status).toBe('done');
  });
});
