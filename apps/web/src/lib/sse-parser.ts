export interface SseFrame {
  event: string;
  data: string;
}

/**
 * Parse a single SSE frame (the text between two blank lines) per
 * https://html.spec.whatwg.org/multipage/server-sent-events.html.
 *
 * Multiple `data:` lines within a frame are joined with `\n`; the leading
 * space after `data:` (or `event:`) is stripped if present.
 */
export function parseSseFrame(raw: string): SseFrame {
  let event = 'message';
  const dataParts: string[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataParts.push(line.slice(5).replace(/^ /, ''));
  }
  return { event, data: dataParts.join('\n') };
}

/**
 * Split a buffer of SSE bytes into complete frames + a tail of unprocessed
 * bytes. Frames are separated by a blank line (`\n\n`).
 */
export function splitSseFrames(buf: string): { frames: SseFrame[]; rest: string } {
  const frames: SseFrame[] = [];
  let rest = buf;
  while (true) {
    const idx = rest.indexOf('\n\n');
    if (idx === -1) break;
    frames.push(parseSseFrame(rest.slice(0, idx)));
    rest = rest.slice(idx + 2);
  }
  return { frames, rest };
}
