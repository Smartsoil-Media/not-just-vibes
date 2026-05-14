import { useEffect, useRef, useState } from 'react';
import { Lightbulb, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Message } from './Message';
import { useTutorStore } from '@/stores/tutor';
import { useProjectStore } from '@/stores/project';
import { streamStuck } from '@/lib/api';
import type { StuckLevel } from '@njv/shared';

const LEVELS: { level: StuckLevel; label: string; hint: string }[] = [
  { level: 1, label: 'Nudge', hint: 'One question to refocus you.' },
  { level: 2, label: 'Question', hint: 'A Socratic question about the concept.' },
  { level: 3, label: 'Direction', hint: 'Plain-English approach. No code.' },
  { level: 4, label: 'Diagnosis', hint: 'Claude reads the file and explains.' },
];

export function ChatPanel() {
  const messages = useTutorStore((s) => s.messages);
  const push = useTutorStore((s) => s.push);
  const appendToken = useTutorStore((s) => s.appendToken);
  const endStream = useTutorStore((s) => s.endStream);
  const project = useProjectStore((s) => s.project);
  const activeFile = useProjectStore((s) => s.activeFile);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages]);

  async function askStuck(level: StuckLevel) {
    if (!project || busy) return;
    setBusy(true);
    push({ role: 'user', source: null, content: question || `(I'm stuck — L${level})` });
    const id = push({ role: 'assistant', source: level >= 4 ? 'cloud' : 'local', content: '' });
    try {
      for await (const tok of streamStuck({
        projectId: project.id,
        level,
        currentFile: activeFile,
        files: project.files,
        question: question || undefined,
      })) {
        appendToken(id, tok);
      }
    } catch (e) {
      appendToken(id, `\n\n_error: ${(e as Error).message}_`);
    } finally {
      endStream(id);
      setQuestion('');
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Tutor
        </div>
      </div>
      <div ref={scrollerRef} className="flex-1 overflow-auto">
        {messages.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Ask a question, or hit a "stuck" level below when you need a hand.
          </div>
        ) : (
          messages.map((m) => <Message key={m.id} msg={m} />)
        )}
      </div>
      <div className="border-t border-border p-2">
        <div className="mb-2 grid grid-cols-4 gap-1">
          {LEVELS.map((l) => (
            <Button
              key={l.level}
              variant={l.level === 4 ? 'default' : 'outline'}
              size="sm"
              className="h-8 flex-col items-start gap-0 px-2 py-1 text-[10px]"
              disabled={busy || !project}
              onClick={() => askStuck(l.level)}
              title={l.hint}
            >
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider">
                <Lightbulb className="h-3 w-3" /> L{l.level}
              </span>
              <span className="text-[10px] text-muted-foreground">{l.label}</span>
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask the tutor a question…"
            className="min-h-[40px] resize-none text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                askStuck(2);
              }
            }}
          />
          <Button size="icon" disabled={busy || !project} onClick={() => askStuck(2)}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
