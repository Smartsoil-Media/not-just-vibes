import { useEffect, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { Preview } from '@/components/sandbox/Preview';

export function CenterPanel() {
  const [hint, setHint] = useState<string>('');
  const [paste, setPaste] = useState<string | null>(null);

  useEffect(() => {
    if (!paste) return;
    const t = window.setTimeout(() => setPaste(null), 3000);
    return () => window.clearTimeout(t);
  }, [paste]);

  return (
    <PanelGroup direction="vertical" className="h-full">
      <Panel defaultSize={65} minSize={30}>
        <div className="relative h-full">
          <CodeEditor
            onInlineHint={setHint}
            onPasteBlocked={() =>
              setPaste("Type it yourself — that's the whole point. (paste blocked)")
            }
          />
          {(hint || paste) && (
            <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-center">
              <div className="pointer-events-auto rounded-md border border-border bg-card/95 px-3 py-1 text-xs shadow">
                <span className="text-muted-foreground">{paste ?? hint}</span>
              </div>
            </div>
          )}
        </div>
      </Panel>
      <PanelResizeHandle className="h-1 bg-border hover:bg-primary/40" />
      <Panel defaultSize={35} minSize={20}>
        <Preview />
      </Panel>
    </PanelGroup>
  );
}
