import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { AISource, ChatMessage } from '@njv/shared';

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  source: AISource | null;
  content: string;
  /** ai-code blocks revealed line-by-line within this message */
  revealed: Record<number, number>;
  streaming?: boolean;
}

interface TutorState {
  messages: TutorMessage[];
  push: (m: Omit<TutorMessage, 'id' | 'revealed'> & Partial<Pick<TutorMessage, 'revealed'>>) => string;
  appendToken: (id: string, t: string) => void;
  endStream: (id: string) => void;
  reveal: (id: string, blockIndex: number) => void;
  hydrate: (rows: ChatMessage[]) => void;
  reset: () => void;
}

export const useTutorStore = create<TutorState>((set) => ({
  messages: [],
  push: (m) => {
    const id = nanoid(10);
    set((s) => ({
      messages: [
        ...s.messages,
        { id, revealed: {}, streaming: m.role === 'assistant', ...m },
      ],
    }));
    return id;
  },
  appendToken: (id, t) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, content: m.content + t } : m)),
    })),
  endStream: (id) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, streaming: false } : m)),
    })),
  reveal: (id, blockIndex) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id
          ? {
              ...m,
              revealed: { ...m.revealed, [blockIndex]: (m.revealed[blockIndex] ?? 0) + 1 },
            }
          : m,
      ),
    })),
  hydrate: (rows) =>
    set({
      messages: rows
        .filter((r) => r.role !== 'system')
        .map((r) => ({
          id: r.id,
          role: r.role as 'user' | 'assistant',
          source: r.source,
          content: r.content,
          revealed: {},
          streaming: false,
        })),
    }),
  reset: () => set({ messages: [] }),
}));
