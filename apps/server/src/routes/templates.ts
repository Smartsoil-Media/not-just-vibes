import { Hono } from 'hono';
import { templates } from '@njv/templates';

export function createTemplatesRouter() {
  const router = new Hono();

  router.get('/', (c) =>
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

  router.get('/:id', (c) => {
    const t = templates.find((x) => x.id === c.req.param('id'));
    if (!t) return c.json({ error: 'not_found' }, 404);
    return c.json(t);
  });

  return router;
}
