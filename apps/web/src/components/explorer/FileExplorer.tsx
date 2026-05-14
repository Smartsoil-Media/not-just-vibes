import { useState } from 'react';
import { File, FilePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjectStore } from '@/stores/project';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export function FileExplorer() {
  const project = useProjectStore((s) => s.project);
  const activeFile = useProjectStore((s) => s.activeFile);
  const setActiveFile = useProjectStore((s) => s.setActiveFile);
  const addFile = useProjectStore((s) => s.addFile);
  const removeFile = useProjectStore((s) => s.removeFile);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState('/');

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
        Pick a template or start a new project to see files here.
      </div>
    );
  }

  const paths = Object.keys(project.files).sort();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Files
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            setDrafting(true);
            setDraft('/');
          }}
        >
          <FilePlus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <ul className="py-1">
          {paths.map((p) => (
            <li key={p}>
              <button
                onClick={() => setActiveFile(p)}
                className={cn(
                  'group flex w-full items-center justify-between gap-2 px-3 py-1 text-left text-sm hover:bg-accent',
                  p === activeFile && 'bg-accent text-accent-foreground',
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{p}</span>
                </span>
                <Trash2
                  className="hidden h-3.5 w-3.5 text-muted-foreground hover:text-destructive group-hover:block"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (paths.length <= 1) return;
                    removeFile(p);
                    void api.deleteFile(project.id, p);
                  }}
                />
              </button>
            </li>
          ))}
        </ul>
        {drafting && (
          <div className="flex items-center gap-1 px-2 py-1">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && draft.startsWith('/') && draft.length > 1) {
                  addFile(draft, '');
                  void api.updateProject(project.id, { files: { [draft]: '' } });
                  setDrafting(false);
                } else if (e.key === 'Escape') {
                  setDrafting(false);
                }
              }}
              className="h-7 text-xs"
              placeholder="/NewFile.tsx"
            />
          </div>
        )}
      </div>
    </div>
  );
}
