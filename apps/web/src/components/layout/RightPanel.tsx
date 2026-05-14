import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ProgressTracker } from '@/components/progress/ProgressTracker';
import { QuestsPanel } from '@/components/quests/QuestsPanel';
import { SkillTree } from '@/components/skill-tree/SkillTree';
import { Button } from '@/components/ui/button';
import { usePlanProject } from '@/features/tutor/usePlanProject';
import { useProjectStore } from '@/stores/project';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';

export function RightPanel() {
  const project = useProjectStore((s) => s.project);
  const { plan, planning } = usePlanProject();
  const [error, setError] = useState<string | null>(null);

  return (
    <Tabs defaultValue="tutor" className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-2 py-1">
        <TabsList className="h-7">
          <TabsTrigger value="tutor">Tutor</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="quests">Quests</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>
        {project && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 gap-1 text-[10px]"
            disabled={planning}
            onClick={async () => {
              setError(null);
              try {
                await plan();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Sparkles className="h-3 w-3" />
            {planning ? 'Planning…' : 'Plan with Claude'}
          </Button>
        )}
      </div>
      {error && (
        <div className="border-b border-destructive/40 bg-destructive/10 px-3 py-1 text-[11px] text-destructive">
          {error}
        </div>
      )}
      <TabsContent value="tutor" className="mt-0 flex-1 overflow-hidden">
        <ChatPanel />
      </TabsContent>
      <TabsContent value="plan" className="mt-0 flex-1 overflow-auto">
        <ProgressTracker />
      </TabsContent>
      <TabsContent value="quests" className="mt-0 flex-1 overflow-auto">
        <QuestsPanel />
      </TabsContent>
      <TabsContent value="skills" className="mt-0 flex-1 overflow-hidden">
        <SkillTree />
      </TabsContent>
    </Tabs>
  );
}
