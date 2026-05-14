import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env.js';

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set — cloud features are disabled.');
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export const CLAUDE_MODEL = env.CLAUDE_MODEL;

export interface CachedSystemBlock {
  text: string;
  cache: boolean;
}

function buildSystem(blocks: CachedSystemBlock[]): Anthropic.TextBlockParam[] {
  return blocks.map((b) => ({
    type: 'text' as const,
    text: b.text,
    ...(b.cache ? { cache_control: { type: 'ephemeral' as const } } : {}),
  }));
}

export async function cloudComplete(
  systemBlocks: CachedSystemBlock[],
  userMessage: string,
  opts: { maxTokens?: number } = {},
): Promise<string> {
  const msg = await client().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    system: buildSystem(systemBlocks),
    messages: [{ role: 'user', content: userMessage }],
  });
  return msg.content
    .filter((c): c is Anthropic.TextBlock => c.type === 'text')
    .map((c) => c.text)
    .join('');
}

export async function* cloudStream(
  systemBlocks: CachedSystemBlock[],
  userMessage: string,
  opts: { maxTokens?: number } = {},
): AsyncGenerator<string> {
  const stream = client().messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    system: buildSystem(systemBlocks),
    messages: [{ role: 'user', content: userMessage }],
  });
  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}
