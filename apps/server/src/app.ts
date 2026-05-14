import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createProjectsRouter } from './routes/projects.js';
import { createTutorRouter } from './routes/tutor.js';
import { createSkillsRouter } from './routes/skills.js';
import { createProgressRouter } from './routes/progress.js';
import { createTemplatesRouter } from './routes/templates.js';
import type { Deps } from './types.js';

export interface AppOptions {
  /** Disable Hono's request logger middleware. Tests pass `false`. */
  enableLogger?: boolean;
  /** CORS allowed origins (comma-separated or array). Tests can omit. */
  corsOrigins?: string | string[];
  /** Health endpoint payload extras (e.g. cloud-availability flag). */
  health?: () => Record<string, unknown>;
}

export function createApp(deps: Deps, opts: AppOptions = {}) {
  const app = new Hono();

  if (opts.enableLogger !== false) {
    app.use('*', logger());
  }
  if (opts.corsOrigins) {
    const origins =
      typeof opts.corsOrigins === 'string'
        ? opts.corsOrigins.split(',').map((s) => s.trim())
        : opts.corsOrigins;
    app.use(
      '*',
      cors({
        origin: origins,
        allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
      }),
    );
  }

  app.get('/health', (c) => c.json({ ok: true, ...(opts.health?.() ?? {}) }));

  app.route('/api/projects', createProjectsRouter(deps));
  app.route('/api/tutor', createTutorRouter(deps));
  app.route('/api/skills', createSkillsRouter(deps));
  app.route('/api/progress', createProgressRouter(deps));
  app.route('/api/templates', createTemplatesRouter());

  return app;
}
