import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, schema } from '../db/client.js';

export const progress = new Hono();

progress.get('/:projectId', async (c) => {
  const rows = await db
    .select()
    .from(schema.progressSteps)
    .where(eq(schema.progressSteps.projectId, c.req.param('projectId')))
    .orderBy(schema.progressSteps.order);
  return c.json(rows);
});

progress.post('/:projectId', async (c) => {
  const projectId = c.req.param('projectId');
  const body = (await c.req.json()) as {
    steps: { title: string; description: string }[];
  };
  await db.delete(schema.progressSteps).where(eq(schema.progressSteps.projectId, projectId));
  await db.insert(schema.progressSteps).values(
    body.steps.map((s, i) => ({
      id: nanoid(10),
      projectId,
      title: s.title,
      description: s.description,
      status: i === 0 ? ('in_progress' as const) : ('pending' as const),
      order: i,
    })),
  );
  return c.json({ ok: true });
});

progress.patch('/:projectId/:stepId', async (c) => {
  const stepId = c.req.param('stepId');
  const body = (await c.req.json()) as { status: 'pending' | 'in_progress' | 'done' };
  await db
    .update(schema.progressSteps)
    .set({ status: body.status })
    .where(eq(schema.progressSteps.id, stepId));
  return c.json({ ok: true });
});
