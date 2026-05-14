import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(8787),
  DATABASE_URL: z.string().default('file:./data/njv.db'),
  ANTHROPIC_API_KEY: z.string().optional(),
  LOCAL_LLM_BASE_URL: z.string().default('http://localhost:11434/v1'),
  LOCAL_LLM_API_KEY: z.string().default('ollama'),
  LOCAL_MODEL: z.string().default('qwen2.5-coder:7b-instruct'),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-6'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export const env = schema.parse(process.env);
