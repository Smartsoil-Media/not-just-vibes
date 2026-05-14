import { serve } from '@hono/node-server';
import { env } from './env.js';
import { createApp } from './app.js';
import { db } from './db/client.js';
import { createAIClient } from './ai/client.js';

const app = createApp(
  { db, ai: createAIClient() },
  {
    enableLogger: true,
    corsOrigins: env.CORS_ORIGIN,
    health: () => ({
      cloud: Boolean(env.ANTHROPIC_API_KEY),
      localBaseUrl: env.LOCAL_LLM_BASE_URL,
      localModel: env.LOCAL_MODEL,
    }),
  },
);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[njv server] listening on http://localhost:${info.port}`);
});
