import OpenAI from 'openai';
import { env } from '../env.js';

export const local = new OpenAI({
  baseURL: env.LOCAL_LLM_BASE_URL,
  apiKey: env.LOCAL_LLM_API_KEY,
});

export const LOCAL_MODEL = env.LOCAL_MODEL;

export async function localComplete(
  system: string,
  user: string,
  opts: { json?: boolean; temperature?: number } = {},
): Promise<string> {
  const resp = await local.chat.completions.create({
    model: LOCAL_MODEL,
    temperature: opts.temperature ?? 0.4,
    response_format: opts.json ? { type: 'json_object' } : undefined,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  return resp.choices[0]?.message?.content ?? '';
}

export async function* localStream(
  system: string,
  user: string,
  opts: { temperature?: number } = {},
): AsyncGenerator<string> {
  const stream = await local.chat.completions.create({
    model: LOCAL_MODEL,
    temperature: opts.temperature ?? 0.4,
    stream: true,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
