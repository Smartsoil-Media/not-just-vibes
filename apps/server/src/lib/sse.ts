import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';

export async function streamFromAsyncIterable(
  c: Context,
  source: AsyncIterable<string>,
  opts: { onDone?: (full: string) => Promise<void> | void } = {},
) {
  return streamSSE(c, async (stream) => {
    let full = '';
    for await (const chunk of source) {
      full += chunk;
      await stream.writeSSE({ event: 'token', data: chunk });
    }
    if (opts.onDone) await opts.onDone(full);
    await stream.writeSSE({ event: 'done', data: '' });
  });
}
