import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { useProjectStore } from '@/stores/project';

export function usePlanProject() {
  const project = useProjectStore((s) => s.project);
  const [planning, setPlanning] = useState(false);

  const plan = useCallback(async () => {
    if (!project || planning) return;
    setPlanning(true);
    try {
      const result = await api.breakdown(project.goal, project.template);
      await api.setProgress(project.id, result.steps);
      return result;
    } finally {
      setPlanning(false);
    }
  }, [project, planning]);

  return { plan, planning };
}
