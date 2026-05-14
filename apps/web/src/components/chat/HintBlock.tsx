import { useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { rememberAISnippet } from '@/stores/paste-guard';

interface Props {
  code: string;
  language?: string;
  /** how many lines have been revealed */
  revealed: number;
  onRevealNext: () => void;
}

/**
 * Anti-paste hint: lines stay blurred until the user explicitly reveals each one.
 * Revealed lines remain selectable so the user can read them, but the editor's
 * paste handler rejects pastes that match.
 */
export function HintBlock({ code, language, revealed, onRevealNext }: Props) {
  const lines = code.replace(/\n+$/, '').split('\n');

  useEffect(() => {
    // remember each newly-revealed line so the paste guard can intercept it
    for (let i = 0; i < revealed && i < lines.length; i++) {
      const line = lines[i];
      if (line && line.trim().length > 4) rememberAISnippet(line);
    }
  }, [revealed, lines]);

  return (
    <div className="my-2 overflow-hidden rounded-md border border-border bg-secondary/40 text-xs">
      <div className="flex items-center justify-between border-b border-border bg-secondary px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{language ?? 'code'} hint · type it yourself</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 text-[10px]"
          disabled={revealed >= lines.length}
          onClick={onRevealNext}
        >
          {revealed >= lines.length ? (
            <>
              <Eye className="h-3 w-3" /> all shown
            </>
          ) : (
            <>
              <EyeOff className="h-3 w-3" /> reveal next line ({revealed}/{lines.length})
            </>
          )}
        </Button>
      </div>
      <pre className="overflow-auto p-2 font-mono leading-5">
        {lines.map((line, i) => (
          <div key={i} className={i < revealed ? '' : 'select-none blur-sm'}>
            {line || ' '}
          </div>
        ))}
      </pre>
    </div>
  );
}
