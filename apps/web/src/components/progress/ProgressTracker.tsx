import { useEffect, useState } from 'react';
import { Check, CircleDot, Circle } from 'lucide-react';
import type { ProgressStep } from '@njv/shared';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { useProjectStore } from '@/stores/project';
import { cn } from '@/lib/utils';

export function ProgressTracker() {
  const project = useProjectStore((s) => s.project);
  const [steps, setSteps] = useState<ProgressStep[]>([]);

  useEffect(() => {
    if (!project) return;
    api.progress(project.id).then(setSteps);
  }, [project?.id]);

  if (!project) return null;
  if (steps.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        No plan yet. Click "Plan with Claude" to break this project down.
      </div>
    );
  }

  const done = steps.filter((s) => s.status === 'done').length;
  const pct = Math.round((done / steps.length) * 100);

  async function toggle(s: ProgressStep) {
    const next = s.status === 'done' ? 'in_progress' : 'done';
    setSteps((rows) => rows.map((r) => (r.id === s.id ? { ...r, status: next } : r)));
    await api.updateStep(project!.id, s.id, next);
  }

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium uppercase tracking-wider text-muted-foreground">Plan</span>
        <span className="text-muted-foreground">
          {done}/{steps.length}
        </span>
      </div>
      <Progress value={pct} />
      <ol className="space-y-1">
        {steps.map((s) => {
          const Icon = s.status === 'done' ? Check : s.status === 'in_progress' ? CircleDot : Circle;
          return (
            <li key={s.id}>
              <button
                onClick={() => toggle(s)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-md p-2 text-left text-xs hover:bg-accent',
                  s.status === 'done' && 'text-muted-foreground line-through',
                )}
              >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="font-medium">{s.title}</span>
                  <span className="block text-[11px] text-muted-foreground">{s.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
