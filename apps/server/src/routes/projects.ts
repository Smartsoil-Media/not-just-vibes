import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { and, eq } from 'drizzle-orm';
import { createProjectInput, updateProjectInput, type FileMap } from '@njv/shared';
import { templateById } from '@njv/templates';
import { db, schema } from '../db/client.js';

export const projects = new Hono();

async function loadFiles(projectId: string): Promise<FileMap> {
  const rows = await db.select().from(schema.files).where(eq(schema.files.projectId, projectId));
  const map: FileMap = {};
  for (const row of rows) map[row.path] = row.content;
  return map;
}

projects.get('/', async (c) => {
  const rows = await db.select().from(schema.projects).orderBy(schema.projects.updatedAt);
  return c.json(rows);
});

projects.post('/', async (c) => {
  const parsed = createProjectInput.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const now = Date.now();
  const id = nanoid(10);
  const tmpl = parsed.data.template ? templateById[parsed.data.template] : null;
  const files: FileMap = parsed.data.files ?? tmpl?.files ?? {};
  const entry = tmpl?.entry ?? '/App.tsx';

  await db.insert(schema.projects).values({
    id,
    name: parsed.data.name,
    goal: parsed.data.goal,
    template: parsed.data.template ?? null,
    entry,
    createdAt: now,
    updatedAt: now,
  });
  if (Object.keys(files).length) {
    await db.insert(schema.files).values(
      Object.entries(files).map(([path, content]) => ({
        projectId: id,
        path,
        content,
        updatedAt: now,
      })),
    );
  }
  return c.json({ id });
});

projects.get('/:id', async (c) => {
  const id = c.req.param('id');
  const row = (await db.select().from(schema.projects).where(eq(schema.projects.id, id)))[0];
  if (!row) return c.json({ error: 'not found' }, 404);
  const files = await loadFiles(id);
  return c.json({
    ...row,
    files,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
});

projects.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const parsed = updateProjectInput.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const now = Date.now();
  if (parsed.data.name || parsed.data.goal) {
    await db
      .update(schema.projects)
      .set({
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        ...(parsed.data.goal ? { goal: parsed.data.goal } : {}),
        updatedAt: now,
      })
      .where(eq(schema.projects.id, id));
  }
  if (parsed.data.files) {
    for (const [path, content] of Object.entries(parsed.data.files)) {
      await db
        .insert(schema.files)
        .values({ projectId: id, path, content, updatedAt: now })
        .onConflictDoUpdate({
          target: [schema.files.projectId, schema.files.path],
          set: { content, updatedAt: now },
        });
    }
    await db
      .update(schema.projects)
      .set({ updatedAt: now })
      .where(eq(schema.projects.id, id));
  }
  return c.json({ ok: true });
});

projects.delete('/:id/files/:path{.+}', async (c) => {
  const id = c.req.param('id');
  const path = '/' + c.req.param('path');
  await db
    .delete(schema.files)
    .where(and(eq(schema.files.projectId, id), eq(schema.files.path, path)));
  return c.json({ ok: true });
});

projects.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await db.delete(schema.projects).where(eq(schema.projects.id, id));
  return c.json({ ok: true });
});
