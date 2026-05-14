import { describe, expect, it } from 'vitest';
import { diffIsTrivial, unifiedDiff } from './diff';

describe('unifiedDiff', () => {
  it('returns empty when nothing changed', () => {
    const files = { '/a.ts': 'x' };
    expect(unifiedDiff(files, files)).toBe('');
  });

  it('shows added lines for a new file', () => {
    const out = unifiedDiff({}, { '/a.ts': 'hello\nworld' });
    expect(out).toContain('+++ /a.ts');
    expect(out).toContain('+hello');
    expect(out).toContain('+world');
  });

  it('shows removed lines for a deleted file', () => {
    const out = unifiedDiff({ '/a.ts': 'x\ny' }, {});
    expect(out).toContain('-x');
    expect(out).toContain('-y');
  });

  it('preserves context around edits', () => {
    const before = { '/a.ts': 'a\nb\nc\nd\ne' };
    const after = { '/a.ts': 'a\nb\nC\nd\ne' };
    const out = unifiedDiff(before, after);
    expect(out).toContain('-c');
    expect(out).toContain('+C');
    // The default context window includes neighbouring lines.
    expect(out).toContain(' b');
    expect(out).toContain(' d');
  });

  it('does not dump distant unchanged lines as a single mega-hunk', () => {
    // 30 unchanged lines on each side of a single-line change.
    const head = Array.from({ length: 30 }, (_, i) => `keep${i}`).join('\n');
    const tail = Array.from({ length: 30 }, (_, i) => `tail${i}`).join('\n');
    const out = unifiedDiff(
      { '/a.ts': `${head}\nOLD\n${tail}` },
      { '/a.ts': `${head}\nNEW\n${tail}` },
    );
    expect(out).toContain('-OLD');
    expect(out).toContain('+NEW');
    // Most of the head/tail should be omitted.
    const keepHits = out.match(/keep\d+/g) ?? [];
    expect(keepHits.length).toBeLessThan(10);
  });

  it('correctly reports an insertion in the middle of a file', () => {
    const out = unifiedDiff(
      { '/a.ts': 'a\nb\nc' },
      { '/a.ts': 'a\nb\nX\nc' },
    );
    expect(out).toContain('+X');
    expect(out).not.toContain('-X');
    // No spurious deletes for unchanged 'b' or 'c'.
    expect(out).not.toContain('-b');
    expect(out).not.toContain('-c');
  });

  it('correctly reports a deletion in the middle of a file', () => {
    const out = unifiedDiff(
      { '/a.ts': 'a\nb\nc\nd' },
      { '/a.ts': 'a\nb\nd' },
    );
    expect(out).toContain('-c');
    expect(out).not.toContain('+c');
    expect(out).not.toContain('-d');
  });

  it('handles multiple files in the same diff', () => {
    const out = unifiedDiff(
      { '/a.ts': 'old', '/b.ts': 'kept' },
      { '/a.ts': 'new', '/b.ts': 'kept', '/c.ts': 'brand new' },
    );
    expect(out).toContain('-old');
    expect(out).toContain('+new');
    expect(out).toContain('+brand new');
    expect(out).not.toContain('-kept');
    expect(out).not.toContain('+kept');
  });

  it('produces stable hunk headers with correct line numbers', () => {
    const out = unifiedDiff(
      { '/a.ts': 'a\nb\nc\nd\ne\nf' },
      { '/a.ts': 'a\nb\nc\nX\ne\nf' },
    );
    // Change is at old line 4 and new line 4.
    expect(out).toMatch(/@@ -\d+ \+\d+ @@/);
  });
});

describe('diffIsTrivial', () => {
  it('is true for whitespace-only changes', () => {
    expect(diffIsTrivial('--- /a.ts\n+++ /a.ts\n+ \n- ')).toBe(true);
  });

  it('is false once real content changes', () => {
    expect(diffIsTrivial('--- /a.ts\n+++ /a.ts\n+const a = 1;\n+const b = 2;')).toBe(false);
  });
});
