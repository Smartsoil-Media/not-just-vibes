import { useMemo } from 'react';
import { Cloud, Cpu, User } from 'lucide-react';
import { HintBlock } from './HintBlock';
import { useTutorStore, type TutorMessage } from '@/stores/tutor';

interface Segment {
  type: 'text' | 'code';
  text: string;
  language?: string;
}

function parseSegments(content: string): Segment[] {
  const out: Segment[] = [];
  const re = /```([\w-]*)\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    if (m.index > last) out.push({ type: 'text', text: content.slice(last, m.index) });
    out.push({ type: 'code', text: m[2] ?? '', language: m[1] ?? undefined });
    last = m.index + m[0].length;
  }
  if (last < content.length) out.push({ type: 'text', text: content.slice(last) });
  return out;
}

export function Message({ msg }: { msg: TutorMessage }) {
  const reveal = useTutorStore((s) => s.reveal);
  const segments = useMemo(() => parseSegments(msg.content), [msg.content]);

  const Icon = msg.role === 'user' ? User : msg.source === 'cloud' ? Cloud : Cpu;
  const label =
    msg.role === 'user' ? 'you' : msg.source === 'cloud' ? 'Claude' : 'Qwen (local)';

  return (
    <div className="flex gap-2 px-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
          {msg.streaming && <span className="ml-2 animate-pulse">…</span>}
        </div>
        <div className="space-y-1 text-sm leading-relaxed">
          {segments.map((seg, i) =>
            seg.type === 'text' ? (
              <p key={i} className="whitespace-pre-wrap break-words">
                {seg.text}
              </p>
            ) : (
              <HintBlock
                key={i}
                code={seg.text}
                language={seg.language}
                revealed={msg.revealed[i] ?? 0}
                onRevealNext={() => reveal(msg.id, i)}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
