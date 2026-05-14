import { useCallback, useEffect, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Topbar } from '@/components/layout/Topbar';
import { FileExplorer } from '@/components/explorer/FileExplorer';
import { CenterPanel } from '@/components/layout/CenterPanel';
import { RightPanel } from '@/components/layout/RightPanel';
import { NewProjectDialog } from '@/components/project/NewProjectDialog';
import { api } from '@/lib/api';
import { useProjectStore } from '@/stores/project';
import { useSkillDetection } from '@/features/skills/useSkillDetection';
import { useCommitToAI } from '@/features/tutor/useCommitToAI';
import { usePlanProject } from '@/features/tutor/usePlanProject';
import { useTutorStore } from '@/stores/tutor';

const LAST_PROJECT_KEY = 'njv:lastProjectId';

export default function App() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const setProject = useProjectStore((s) => s.setProject);
  const project = useProjectStore((s) => s.project);
  const hydrateMessages = useTutorStore((s) => s.hydrate);
  const resetMessages = useTutorStore((s) => s.reset);
  const { run: commitToAI, busy: committing } = useCommitToAI();
  const { plan, planning } = usePlanProject();
  useSkillDetection();

  const loadProject = useCallback(
    async (id: string, opts: { autoPlan?: boolean } = {}) => {
      try {
        const p = await api.getProject(id);
        setProject(p);
        localStorage.setItem(LAST_PROJECT_KEY, id);

        try {
          const history = await api.chatHistory(id);
          hydrateMessages(history);
        } catch {
          resetMessages();
        }

        if (opts.autoPlan) {
          // Fire-and-forget — Plan tab will refresh from the server.
          void plan().catch(() => {});
        }
      } catch {
        localStorage.removeItem(LAST_PROJECT_KEY);
      }
    },
    [setProject, hydrateMessages, resetMessages, plan],
  );

  useEffect(() => {
    const last = localStorage.getItem(LAST_PROJECT_KEY);
    if (last) loadProject(last);
    else setDialogOpen(true);
  }, [loadProject]);

  return (
    <div className="flex h-full flex-col">
      <Topbar onNewProject={() => setDialogOpen(true)} onCommitToAI={() => commitToAI()} />
      {(committing || planning) && (
        <div className="border-b border-border bg-secondary/40 px-3 py-1 text-[11px] text-muted-foreground">
          {committing
            ? 'Sending the whole codebase to Claude for review…'
            : 'Asking Claude to break this project into steps…'}
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        {project ? (
          <PanelGroup direction="horizontal">
            <Panel defaultSize={16} minSize={10} maxSize={30}>
              <FileExplorer />
            </Panel>
            <PanelResizeHandle className="w-1 bg-border hover:bg-primary/40" />
            <Panel defaultSize={54} minSize={30}>
              <CenterPanel />
            </Panel>
            <PanelResizeHandle className="w-1 bg-border hover:bg-primary/40" />
            <Panel defaultSize={30} minSize={20} maxSize={50}>
              <RightPanel />
            </Panel>
          </PanelGroup>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No project loaded. Click "New" to start.
          </div>
        )}
      </div>
      <NewProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(id) => loadProject(id, { autoPlan: true })}
      />
    </div>
  );
}
