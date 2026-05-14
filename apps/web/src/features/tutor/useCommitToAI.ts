import { useCallback, useState } from 'react';
import { useProjectStore } from '@/stores/project';
import { useTutorStore } from '@/stores/tutor';
import { streamCommitReview } from '@/lib/api';

export function useCommitToAI() {
  const project = useProjectStore((s) => s.project);
  const push = useTutorStore((s) => s.push);
  const appendToken = useTutorStore((s) => s.appendToken);
  const endStream = useTutorStore((s) => s.endStream);
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (focus?: string) => {
      if (!project || busy) return;
      setBusy(true);
      push({ role: 'user', source: null, content: focus ? `[Commit to AI] ${focus}` : '[Commit to AI]' });
      const id = push({ role: 'assistant', source: 'cloud', content: '' });
      try {
        for await (const tok of streamCommitReview({
          projectId: project.id,
          files: project.files,
          focus,
        })) {
          appendToken(id, tok);
        }
      } catch (e) {
        appendToken(id, `\n\n_error: ${(e as Error).message}_`);
      } finally {
        endStream(id);
        setBusy(false);
      }
    },
    [project, busy, push, appendToken, endStream],
  );

  return { run, busy };
}
