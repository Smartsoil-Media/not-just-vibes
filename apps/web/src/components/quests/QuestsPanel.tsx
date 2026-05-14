import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Compass, SkipForward, Sparkles } from 'lucide-react';
import type { SideQuest, SkillState } from '@njv/shared';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { pickCandidate } from '@/features/quests/select';
import { useProjectStore } from '@/stores/project';
import { cn } from '@/lib/utils';

export function QuestsPanel() {
  const project = useProjectStore((s) => s.project);
  const [quests, setQuests] = useState<SideQuest[]>([]);
  const [state, setState] = useState<SkillState[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!project) return;
    const [q, s] = await Promise.all([
      api.sideQuests(project.id),
      api.skillsState(project.id),
    ]);
    setQuests(q);
    setState(s);
  }, [project?.id]);

  useEffect(() => {
    if (project) refresh();
  }, [project?.id, refresh]);

  const candidate = useMemo(() => {
    const skipped = new Set(
      quests.filter((q) => q.status === 'skipped').map((q) => q.skillId),
    );
    return pickCandidate(state, { skippedSkillIds: skipped });
  }, [state, quests]);

  async function generate() {
    if (!project || !candidate || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.generateSideQuest(project.id, candidate.id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function mark(id: string, status: 'done' | 'skipped') {
    setQuests((q) => q.map((x) => (x.id === id ? { ...x, status } : x)));
    await api.updateSideQuest(id, status);
  }

  if (!project) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        Start a project to unlock side quests.
      </div>
    );
  }

  const open = quests.filter((q) => q.status === 'open');
  const closed = quests.filter((q) => q.status !== 'open');

  return (
    <div className="space-y-3 p-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <Compass className="h-3.5 w-3.5" /> Side quests
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-[10px]"
          disabled={busy || !candidate}
          onClick={generate}
          title={candidate ? `Generate a quest for ${candidate.name}` : 'No quests available yet'}
        >
          <Sparkles className="h-3 w-3" />
          {busy ? 'Generating…' : candidate ? `Quest: ${candidate.name}` : 'No quests yet'}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
          {error}
        </div>
      )}

      {open.length === 0 && closed.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No quests yet. Keep coding — the tutor will offer one when it spots a gap.
        </p>
      ) : (
        <>
          {open.length > 0 && (
            <ul className="space-y-2">
              {open.map((q) => (
                <li
                  key={q.id}
                  className="rounded-md border border-border bg-card p-2 text-xs"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-medium">{q.title}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {q.skillId}
                    </span>
                  </div>
                  <p className="mb-2 whitespace-pre-wrap text-muted-foreground">{q.prompt}</p>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 gap-1 text-[10px]"
                      onClick={() => mark(q.id, 'done')}
                    >
                      <Check className="h-3 w-3" /> Done
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-[10px]"
                      onClick={() => mark(q.id, 'skipped')}
                    >
                      <SkipForward className="h-3 w-3" /> Skip
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {closed.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Past quests
              </div>
              <ul className="space-y-1">
                {closed.map((q) => (
                  <li
                    key={q.id}
                    className={cn(
                      'flex items-center justify-between rounded border border-border px-2 py-1 text-[11px]',
                      q.status === 'done' ? 'text-emerald-400' : 'text-muted-foreground',
                    )}
                  >
                    <span className="truncate">{q.title}</span>
                    <span className="text-[10px] uppercase">{q.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
