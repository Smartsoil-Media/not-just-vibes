import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { streamFromAsyncIterable } from './sse.js';

async function* fromArray(items: string[]): AsyncGenerator<string> {
  for (const it of items) yield it;
}

async function readBody(res: Response): Promise<string> {
  expect(res.body).toBeTruthy();
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let out = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

interface ParsedFrame {
  event: string;
  data: string;
}

/**
 * Reference parser matching apps/web/src/lib/sse-parser.ts.
 * Duplicated here so the server tests don't import from the web package,
 * but kept byte-equivalent: if these diverge, the wire contract is broken.
 */
function parseFrames(text: string): ParsedFrame[] {
  const out: ParsedFrame[] = [];
  for (const raw of text.split('\n\n')) {
    if (!raw) continue;
    let event = 'message';
    const dataParts: string[] = [];
    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataParts.push(line.slice(5).replace(/^ /, ''));
    }
    out.push({ event, data: dataParts.join('\n') });
  }
  return out;
}

function mount(source: AsyncIterable<string>, onDone?: (full: string) => void) {
  const app = new Hono();
  app.get('/stream', (c) => streamFromAsyncIterable(c, source, { onDone }));
  return app;
}

describe('SSE wire format', () => {
  it('emits one `token` frame per chunk, in order, terminated by `done`', async () => {
    const app = mount(fromArray(['hello', ' ', 'world']));
    const text = await readBody(await app.request('/stream'));
    expect(parseFrames(text)).toEqual([
      { event: 'token', data: 'hello' },
      { event: 'token', data: ' ' },
      { event: 'token', data: 'world' },
      { event: 'done', data: '' },
    ]);
  });

  it('uses exactly `\\n\\n` as the frame separator', async () => {
    const app = mount(fromArray(['a', 'b']));
    const text = await readBody(await app.request('/stream'));
    // Three frames -> three separators. No CR characters anywhere.
    expect(text.match(/\n\n/g)?.length).toBe(3);
    expect(text).not.toContain('\r');
  });

  it('produces the locked-down byte layout for a single chunk', async () => {
    const app = mount(fromArray(['hi']));
    const text = await readBody(await app.request('/stream'));
    expect(text).toBe('event: token\ndata: hi\n\nevent: done\ndata: \n\n');
  });

  it('preserves multi-line chunks losslessly (no newline loss)', async () => {
    const app = mount(fromArray(['line1\nline2']));
    const text = await readBody(await app.request('/stream'));
    // Hono splits multi-line data into two `data:` lines per SSE spec;
    // the reference parser rejoins them with `\n`.
    expect(text).toBe(
      'event: token\ndata: line1\ndata: line2\n\nevent: done\ndata: \n\n',
    );
    const frames = parseFrames(text);
    expect(frames[0]).toEqual({ event: 'token', data: 'line1\nline2' });
  });

  it('calls onDone with the full text BEFORE the done frame', async () => {
    let received: string | null = null;
    const app = mount(fromArray(['foo', 'bar']), (full) => {
      received = full;
    });
    const frames = parseFrames(await readBody(await app.request('/stream')));
    expect(received).toBe('foobar');
    expect(frames.at(-1)).toEqual({ event: 'done', data: '' });
  });

  it('still emits a `done` frame for an empty source', async () => {
    const app = mount(fromArray([]));
    expect(parseFrames(await readBody(await app.request('/stream')))).toEqual([
      { event: 'done', data: '' },
    ]);
  });
});
