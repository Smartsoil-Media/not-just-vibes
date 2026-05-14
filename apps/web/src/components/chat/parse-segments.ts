export interface Segment {
  type: 'text' | 'code';
  text: string;
  language?: string;
}

/**
 * Splits assistant chat content into text and fenced-code segments.
 *
 * - Matches ` ```lang\n...``` ` blocks (language is optional, may be empty).
 * - Text outside fences is returned verbatim, INCLUDING newlines. Callers are
 *   responsible for whitespace preservation when rendering (e.g.
 *   `white-space: pre-wrap`).
 * - A partial fence (opening backticks streamed in, closing not yet received)
 *   yields no `code` segment; the whole partial run renders as text and is
 *   re-parsed on the next streamed update.
 */
export function parseSegments(content: string): Segment[] {
  const out: Segment[] = [];
  const re = /```([\w-]*)\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    if (m.index > last) out.push({ type: 'text', text: content.slice(last, m.index) });
    // `m[1] || undefined`: an empty capture means no language was specified,
    // not "the language is the empty string". HintBlock uses `??` to fall back
    // to the literal 'code', so we have to normalize '' to undefined here.
    out.push({ type: 'code', text: m[2] ?? '', language: m[1] || undefined });
    last = m.index + m[0].length;
  }
  if (last < content.length) out.push({ type: 'text', text: content.slice(last) });
  return out;
}
