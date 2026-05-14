import { describe, expect, it } from 'vitest';
import type { SkillState } from '@njv/shared';
import { skills } from '@njv/skills-catalog';
import { pickCandidate, rankCandidates } from './select';

function state(level: SkillState['level'], skillId: string): SkillState {
  return { projectId: 'p1', skillId, level, confidence: 1, lastSeen: 0 };
}

describe('quest ranking', () => {
  it('picks a no-prereq skill when nothing is known yet', () => {
    const picked = pickCandidate([]);
    // Catalog contains js.variables (no prereqs) — must be a foundational pick.
    expect(picked).toBeDefined();
    expect(picked!.prerequisites).toEqual([]);
  });

  it('excludes skills the user has already practiced or mastered', () => {
    const all = skills.map((s) => state('practiced', s.id));
    expect(pickCandidate(all)).toBeUndefined();
  });

  it('excludes skills with any unseen prerequisite', () => {
    // Find a skill with at least one prereq.
    const withPrereq = skills.find((s) => s.prerequisites.length > 0)!;
    const ranked = rankCandidates([], {});
    expect(ranked.find((r) => r.skill.id === withPrereq.id)).toBeUndefined();
  });

  it('prefers skills whose prereqs are mastered over barely-introduced ones', () => {
    // Build a synthetic situation: two unseen skills A and B, where A's prereqs are
    // mastered and B's are merely introduced.
    const withTwo = skills.filter((s) => s.prerequisites.length >= 1);
    const a = withTwo[0]!;
    const b = withTwo.find((s) => s !== a && s.prerequisites.length >= 1)!;
    const stateList: SkillState[] = [
      ...a.prerequisites.map((p) => state('mastered', p)),
      ...b.prerequisites.map((p) => state('introduced', p)),
    ];
    const ranked = rankCandidates(stateList);
    const aIdx = ranked.findIndex((r) => r.skill.id === a.id);
    const bIdx = ranked.findIndex((r) => r.skill.id === b.id);
    expect(aIdx).toBeGreaterThanOrEqual(0);
    expect(bIdx).toBeGreaterThanOrEqual(0);
    expect(aIdx).toBeLessThan(bIdx);
  });

  it('respects the skip list', () => {
    const picked = pickCandidate([]);
    expect(picked).toBeDefined();
    const skipped = new Set<string>([picked!.id]);
    const next = pickCandidate([], { skippedSkillIds: skipped });
    expect(next?.id).not.toBe(picked!.id);
  });
});
