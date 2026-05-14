import { Hono } from 'hono';
import { templates } from '@njv/templates';

export const templatesRouter = new Hono();

templatesRouter.get('/', (c) =>
  c.json(
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      goalHint: t.goalHint,
      entry: t.entry,
    })),
  ),
);

templatesRouter.get('/:id', (c) => {
  const t = templates.find((x) => x.id === c.req.param('id'));
  if (!t) return c.json({ error: 'not_found' }, 404);
  return c.json(t);
});
