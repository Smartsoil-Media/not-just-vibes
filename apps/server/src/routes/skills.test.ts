import { describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { schema } from '../db/client.js';
import { expectJson, makeTestApp } from '../test/harness.js';

async function makeProject(app: any, opts: { id?: string } = {}) {
  const res = await app.request('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'P', goal: 'g' }),
  });
  const { id } = await expectJson<{ id: string }>(res);
  return id;
}

describe('skills routes', () => {
  it('GET /catalog returns the static skill list', async () => {
    const { app } = await makeTestApp();
    const res = await app.request('/api/skills/catalog');
    const list = await expectJson<Array<{ id: string }>>(res);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty('id');
  });

  it('GET /state/:projectId returns [] for a new project', async () => {
    const { app } = await makeTestApp();
    const id = await makeProject(app);
    const rows = await expectJson<unknown[]>(await app.request(`/api/skills/state/${id}`));
    expect(rows).toEqual([]);
  });

  it('POST /detect persists detected skills at "introduced"', async () => {
    const { app, db, ai } = await makeTestApp({
      localComplete: () =>
        JSON.stringify({
          detected: [{ skillId: 'js.variables', confidence: 0.6, evidence: 'uses const' }],
        }),
    });
    const projectId = await makeProject(app);
    const res = await app.request('/api/skills/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        diff: '--- /a.ts\n+++ /a.ts\n+const x = 1;',
        files: { '/a.ts': 'const x = 1;' },
      }),
    });
    const out = await expectJson<{ detected: Array<{ skillId: string }> }>(res);
    expect(out.detected).toHaveLength(1);
    expect(out.detected[0]!.skillId).toBe('js.variables');

    const rows = await db
      .select()
      .from(schema.skillsState)
      .where(eq(schema.skillsState.projectId, projectId));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.level).toBe('introduced');

    expect(ai.calls.localComplete).toHaveLength(1);
  });

  it('POST /detect drops unknown skill IDs', async () => {
    const { app, db } = await makeTestApp({
      localComplete: () =>
        JSON.stringify({
          detected: [
            { skillId: 'made.up', confidence: 0.9 },
            { skillId: 'js.variables', confidence: 0.7 },
          ],
        }),
    });
    const projectId = await makeProject(app);
    const res = await app.request('/api/skills/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, diff: '+x', files: { '/a.ts': 'x' } }),
    });
    const out = await expectJson<{ detected: Array<{ skillId: string }> }>(res);
    expect(out.detected.map((d) => d.skillId)).toEqual(['js.variables']);
    const rows = await db.select().from(schema.skillsState);
    expect(rows).toHaveLength(1);
  });

  it('POST /detect promotes introduced -> practiced -> mastered over repeated detections', async () => {
    const responses = [
      JSON.stringify({ detected: [{ skillId: 'js.variables', confidence: 0.5 }] }),
      JSON.stringify({ detected: [{ skillId: 'js.variables', confidence: 0.6 }] }),
      JSON.stringify({ detected: [{ skillId: 'js.variables', confidence: 0.9 }] }),
    ];
    let i = 0;
    const { app, db } = await makeTestApp({ localComplete: () => responses[i++]! });
    const projectId = await makeProject(app);

    async function detect() {
      await app.request('/api/skills/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, diff: '+x', files: { '/a.ts': 'x' } }),
      });
      const rows = await db
        .select()
        .from(schema.skillsState)
        .where(
          and(
            eq(schema.skillsState.projectId, projectId),
            eq(schema.skillsState.skillId, 'js.variables'),
          ),
        );
      return rows[0]!.level;
    }

    expect(await detect()).toBe('introduced');
    expect(await detect()).toBe('practiced');
    expect(await detect()).toBe('mastered');
  });

  it('POST /detect tolerates non-JSON local output', async () => {
    const { app } = await makeTestApp({ localComplete: () => 'sorry, I cannot help' });
    const projectId = await makeProject(app);
    const out = await expectJson<{ detected: unknown[] }>(
      await app.request('/api/skills/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, diff: '+x', files: { '/a.ts': 'x' } }),
      }),
    );
    expect(out.detected).toEqual([]);
  });

  it('POST /side-quest creates and persists a quest', async () => {
    const { app, db } = await makeTestApp({
      localComplete: () =>
        JSON.stringify({ title: 'Practice useState', prompt: 'Build a counter.' }),
    });
    const projectId = await makeProject(app);
    const res = await app.request('/api/skills/side-quest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, skillId: 'react.useState' }),
    });
    const quest = await expectJson<{ id: string; title: string }>(res);
    expect(quest.title).toBe('Practice useState');

    const rows = await db.select().from(schema.sideQuests);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe('open');
  });

  it('POST /side-quest rejects unknown skill', async () => {
    const { app } = await makeTestApp();
    const projectId = await makeProject(app);
    const res = await app.request('/api/skills/side-quest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, skillId: 'bogus.skill' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /side-quest returns 502 on unparseable model output', async () => {
    const { app } = await makeTestApp({ localComplete: () => 'not json' });
    const projectId = await makeProject(app);
    const res = await app.request('/api/skills/side-quest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, skillId: 'js.variables' }),
    });
    expect(res.status).toBe(502);
  });

  it('PATCH /side-quests/:id updates status', async () => {
    const { app, db } = await makeTestApp({
      localComplete: () =>
        JSON.stringify({ title: 't', prompt: 'p' }),
    });
    const projectId = await makeProject(app);
    const create = await app.request('/api/skills/side-quest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, skillId: 'js.variables' }),
    });
    const { id } = await expectJson<{ id: string }>(create);

    const patch = await app.request(`/api/skills/side-quests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });
    expect(patch.status).toBe(200);

    const rows = await db.select().from(schema.sideQuests);
    expect(rows[0]!.status).toBe('done');
  });

  it('GET /side-quests/:projectId scopes to the project', async () => {
    const { app } = await makeTestApp({
      localComplete: () => JSON.stringify({ title: 't', prompt: 'p' }),
    });
    const p1 = await makeProject(app);
    const p2 = await makeProject(app);
    await app.request('/api/skills/side-quest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: p1, skillId: 'js.variables' }),
    });
    const onlyP1 = await expectJson<unknown[]>(
      await app.request(`/api/skills/side-quests/${p1}`),
    );
    const onlyP2 = await expectJson<unknown[]>(
      await app.request(`/api/skills/side-quests/${p2}`),
    );
    expect(onlyP1).toHaveLength(1);
    expect(onlyP2).toHaveLength(0);
  });
});
