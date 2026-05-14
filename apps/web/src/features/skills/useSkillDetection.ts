import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/stores/project';
import { api } from '@/lib/api';
import { diffIsTrivial, unifiedDiff } from '@/lib/diff';

/**
 * After the user pauses editing, compute a unified diff against the last
 * detection baseline and send it to the local LLM. If the diff is empty or
 * trivial we skip the call entirely — keeps token use minimal.
 */
export function useSkillDetection() {
  const project = useProjectStore((s) => s.project);
  const baseline = useProjectStore((s) => s.detectionBaseline);
  const markBaseline = useProjectStore((s) => s.markDetectionBaseline);
  const debounce = useRef<number | null>(null);
  const filesSig = project ? Object.values(project.files).join('\n').length.toString() : '';

  useEffect(() => {
    if (!project) return;
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(async () => {
      const diff = unifiedDiff(baseline, project.files);
      if (!diff || diffIsTrivial(diff)) return;
      try {
        await api.detectSkills({
          projectId: project.id,
          diff,
          files: project.files,
        });
        markBaseline(project.files);
      } catch {
        // local model may be down — try again next pause
      }
    }, 4000);
    return () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    };
  }, [project?.id, filesSig, baseline, markBaseline]);
}
