import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { env } from './env.js';
import { projects } from './routes/projects.js';
import { tutor } from './routes/tutor.js';
import { skillsRouter } from './routes/skills.js';
import { progress } from './routes/progress.js';
import { templatesRouter } from './routes/templates.js';

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.get('/health', (c) =>
  c.json({
    ok: true,
    cloud: Boolean(env.ANTHROPIC_API_KEY),
    localBaseUrl: env.LOCAL_LLM_BASE_URL,
    localModel: env.LOCAL_MODEL,
  }),
);

app.route('/api/projects', projects);
app.route('/api/tutor', tutor);
app.route('/api/skills', skillsRouter);
app.route('/api/progress', progress);
app.route('/api/templates', templatesRouter);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[njv server] listening on http://localhost:${info.port}`);
});
