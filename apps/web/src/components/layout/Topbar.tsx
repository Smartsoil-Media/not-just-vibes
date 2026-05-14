import { useEffect, useState } from 'react';
import { Cloud, Cpu, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useProjectStore } from '@/stores/project';

interface Props {
  onNewProject: () => void;
  onCommitToAI: () => void;
}

export function Topbar({ onNewProject, onCommitToAI }: Props) {
  const project = useProjectStore((s) => s.project);
  const [health, setHealth] = useState<{ cloud: boolean; localModel: string } | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <span className="font-semibold tracking-tight">not-just-vibes</span>
        <span className="text-xs text-muted-foreground">an AI coding tutor</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        {project && (
          <span className="text-muted-foreground">
            <span className="text-foreground">{project.name}</span>
            <span className="mx-2 text-muted-foreground/50">·</span>
            <span className="italic">{project.goal}</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1.5">
          <Cpu className="h-3 w-3" />
          {health?.localModel ?? 'local: ?'}
        </Badge>
        <Badge variant={health?.cloud ? 'success' : 'outline'} className="gap-1.5">
          <Cloud className="h-3 w-3" />
          {health?.cloud ? 'Claude on' : 'Claude off'}
        </Badge>
        <Button variant="outline" size="sm" onClick={onNewProject}>
          New
        </Button>
        <Button size="sm" disabled={!project} onClick={onCommitToAI} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Commit to AI
        </Button>
      </div>
    </header>
  );
}
