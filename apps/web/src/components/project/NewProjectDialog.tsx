import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TemplateRow {
  id: string;
  name: string;
  description: string;
  goalHint: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (projectId: string) => void;
}

export function NewProjectDialog({ open, onOpenChange, onCreated }: Props) {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selected, setSelected] = useState<string>('blank');
  const [name, setName] = useState('My project');
  const [goal, setGoal] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      api.listTemplates().then((rows) => {
        setTemplates(rows);
        const t = rows.find((r) => r.id === selected) ?? rows[0];
        if (t && !goal) setGoal(t.goalHint);
      });
    }
  }, [open]);

  async function create() {
    if (!goal.trim()) return;
    setCreating(true);
    try {
      const { id } = await api.createProject({
        name: name.trim() || 'Untitled',
        goal: goal.trim(),
        template: selected,
      });
      onCreated(id);
      onOpenChange(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start a new project</DialogTitle>
          <DialogDescription>
            Pick a template, then describe what you want to build. Claude will plan the steps.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelected(t.id);
                setGoal(t.goalHint);
              }}
              className={cn(
                'rounded-md border border-border p-3 text-left text-xs transition-colors hover:bg-accent',
                selected === t.id && 'border-primary bg-accent',
              )}
            >
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-muted-foreground">{t.description}</div>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Describe what you want to build…"
            className="min-h-[80px]"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={create} disabled={creating || !goal.trim()} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {creating ? 'Creating…' : 'Create & plan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
