import type { FileMap } from '@njv/shared';

/**
 * Tiny line-level diff. Not a true LCS — we mark a file's old block as removed
 * and new block as added when contents differ. Good enough as a skill-detection signal
 * and keeps tokens cheap.
 */
function diffFile(path: string, before: string | undefined, after: string | undefined): string {
  if (before === after) return '';
  const header = `--- ${path}\n+++ ${path}\n`;
  const beforeLines = (before ?? '').split('\n');
  const afterLines = (after ?? '').split('\n');

  if (before === undefined) {
    return header + afterLines.map((l) => `+${l}`).join('\n') + '\n';
  }
  if (after === undefined) {
    return header + beforeLines.map((l) => `-${l}`).join('\n') + '\n';
  }

  // Find first and last differing lines so we don't dump whole files
  let start = 0;
  while (
    start < beforeLines.length &&
    start < afterLines.length &&
    beforeLines[start] === afterLines[start]
  ) {
    start++;
  }
  let endBefore = beforeLines.length - 1;
  let endAfter = afterLines.length - 1;
  while (
    endBefore >= start &&
    endAfter >= start &&
    beforeLines[endBefore] === afterLines[endAfter]
  ) {
    endBefore--;
    endAfter--;
  }

  const removed = beforeLines.slice(start, endBefore + 1).map((l) => `-${l}`);
  const added = afterLines.slice(start, endAfter + 1).map((l) => `+${l}`);
  if (removed.length === 0 && added.length === 0) return '';

  return `${header}@@ around line ${start + 1} @@\n${[...removed, ...added].join('\n')}\n`;
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
  // Ignore tiny edits (single-char tweaks, whitespace) to avoid useless LLM calls.
  const meaningful = diff
    .split('\n')
    .filter((l) => (l.startsWith('+') || l.startsWith('-')) && !l.startsWith('+++') && !l.startsWith('---'))
    .filter((l) => l.slice(1).trim().length > 0);
  return meaningful.length < 2;
}
