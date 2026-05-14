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

  it('only shows the differing window, not the whole file', () => {
    const before = { '/a.ts': 'a\nb\nc\nd\ne' };
    const after = { '/a.ts': 'a\nb\nC\nd\ne' };
    const out = unifiedDiff(before, after);
    expect(out).toContain('-c');
    expect(out).toContain('+C');
    expect(out).not.toContain('-a');
    expect(out).not.toContain('-e');
  });

  it('shows removed lines for a deleted file', () => {
    const out = unifiedDiff({ '/a.ts': 'x\ny' }, {});
    expect(out).toContain('-x');
    expect(out).toContain('-y');
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
