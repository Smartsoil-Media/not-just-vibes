import { describe, expect, it } from 'vitest';
import { parseSegments } from './parse-segments';

describe('parseSegments — text segments', () => {
  it('returns a single text segment for plain content', () => {
    expect(parseSegments('hello world')).toEqual([
      { type: 'text', text: 'hello world' },
    ]);
  });

  it('preserves single newlines inside text segments', () => {
    // This is exactly what `/tutor/commit-review` produces: newline-separated
    // sentences that previously got mangled by the SSE parser bug.
    expect(parseSegments('First thought.\nSecond thought.')).toEqual([
      { type: 'text', text: 'First thought.\nSecond thought.' },
    ]);
  });

  it('preserves double newlines (paragraph breaks)', () => {
    expect(
      parseSegments('First thought.\nSecond thought.\n\nFinal note.'),
    ).toEqual([
      {
        type: 'text',
        text: 'First thought.\nSecond thought.\n\nFinal note.',
      },
    ]);
  });

  it('returns no segments for empty content', () => {
    expect(parseSegments('')).toEqual([]);
  });
});

describe('parseSegments — fenced code blocks', () => {
  it('extracts a labeled code block', () => {
    expect(parseSegments('```ts\nconst x = 1;\n```')).toEqual([
      { type: 'code', text: 'const x = 1;\n', language: 'ts' },
    ]);
  });

  it('extracts an unlabeled code block (empty language)', () => {
    expect(parseSegments('```\nplain\n```')).toEqual([
      { type: 'code', text: 'plain\n', language: undefined },
    ]);
  });

  it('preserves newlines inside code block bodies', () => {
    const segs = parseSegments('```ts\nline1\nline2\nline3\n```');
    expect(segs).toEqual([
      { type: 'code', text: 'line1\nline2\nline3\n', language: 'ts' },
    ]);
  });

  it('splits surrounding text from a code block, preserving newlines on both sides', () => {
    const content = 'intro line\n\n```ts\nconst x = 1;\n```\n\noutro line';
    expect(parseSegments(content)).toEqual([
      { type: 'text', text: 'intro line\n\n' },
      { type: 'code', text: 'const x = 1;\n', language: 'ts' },
      { type: 'text', text: '\n\noutro line' },
    ]);
  });

  it('handles multiple code blocks separately', () => {
    const content = '```ts\na\n```\nbetween\n```py\nb\n```';
    expect(parseSegments(content)).toEqual([
      { type: 'code', text: 'a\n', language: 'ts' },
      { type: 'text', text: '\nbetween\n' },
      { type: 'code', text: 'b\n', language: 'py' },
    ]);
  });
});

describe('parseSegments — streaming partials', () => {
  it('renders an unterminated fence as plain text (re-parses when closing fence arrives)', () => {
    // Mid-stream the closing ``` hasn't arrived yet.
    const partial = 'intro\n```ts\nconst x = 1';
    expect(parseSegments(partial)).toEqual([
      { type: 'text', text: 'intro\n```ts\nconst x = 1' },
    ]);
    // ...and once the closing fence arrives, it parses as a real code block.
    const complete = partial + ';\n```';
    expect(parseSegments(complete)).toEqual([
      { type: 'text', text: 'intro\n' },
      { type: 'code', text: 'const x = 1;\n', language: 'ts' },
    ]);
  });
});
