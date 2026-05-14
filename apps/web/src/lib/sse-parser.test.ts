import { describe, expect, it } from 'vitest';
import { parseSseFrame, splitSseFrames } from './sse-parser';

describe('parseSseFrame', () => {
  it('parses a basic token frame', () => {
    expect(parseSseFrame('event: token\ndata: hello')).toEqual({
      event: 'token',
      data: 'hello',
    });
  });

  it('defaults event to "message" if absent', () => {
    expect(parseSseFrame('data: x')).toEqual({ event: 'message', data: 'x' });
  });

  it('strips a single leading space from data (SSE spec)', () => {
    expect(parseSseFrame('data:  two-spaces')).toEqual({
      event: 'message',
      data: ' two-spaces',
    });
  });

  it('joins multiple data: lines with `\\n`', () => {
    expect(
      parseSseFrame('event: token\ndata: line1\ndata: line2\ndata: line3'),
    ).toEqual({ event: 'token', data: 'line1\nline2\nline3' });
  });

  it('handles the done terminator (empty data)', () => {
    expect(parseSseFrame('event: done\ndata: ')).toEqual({
      event: 'done',
      data: '',
    });
  });
});

describe('splitSseFrames', () => {
  it('returns no frames and the full buffer as rest when no blank line yet', () => {
    const { frames, rest } = splitSseFrames('event: token\ndata: partial');
    expect(frames).toEqual([]);
    expect(rest).toBe('event: token\ndata: partial');
  });

  it('splits multiple frames separated by blank lines', () => {
    const { frames, rest } = splitSseFrames(
      'event: token\ndata: a\n\nevent: token\ndata: b\n\nevent: done\ndata: \n\n',
    );
    expect(rest).toBe('');
    expect(frames).toEqual([
      { event: 'token', data: 'a' },
      { event: 'token', data: 'b' },
      { event: 'done', data: '' },
    ]);
  });

  it('preserves a partial trailing frame as `rest`', () => {
    const { frames, rest } = splitSseFrames(
      'event: token\ndata: complete\n\nevent: token\ndata: half',
    );
    expect(frames).toEqual([{ event: 'token', data: 'complete' }]);
    expect(rest).toBe('event: token\ndata: half');
  });

  it('round-trips a multi-line token chunk losslessly', () => {
    // Wire bytes for a chunk containing "line1\nline2":
    const wire = 'event: token\ndata: line1\ndata: line2\n\n';
    const { frames } = splitSseFrames(wire);
    expect(frames).toEqual([{ event: 'token', data: 'line1\nline2' }]);
  });
});
