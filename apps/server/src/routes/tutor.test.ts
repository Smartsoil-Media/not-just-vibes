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

async function consumeSSE(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let out = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

describe('tutor routes', () => {
  it('POST /breakdown parses the cloud response', async () => {
    const { app, ai } = await makeTestApp({
      cloudComplete: () =>
        JSON.stringify({
          steps: [
            { title: 'Step 1', description: 'do this' },
            { title: 'Step 2', description: 'do that' },
          ],
          initialSkills: ['js.variables'],
        }),
    });
    const res = await app.request('/api/tutor/breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: 'build a counter', template: 'react-counter' }),
    });
    const out = await expectJson<{ steps: unknown[]; initialSkills: string[] }>(res);
    expect(out.steps).toHaveLength(2);
    expect(out.initialSkills).toEqual(['js.variables']);
    expect(ai.calls.cloudComplete).toHaveLength(1);
    // First system block should be cached (prompt caching invariant).
    expect(ai.calls.cloudComplete[0]!.blocks[0]!.cache).toBe(true);
  });

  it('POST /breakdown returns 502 when cloud output isn\'t valid JSON', async () => {
    const { app } = await makeTestApp({ cloudComplete: () => 'definitely not json' });
    const res = await app.request('/api/tutor/breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: 'x' }),
    });
    expect(res.status).toBe(502);
  });

  it('POST /inline-hint runs locally and trims output', async () => {
    const { app, ai } = await makeTestApp({
      localComplete: () => '  Consider extracting a helper.  ',
    });
    const res = await app.request('/api/tutor/inline-hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'p1',
        file: '/App.tsx',
        code: 'const x = 1;',
        cursor: 5,
      }),
    });
    const out = await expectJson<{ hint: string }>(res);
    expect(out.hint).toBe('Consider extracting a helper.');
    expect(ai.calls.localComplete).toHaveLength(1);
    expect(ai.calls.cloudComplete).toHaveLength(0);
  });

  it('POST /stuck routes to local for levels 1-3', async () => {
    const { app, ai } = await makeTestApp({ localStream: () => ['hint ', 'a'] });
    const projectId = await makeProject(app);
    const res = await app.request('/api/tutor/stuck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        level: 2,
        currentFile: '/App.tsx',
        files: { '/App.tsx': 'x' },
      }),
    });
    expect(res.status).toBe(200);
    await consumeSSE(res);
    expect(ai.calls.localStream).toHaveLength(1);
    expect(ai.calls.cloudStream).toHaveLength(0);
  });

  it('POST /stuck routes to cloud for level 4 and persists messages', async () => {
    const { app, db, ai } = await makeTestApp({
      cloudStream: () => ['Here ', 'is ', 'the ', 'answer.'],
    });
    const projectId = await makeProject(app);
    const res = await app.request('/api/tutor/stuck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        level: 4,
        currentFile: '/App.tsx',
        question: 'why?',
        files: { '/App.tsx': 'x' },
      }),
    });
    expect(res.status).toBe(200);
    await consumeSSE(res);

    expect(ai.calls.cloudStream).toHaveLength(1);
    expect(ai.calls.localStream).toHaveLength(0);

    const msgs = await db
      .select()
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.projectId, projectId))
      .orderBy(schema.chatMessages.createdAt);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]!.role).toBe('user');
    expect(msgs[0]!.content).toContain('[I\'m stuck L4]');
    expect(msgs[1]!.role).toBe('assistant');
    expect(msgs[1]!.source).toBe('cloud');
    expect(msgs[1]!.content).toBe('Here is the answer.');
  });

  it('POST /commit-review streams cloud and persists both messages', async () => {
    const { app, db } = await makeTestApp({
      cloudStream: () => ['Review: ', 'looks good.'],
    });
    const projectId = await makeProject(app);
    const res = await app.request('/api/tutor/commit-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, files: { '/App.tsx': 'x' } }),
    });
    expect(res.status).toBe(200);
    await consumeSSE(res);

    const msgs = await db
      .select()
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.projectId, projectId))
      .orderBy(schema.chatMessages.createdAt);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]!.content).toBe('[Commit to AI]');
    expect(msgs[1]!.role).toBe('assistant');
    expect(msgs[1]!.content).toBe('Review: looks good.');
  });

  it('GET /messages/:projectId returns history in order', async () => {
    const { app, db } = await makeTestApp();
    const projectId = await makeProject(app);
    const baseTime = Date.now();
    await db.insert(schema.chatMessages).values([
      {
        id: 'm1',
        projectId,
        role: 'user',
        source: null,
        content: 'hi',
        createdAt: baseTime,
      },
      {
        id: 'm2',
        projectId,
        role: 'assistant',
        source: 'local',
        content: 'hello',
        createdAt: baseTime + 1,
      },
    ]);

    const rows = await expectJson<Array<{ id: string; role: string }>>(
      await app.request(`/api/tutor/messages/${projectId}`),
    );
    expect(rows.map((r) => r.id)).toEqual(['m1', 'm2']);
  });

  it('validates payloads', async () => {
    const { app } = await makeTestApp();
    const res = await app.request('/api/tutor/inline-hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'p1' }),
    });
    expect(res.status).toBe(400);
  });
});
