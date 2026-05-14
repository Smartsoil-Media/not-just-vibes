import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/stores/project';
import { api } from '@/lib/api';

/**
 * After the user pauses editing, send a compact "diff" (just the file list + sizes)
 * to the local LLM and update skill state. We don't compute a real diff here —
 * the detector reads the current content; the field is named "diff" to leave room
 * for a real diff later.
 */
export function useSkillDetection() {
  const project = useProjectStore((s) => s.project);
  const filesString = project ? Object.values(project.files).join('\n').length.toString() : '';
  const debounce = useRef<number | null>(null);

  useEffect(() => {
    if (!project) return;
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => {
      void api
        .detectSkills({
          projectId: project.id,
          diff: `(snapshot at ${Date.now()})`,
          files: project.files,
        })
        .catch(() => {});
    }, 4000);
    return () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    };
  }, [project?.id, filesString]);
}
