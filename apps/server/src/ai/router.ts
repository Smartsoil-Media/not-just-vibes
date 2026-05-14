import type { StuckLevel } from '@njv/shared';

export type TutorAction =
  | { kind: 'inline_hint' }
  | { kind: 'stuck'; level: StuckLevel }
  | { kind: 'detect_skills' }
  | { kind: 'side_quest' }
  | { kind: 'breakdown' }
  | { kind: 'commit_review' }
  | { kind: 'next_step' };

export function route(a: TutorAction): 'local' | 'cloud' {
  switch (a.kind) {
    case 'inline_hint':
    case 'detect_skills':
    case 'side_quest':
      return 'local';
    case 'stuck':
      return a.level >= 4 ? 'cloud' : 'local';
    case 'breakdown':
    case 'commit_review':
    case 'next_step':
      return 'cloud';
  }
}
