import type { FileMap } from '@njv/shared';

/**
 * Classic dynamic-programming LCS over lines. O(n*m) time and memory,
 * which is fine for in-browser code files (kilobytes, not megabytes).
 */
function lcsTable(a: string[], b: string[]): number[][] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  return dp;
}

type Op = { kind: 'eq' | 'add' | 'del'; line: string };

function diffOps(a: string[], b: string[]): Op[] {
  const dp = lcsTable(a, b);
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ kind: 'eq', line: a[i]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      ops.push({ kind: 'del', line: a[i]! });
      i++;
    } else {
      ops.push({ kind: 'add', line: b[j]! });
      j++;
    }
  }
  while (i < a.length) ops.push({ kind: 'del', line: a[i++]! });
  while (j < b.length) ops.push({ kind: 'add', line: b[j++]! });
  return ops;
}

interface Hunk {
  oldStart: number;
  newStart: number;
  lines: string[];
}

/**
 * Group ops into hunks separated by long runs of equal lines.
 * Keeps `context` equal lines around each change.
 */
function toHunks(ops: Op[], context = 2): Hunk[] {
  const hunks: Hunk[] = [];
  let cur: Hunk | null = null;
  let oldLine = 1;
  let newLine = 1;
  let trailingEq = 0;

  for (let k = 0; k < ops.length; k++) {
    const op = ops[k]!;
    if (op.kind === 'eq') {
      if (cur && trailingEq < context) {
        cur.lines.push(` ${op.line}`);
        trailingEq++;
      } else if (cur && trailingEq >= context) {
        // Look ahead — if a change comes within `2 * context` lines, merge.
        let nextChange = -1;
        for (let l = k; l < Math.min(ops.length, k + 2 * context); l++) {
          if (ops[l]!.kind !== 'eq') {
            nextChange = l;
            break;
          }
        }
        if (nextChange >= 0) {
          cur.lines.push(` ${op.line}`);
        } else {
          hunks.push(cur);
          cur = null;
          trailingEq = 0;
        }
      }
      oldLine++;
      newLine++;
    } else {
      if (!cur) {
        // Back up `context` lines for the prelude.
        const preludeStartOld = Math.max(1, oldLine - context);
        const preludeStartNew = Math.max(1, newLine - context);
        cur = { oldStart: preludeStartOld, newStart: preludeStartNew, lines: [] };
        // Walk back through ops to attach prelude.
        const prelude: string[] = [];
        for (let l = k - 1; l >= 0 && prelude.length < context; l--) {
          if (ops[l]!.kind === 'eq') prelude.unshift(` ${ops[l]!.line}`);
          else break;
        }
        cur.lines.push(...prelude);
      }
      cur.lines.push(op.kind === 'del' ? `-${op.line}` : `+${op.line}`);
      if (op.kind === 'del') oldLine++;
      else newLine++;
      trailingEq = 0;
    }
  }
  if (cur) hunks.push(cur);
  return hunks;
}

function diffFile(path: string, before: string | undefined, after: string | undefined): string {
  if (before === after) return '';
  const header = `--- ${path}\n+++ ${path}\n`;
  if (before === undefined) {
    return header + (after ?? '').split('\n').map((l) => `+${l}`).join('\n') + '\n';
  }
  if (after === undefined) {
    return header + before.split('\n').map((l) => `-${l}`).join('\n') + '\n';
  }
  const ops = diffOps(before.split('\n'), after.split('\n'));
  if (ops.every((o) => o.kind === 'eq')) return '';
  const hunks = toHunks(ops);
  const body = hunks
    .map((h) => `@@ -${h.oldStart} +${h.newStart} @@\n${h.lines.join('\n')}`)
    .join('\n');
  return `${header}${body}\n`;
}

export function unifiedDiff(before: FileMap, after: FileMap): string {
  const paths = new Set([...Object.keys(before), ...Object.keys(after)]);
  const parts: string[] = [];
  for (const p of [...paths].sort()) {
    const d = diffFile(p, before[p], after[p]);
    if (d) parts.push(d);
  }
  return parts.join('\n');
}

export function diffIsTrivial(diff: string): boolean {
  const meaningful = diff
    .split('\n')
    .filter((l) => (l.startsWith('+') || l.startsWith('-')) && !l.startsWith('+++') && !l.startsWith('---'))
    .filter((l) => l.slice(1).trim().length > 0);
  return meaningful.length < 2;
}
