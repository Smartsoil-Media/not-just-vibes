import { describe, expect, it } from 'vitest';
import { clampCodeBlocks, tryParseJson } from './postprocess.js';

describe('clampCodeBlocks', () => {
  it('leaves short snippets alone', () => {
    const input = 'See:\n```ts\nconst a = 1;\n```';
    expect(clampCodeBlocks(input)).toBe(input);
  });

  it('trims long fenced blocks to the configured line cap', () => {
    const input = '```ts\nline1\nline2\nline3\nline4\n```';
    const out = clampCodeBlocks(input, 2);
    expect(out).toContain('line1');
    expect(out).toContain('line2');
    expect(out).not.toContain('line3');
    expect(out).not.toContain('line4');
    expect(out).toContain('snippet trimmed');
  });

  it('handles multiple code blocks independently', () => {
    const input = '```\nkeepA\nkeepB\ndropC\ndropD\n```\nprose\n```\nshortX\nshortY\n```';
    const out = clampCodeBlocks(input, 2);
    expect(out).toContain('keepA\nkeepB');
    expect(out).not.toContain('dropC');
    expect(out).not.toContain('dropD');
    expect(out).toContain('shortX\nshortY');
  });
});

describe('tryParseJson', () => {
  it('parses plain JSON', () => {
    expect(tryParseJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips ```json fences', () => {
    expect(tryParseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('returns null for garbage', () => {
    expect(tryParseJson('not json')).toBeNull();
  });
});
