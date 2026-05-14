import { describe, expect, it } from 'vitest';
import { route } from './router.js';

describe('ai router policy', () => {
  it('keeps fast/frequent actions on the local model', () => {
    expect(route({ kind: 'inline_hint' })).toBe('local');
    expect(route({ kind: 'detect_skills' })).toBe('local');
    expect(route({ kind: 'side_quest' })).toBe('local');
  });

  it('sends high-stakes actions to the cloud', () => {
    expect(route({ kind: 'breakdown' })).toBe('cloud');
    expect(route({ kind: 'commit_review' })).toBe('cloud');
    expect(route({ kind: 'next_step' })).toBe('cloud');
  });

  it("escalates 'I'm stuck' L4 to cloud, keeps L1-L3 local", () => {
    expect(route({ kind: 'stuck', level: 1 })).toBe('local');
    expect(route({ kind: 'stuck', level: 2 })).toBe('local');
    expect(route({ kind: 'stuck', level: 3 })).toBe('local');
    expect(route({ kind: 'stuck', level: 4 })).toBe('cloud');
  });
});
