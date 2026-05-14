import type { SkillState } from '@njv/shared';
import { skills, type SkillDef } from '@njv/skills-catalog';

const LEVEL_SCORE: Record<SkillState['level'] | 'unseen', number> = {
  unseen: 0,
  introduced: 1,
  practiced: 2,
  mastered: 3,
};

export interface RankedCandidate {
  skill: SkillDef;
  /** Higher is better. */
  score: number;
}

/**
 * Pick the next side-quest skill the learner is most ready for.
 *
 * Scoring:
 *   - +3 for each prerequisite at 'mastered'
 *   - +1.5 for each prerequisite at 'practiced'
 *   - +0.5 for each prerequisite at 'introduced'
 *   -  0  for unseen prereqs
 *   - +1 baseline if the skill itself is 'introduced' (we want to push it past the line)
 *   -  0 baseline if it's 'unseen' (still possible, but lower priority)
 *
 * Excluded:
 *   - skills the user has already 'practiced' or 'mastered'
 *   - skills with any prereq that's still 'unseen' (would be over their head)
 *   - skills the user is actively avoiding (returned by `skippedSkillIds`)
 */
export function rankCandidates(
  state: SkillState[],
  options: { skippedSkillIds?: Set<string> } = {},
): RankedCandidate[] {
  const byId = new Map(state.map((s) => [s.skillId, s]));
  const skipped = options.skippedSkillIds ?? new Set<string>();

  const ranked: RankedCandidate[] = [];

  for (const skill of skills) {
    if (skipped.has(skill.id)) continue;
    const own = byId.get(skill.id)?.level ?? 'unseen';
    if (own === 'practiced' || own === 'mastered') continue;

    const prereqLevels = skill.prerequisites.map((p) => byId.get(p)?.level ?? 'unseen');
    if (prereqLevels.some((l) => l === 'unseen')) continue;

    let score = own === 'introduced' ? 1 : 0;
    for (const level of prereqLevels) {
      if (level === 'mastered') score += 3;
      else if (level === 'practiced') score += 1.5;
      else if (level === 'introduced') score += 0.5;
    }

    ranked.push({ skill, score });
  }

  // Stable sort: highest score first, then catalog order to break ties.
  return ranked.sort((a, b) => b.score - a.score);
}

export function pickCandidate(
  state: SkillState[],
  options: { skippedSkillIds?: Set<string> } = {},
): SkillDef | undefined {
  return rankCandidates(state, options)[0]?.skill;
}
